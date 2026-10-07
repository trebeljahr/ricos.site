// A gate netlist compiler and a fast simulator for it.
//
// `compileNetlist` flattens a circuit with every module unfolded to its gate
// form, behavioural blocks included, into flat typed arrays: one opcode per
// gate with its input nets and output net, flip-flops kept as state, and 8-lane
// bus parts kept with step()'s Z/X resolution. Wires, lamps, splitters and
// module ports become aliases of the net that drives them, so they cost
// nothing at run time.
//
// `NetlistSim` runs the netlist with step()'s timing: settle, commit every
// flip-flop and latch at once, settle again. Gates are evaluated in one
// levelized pass; only feedback loops (latches built from gates) repeat.
// Every net is a 32-bit word whose bits are 32 independent copies of the
// circuit, so one pass can run up to 32 programs side by side (bit-parallel).
import { BUS_WIDTH, type BusValue } from "./bus";
import {
  type Circuit,
  type GateType,
  inputCount,
  moduleInputs,
  moduleOutputs,
  outputCount,
  wireFits,
} from "./logic";
import { listProbes } from "./probes";

// Opcodes. Gates read nets a and b; bus parts read their arguments from `args`.
const AND = 0;
const OR = 1;
const XOR = 2;
const XNOR = 3;
const NAND = 4;
const NOR = 5;
const NOT = 6;
/** !a && b, the netlist form of a PMOS switch. */
const ANDN = 7;
/** A merger: 8 bit nets into a bus. */
const MERGE = 8;
/** A bus driver: the bus at a, or Z unless the enable net b is on. */
const DRIVE = 9;
/** A bus net: resolves b drivers listed in args from a. */
const RESOLVE = 10;

const GATE_OPS: Partial<Record<GateType, number>> = {
  and: AND,
  nmos: AND,
  or: OR,
  junction: OR,
  xor: XOR,
  xnor: XNOR,
  nand: NAND,
  nor: NOR,
  not: NOT,
  pmos: ANDN,
};

/**
 * A bus occupies 10 consecutive nets: lanes 0–7, then a Z word and an X word.
 * A lane reads 0 while the bus is Z or X, which is how a splitter reads it.
 */
const BUS_NETS = BUS_WIDTH + 2;
const Z = BUS_WIDTH;
const X = BUS_WIDTH + 1;

export type NetlistStats = {
  /** Logic gates after unfolding: AND, OR, XOR, XNOR, NAND, NOR, NOT and transistor switches. */
  gates: number;
  flipFlops: number;
  latches: number;
  /** Merger, bus driver and bus parts. */
  busParts: number;
  /** Distinct signals once wires, lamps and ports are merged. */
  nets: number;
  /** Gates per type, e.g. { and: 4120, or: 3900, … }. */
  byType: Record<string, number>;
  /** Longest gate chain from a flip-flop or input to a flip-flop or output. */
  depth: number;
  /** Gates inside feedback loops, which are iterated until they settle. */
  feedbackGates: number;
};

export type Netlist = {
  netCount: number;
  /** Gate program, 4 ints per op: opcode, output net, a, b. */
  code: Int32Array;
  args: Int32Array;
  /** Op ranges [start, end) in `code` (in ints); cyclic ones repeat until stable. */
  segments: { start: number; end: number; cyclic: boolean }[];
  /** D flip-flops: data, clock and output nets. */
  dff: { d: Int32Array; clock: Int32Array; q: Int32Array };
  /** D latches: data, enable and output nets. */
  dlatch: { d: Int32Array; enable: Int32Array; q: Int32Array };
  /** SR latches: set, reset and output nets. */
  srlatch: { set: Int32Array; reset: Int32Array; q: Int32Array };
  /** Nets that hold a fixed value: [net, value]. */
  constants: Int32Array;
  /** Nets of the top-level clock nodes, driven by `step`'s clock level. */
  clocks: Int32Array;
  /** Output nets of every node by path, e.g. "ram/row3/cell5" or "control". */
  nodes: Map<string, number[]>;
  /** Bus base net of every bus part by path. */
  buses: Map<string, number>;
  /** Named probes, outermost first, as `readProbes` finds them: name → input nets. */
  probes: [name: string, nets: number[]][];
  stats: NetlistStats;
};

const ALL = -1;

/**
 * Flattens `circuit` with every module unfolded, also those that run as a
 * behavioural block while folded. Throws on parts the netlist does not model
 * (DRAM capacitors, whose leak needs a per-copy counter).
 */
export function compileNetlist(circuit: Circuit): Netlist {
  // ---------------------------------------------------------------- flatten
  // Nets are allocated freely, then merged: `alias(consumer, driver)` makes a
  // wire end, lamp or port the same net as its driver.
  const parent: number[] = [];
  const newNet = () => {
    parent.push(parent.length);
    return parent.length - 1;
  };
  const find = (start: number): number => {
    let root = start;
    while (parent[root] !== root) root = parent[root];
    for (let net = start; parent[net] !== root; ) {
      const up = parent[net];
      parent[net] = root;
      net = up;
    }
    return root;
  };
  const alias = (consumer: number, driver: number) => {
    const a = find(consumer);
    const b = find(driver);
    if (a !== b) parent[a] = b;
  };
  const newBus = () => {
    const base = newNet();
    for (let i = 1; i < BUS_NETS; i++) newNet();
    return base;
  };
  const ZERO = newNet();
  const ONE = newNet();
  // An unwired bus input floats.
  const FLOATING = newBus();
  const constants: [number, number][] = [
    [ZERO, 0],
    [ONE, ALL],
    ...Array.from({ length: BUS_NETS }, (_, i): [number, number] => [
      FLOATING + i,
      i === Z ? ALL : 0,
    ]),
  ];
  const constant = (on: boolean) => {
    const net = newNet();
    constants.push([net, on ? ALL : 0]);
    return net;
  };
  const clocks: number[] = [];
  type Op = { type: number; out: number; a: number; b: number; args?: number[] };
  const ops: Op[] = [];
  const dff: [number, number, number][] = [];
  const dlatch: [number, number, number][] = [];
  const srlatch: [number, number, number][] = [];
  const nodes = new Map<string, number[]>();
  const buses = new Map<string, number>();
  const displays = new Map<string, number[]>();

  /** Flattens one level; `ports` are the nets bound to its switch/clock/pulse inputs. */
  const flatten = (level: Circuit, path: string, ports: number[] | null): number[] => {
    const key = (id: string) => (path ? `${path}/${id}` : id);
    const index = new Map(level.nodes.map((node, i) => [node.id, i]));
    const inputPort = new Map(moduleInputs(level).map((node, i) => [node.id, i]));
    // Output nets of each node; bus parts keep their base in `busOut`.
    const out: number[][] = level.nodes.map(() => []);
    const busOut: number[] = level.nodes.map(() => -1);
    level.nodes.forEach((node, i) => {
      switch (node.type) {
        case "switch":
        case "clock":
        case "pulse": {
          let net: number;
          if (ports) net = ports[inputPort.get(node.id)!];
          else if (node.type === "clock") {
            net = newNet();
            clocks.push(net);
          }
          // A top-level switch or pulse gets its own net, so a run can set it per copy.
          else net = constant(node.type === "switch" && Boolean(node.value));
          out[i] = [net];
          break;
        }
        case "high":
          out[i] = [ONE];
          break;
        case "ground":
          out[i] = [ZERO];
          break;
        case "input4":
        case "input8":
          out[i] = Array.from({ length: node.type === "input4" ? 4 : 8 }, (_, bit) =>
            constant(Boolean(((node.numberValue ?? 0) >> bit) & 1)),
          );
          break;
        case "merger":
        case "busdriver":
        case "bus":
          busOut[i] = newBus();
          buses.set(key(node.id), busOut[i]);
          break;
        case "dramcell":
          throw new Error("The gate netlist does not model DRAM capacitors.");
        case "display4":
        case "display8":
          break;
        case "lamp":
          // A lamp has no output port, but a module's lamps are its outputs.
          out[i] = [newNet()];
          break;
        default:
          out[i] = Array.from({ length: outputCount(node) }, newNet);
      }
    });
    // Who drives each input port: the first fitting wire wins, as in step().
    const counts = level.nodes.map(inputCount);
    const source = counts.map((count) => new Array<[number, number] | undefined>(count));
    for (const wire of level.wires) {
      const from = index.get(wire.from);
      const to = index.get(wire.to);
      if (from === undefined || to === undefined) continue;
      const output = wire.output ?? 0;
      if (wire.input >= counts[to] || output >= outputCount(level.nodes[from])) continue;
      if (!wireFits(level.nodes[from], output, level.nodes[to], wire.input)) continue;
      source[to][wire.input] ??= [from, output];
    }
    const bit = (i: number, port: number) => {
      const s = source[i][port];
      return s ? (out[s[0]][s[1]] ?? ZERO) : ZERO;
    };
    const bus = (i: number, port: number) => {
      const s = source[i][port];
      return s && busOut[s[0]] !== -1 ? busOut[s[0]] : FLOATING;
    };
    level.nodes.forEach((node, i) => {
      const id = key(node.id);
      if (out[i].length) nodes.set(id, out[i]);
      const gate = GATE_OPS[node.type];
      if (gate !== undefined) {
        ops.push({ type: gate, out: out[i][0], a: bit(i, 0), b: bit(i, 1) });
        return;
      }
      switch (node.type) {
        case "lamp":
          alias(out[i][0], bit(i, 0));
          break;
        case "display4":
        case "display8":
          displays.set(
            id,
            Array.from({ length: counts[i] }, (_, port) => bit(i, port)),
          );
          break;
        case "dff":
          dff.push([bit(i, 0), bit(i, 1), out[i][0]]);
          break;
        case "dlatch":
          dlatch.push([bit(i, 0), bit(i, 1), out[i][0]]);
          break;
        case "srlatch":
          srlatch.push([bit(i, 0), bit(i, 1), out[i][0]]);
          break;
        case "splitter": {
          const from = bus(i, 0);
          out[i].forEach((net, lane) => {
            alias(net, from + lane);
          });
          break;
        }
        case "merger":
          ops.push({
            type: MERGE,
            out: busOut[i],
            a: 0,
            b: 0,
            args: Array.from({ length: BUS_WIDTH }, (_, port) => bit(i, port)),
          });
          break;
        case "busdriver":
          ops.push({ type: DRIVE, out: busOut[i], a: bus(i, 0), b: bit(i, 1) });
          break;
        case "bus":
          ops.push({
            type: RESOLVE,
            out: busOut[i],
            a: 0,
            b: 0,
            args: Array.from({ length: counts[i] }, (_, port) => bus(i, port)),
          });
          break;
        case "module": {
          if (!node.module) break;
          const inner = Array.from({ length: counts[i] }, newNet);
          inner.forEach((net, port) => {
            alias(net, bit(i, port));
          });
          const lamps = flatten(node.module, id, inner);
          out[i].forEach((net, port) => {
            alias(net, lamps[port]);
          });
          break;
        }
      }
    });
    const lamps = moduleOutputs(level).map((lamp) => out[index.get(lamp.id)!][0]);
    return lamps;
  };
  flatten(circuit, "", null);

  // ---------------------------------------------------------------- number nets
  // Representatives keep their relative order, so each bus stays 10 nets in a row.
  const number = new Int32Array(parent.length).fill(-1);
  let netCount = 0;
  for (let net = 0; net < parent.length; net++) if (find(net) === net) number[net] = netCount++;
  const n = (net: number) => number[find(net)];

  // ---------------------------------------------------------------- levelize
  // Each op drives one net (a bus part drives its 10). Ops are sorted
  // topologically with Tarjan's algorithm; a strongly connected group is a
  // feedback loop and repeats until it holds still.
  const driver = new Int32Array(netCount).fill(-1);
  const width = (op: Op) => (op.type >= MERGE ? BUS_NETS : 1);
  ops.forEach((op, i) => {
    for (let k = 0; k < width(op); k++) driver[n(op.out) + k] = i;
  });
  const reads = (op: Op): number[] => {
    if (op.type === MERGE) return op.args!.map(n);
    if (op.type === RESOLVE)
      return op.args!.flatMap((base) => Array.from({ length: BUS_NETS }, (_, k) => n(base) + k));
    if (op.type === DRIVE)
      return [...Array.from({ length: BUS_NETS }, (_, k) => n(op.a) + k), n(op.b)];
    return op.type === NOT ? [n(op.a)] : [n(op.a), n(op.b)];
  };
  const next: number[][] = ops.map(() => []);
  const selfLoop = new Uint8Array(ops.length);
  ops.forEach((op, i) => {
    const seen = new Set<number>();
    for (const net of reads(op)) {
      const from = driver[net];
      if (from === -1 || seen.has(from)) continue;
      seen.add(from);
      next[from].push(i);
      if (from === i) selfLoop[i] = 1;
    }
  });
  const order = new Int32Array(ops.length).fill(-1);
  const low = new Int32Array(ops.length);
  const onStack = new Uint8Array(ops.length);
  const stack: number[] = [];
  const groups: number[][] = [];
  let counter = 0;
  for (let root = 0; root < ops.length; root++) {
    if (order[root] !== -1) continue;
    const work: [number, number][] = [[root, 0]];
    order[root] = low[root] = counter++;
    stack.push(root);
    onStack[root] = 1;
    while (work.length) {
      const frame = work[work.length - 1];
      const [op, edge] = frame;
      if (edge < next[op].length) {
        frame[1]++;
        const target = next[op][edge];
        if (order[target] === -1) {
          order[target] = low[target] = counter++;
          stack.push(target);
          onStack[target] = 1;
          work.push([target, 0]);
        } else if (onStack[target]) low[op] = Math.min(low[op], order[target]);
        continue;
      }
      work.pop();
      if (work.length) {
        const up = work[work.length - 1][0];
        low[up] = Math.min(low[up], low[op]);
      }
      if (low[op] !== order[op]) continue;
      const group: number[] = [];
      let member: number;
      do {
        member = stack.pop()!;
        onStack[member] = 0;
        group.push(member);
      } while (member !== op);
      groups.push(group.sort((a, b) => a - b));
    }
  }
  groups.reverse();

  // ---------------------------------------------------------------- emit
  const code: number[] = [];
  const args: number[] = [];
  const segments: Netlist["segments"] = [];
  const level = new Int32Array(ops.length);
  let depth = 0;
  let feedbackGates = 0;
  for (const group of groups) {
    const cyclic = group.length > 1 || selfLoop[group[0]] === 1;
    const start = code.length;
    for (const i of group) {
      const op = ops[i];
      let a = n(op.a);
      const b = op.type === RESOLVE ? op.args!.length : n(op.b);
      if (op.args) {
        a = args.length;
        args.push(...op.args.map(n));
      }
      code.push(op.type, n(op.out), a, b);
      if (cyclic && op.type < MERGE) feedbackGates++;
      let deepest = 0;
      for (const net of reads(op)) {
        const from = driver[net];
        if (from !== -1 && from !== i && level[from] > deepest) deepest = level[from];
      }
      level[i] = deepest + (op.type < MERGE ? 1 : 0);
      if (level[i] > depth) depth = level[i];
    }
    const last = segments[segments.length - 1];
    if (!cyclic && last && !last.cyclic && last.end === start) last.end = code.length;
    else segments.push({ start, end: code.length, cyclic });
  }

  const byType: Record<string, number> = {};
  const opName = ["and", "or", "xor", "xnor", "nand", "nor", "not", "andn"];
  let gates = 0;
  for (const op of ops)
    if (op.type < MERGE) {
      gates++;
      byType[opName[op.type]] = (byType[opName[op.type]] ?? 0) + 1;
    }
  const triples = (list: [number, number, number][], k: number) =>
    Int32Array.from(list, (entry) => n(entry[k]));
  const probes: Netlist["probes"] = [];
  for (const probe of listProbes(circuit)) {
    if (probes.some(([name]) => name === probe.name)) continue;
    const nets = displays.get(probe.path.join("/"));
    if (nets) probes.push([probe.name, nets.slice(0, probe.bits).map(n)]);
  }
  return {
    netCount,
    code: Int32Array.from(code),
    args: Int32Array.from(args),
    segments,
    dff: { d: triples(dff, 0), clock: triples(dff, 1), q: triples(dff, 2) },
    dlatch: { d: triples(dlatch, 0), enable: triples(dlatch, 1), q: triples(dlatch, 2) },
    srlatch: { set: triples(srlatch, 0), reset: triples(srlatch, 1), q: triples(srlatch, 2) },
    constants: Int32Array.from(constants.flatMap(([net, value]) => [n(net), value])),
    clocks: Int32Array.from(clocks, n),
    nodes: new Map([...nodes].map(([id, nets]) => [id, nets.map(n)])),
    buses: new Map([...buses].map(([id, base]) => [id, n(base)])),
    probes,
    stats: {
      gates,
      flipFlops: dff.length,
      latches: dlatch.length + srlatch.length,
      busParts: ops.length - gates,
      nets: netCount,
      byType,
      depth,
      feedbackGates,
    },
  };
}

/** Statements per generated function; measured fastest around 100–250. */
const CHUNK = 200;
const EXPRESSIONS = [
  "v[A]&v[B]",
  "v[A]|v[B]",
  "v[A]^v[B]",
  "~(v[A]^v[B])",
  "~(v[A]&v[B])",
  "~(v[A]|v[B])",
  "~v[A]",
  "~v[A]&v[B]",
];

/**
 * Generates an acyclic settle pass as straight-line JavaScript, one statement
 * per gate, so the engine compiles it to machine code instead of dispatching
 * on opcodes. Bus parts call back into the interpreter. Returns undefined
 * where code generation is not allowed (a Content Security Policy without
 * 'unsafe-eval').
 */
function generateSettle(netlist: Netlist) {
  const { code } = netlist;
  const lines: string[] = [];
  for (let p = 0; p < code.length; p += 4) {
    const type = code[p];
    if (type >= MERGE) lines.push(`run(${p},${p + 4});`);
    else
      lines.push(
        `v[${code[p + 1]}]=${EXPRESSIONS[type].replace("A", String(code[p + 2])).replace("B", String(code[p + 3]))};`,
      );
  }
  type Chunk = (values: Int32Array, run: (start: number, end: number) => void) => void;
  try {
    // Small functions: an engine leaves very large ones to its slow tier.
    const chunks: Chunk[] = [];
    for (let i = 0; i < lines.length; i += CHUNK)
      chunks.push(new Function("v", "run", lines.slice(i, i + CHUNK).join("\n")) as Chunk);
    return (values: Int32Array, run: (start: number, end: number) => void) => {
      for (let i = 0; i < chunks.length; i++) chunks[i](values, run);
    };
  } catch {
    return undefined;
  }
}

/**
 * Runs a netlist. Each net is an Int32 word holding `copies` independent
 * copies of the circuit, one per bit; copy 0 is the one a single run reads.
 */
export class NetlistSim {
  readonly values: Int32Array;
  /** Stored bit of each flip-flop, then each D latch, then each SR latch. */
  private readonly stored: Int32Array;
  private readonly lastClock: Int32Array;
  private readonly ones = new Int32Array(BUS_WIDTH);
  private readonly zeros = new Int32Array(BUS_WIDTH);
  /** Copies whose feedback loop or SR latch did not settle on the last step. */
  unstable = 0;

  /** The settle pass as generated JavaScript, when the runtime allows `new Function`. */
  private readonly compiled?: (
    values: Int32Array,
    run: (start: number, end: number) => void,
  ) => void;
  private readonly runOps = (start: number, end: number) => {
    this.run(start, end);
  };

  constructor(
    readonly netlist: Netlist,
    { generate = true }: { generate?: boolean } = {},
  ) {
    if (generate && netlist.segments.every((segment) => !segment.cyclic))
      this.compiled = generateSettle(netlist);
    this.values = new Int32Array(netlist.netCount);
    this.stored = new Int32Array(
      netlist.dff.q.length + netlist.dlatch.q.length + netlist.srlatch.q.length,
    );
    this.lastClock = new Int32Array(netlist.dff.q.length);
    this.reset();
  }

  /** Every flip-flop and latch back to 0, then one settle with the clock low. */
  reset() {
    this.values.fill(0);
    this.stored.fill(0);
    this.lastClock.fill(0);
    const { constants } = this.netlist;
    for (let i = 0; i < constants.length; i += 2) this.values[constants[i]] = constants[i + 1];
    this.unstable = 0;
  }

  /** Sets a fixed net (a ROM bit, a switch) per copy; `word` bit c is copy c. */
  setConstant(net: number, word: number) {
    this.values[net] = word;
  }

  /** One step(): settle, commit flip-flops and latches together, settle again. */
  step(clockHigh: boolean) {
    const { values, stored, lastClock, netlist } = this;
    const { clocks, dff, dlatch, srlatch } = netlist;
    for (let i = 0; i < clocks.length; i++) values[clocks[i]] = clockHigh ? ALL : 0;
    this.unstable = 0;
    this.settle();
    const ffs = dff.q.length;
    for (let i = 0; i < ffs; i++) {
      const clock = values[dff.clock[i]];
      const rise = clock & ~lastClock[i];
      stored[i] = (values[dff.d[i]] & rise) | (stored[i] & ~rise);
      lastClock[i] = clock;
    }
    let offset = ffs;
    for (let i = 0; i < srlatch.q.length; i++) {
      const set = values[srlatch.set[i]];
      const reset = values[srlatch.reset[i]];
      const k = ffs + dlatch.q.length + i;
      this.unstable |= set & reset;
      stored[k] = (set & ~reset) | (stored[k] & ~(set ^ reset));
    }
    for (let i = 0; i < dlatch.q.length; i++) {
      const enable = values[dlatch.enable[i]];
      stored[offset + i] = (values[dlatch.d[i]] & enable) | (stored[offset + i] & ~enable);
    }
    for (let i = 0; i < ffs; i++) values[dff.q[i]] = stored[i];
    for (let i = 0; i < dlatch.q.length; i++) values[dlatch.q[i]] = stored[offset + i];
    offset += dlatch.q.length;
    for (let i = 0; i < srlatch.q.length; i++) values[srlatch.q[i]] = stored[offset + i];
    this.settle();
  }

  /** One clock cycle, high then low: one CPU tick. */
  tick() {
    this.step(true);
    this.step(false);
  }

  private settle() {
    if (this.compiled) {
      this.compiled(this.values, this.runOps);
      return;
    }
    for (const segment of this.netlist.segments) {
      if (!segment.cyclic) {
        this.run(segment.start, segment.end);
        continue;
      }
      const limit = (2 * (segment.end - segment.start)) / 4 + 2;
      for (let pass = 0; pass <= limit; pass++) {
        const changed = this.run(segment.start, segment.end);
        if (!changed) break;
        if (pass === limit) this.unstable |= changed;
      }
    }
  }

  /** Evaluates ops [start, end); returns the copies whose outputs changed. */
  private run(start: number, end: number): number {
    const { values } = this;
    const { code, args } = this.netlist;
    let changed = 0;
    for (let p = start; p < end; p += 4) {
      const out = code[p + 1];
      const a = code[p + 2];
      const b = code[p + 3];
      let v: number;
      switch (code[p]) {
        case AND:
          v = values[a] & values[b];
          break;
        case OR:
          v = values[a] | values[b];
          break;
        case XOR:
          v = values[a] ^ values[b];
          break;
        case XNOR:
          v = ~(values[a] ^ values[b]);
          break;
        case NAND:
          v = ~(values[a] & values[b]);
          break;
        case NOR:
          v = ~(values[a] | values[b]);
          break;
        case NOT:
          v = ~values[a];
          break;
        case ANDN:
          v = ~values[a] & values[b];
          break;
        case MERGE: {
          for (let lane = 0; lane < BUS_WIDTH; lane++) {
            const next = values[args[a + lane]];
            changed |= next ^ values[out + lane];
            values[out + lane] = next;
          }
          values[out + Z] = 0;
          values[out + X] = 0;
          continue;
        }
        case DRIVE: {
          const enable = values[b];
          const z = ~enable | values[a + Z];
          const x = enable & values[a + X];
          for (let lane = 0; lane < BUS_WIDTH; lane++) {
            const next = values[a + lane] & enable;
            changed |= next ^ values[out + lane];
            values[out + lane] = next;
          }
          changed |= (z ^ values[out + Z]) | (x ^ values[out + X]);
          values[out + Z] = z;
          values[out + X] = x;
          continue;
        }
        case RESOLVE: {
          // Per copy: X if a driver is X or two driven values differ in a lane;
          // Z if every driver is Z; else the driven value.
          let z = ALL;
          let x = 0;
          let conflict = 0;
          const ones = this.ones;
          const zeros = this.zeros;
          ones.fill(0);
          zeros.fill(0);
          for (let k = 0; k < b; k++) {
            const base = args[a + k];
            const dz = values[base + Z];
            const dx = values[base + X];
            const active = ~dz & ~dx;
            z &= dz;
            x |= dx;
            for (let lane = 0; lane < BUS_WIDTH; lane++) {
              const bit = values[base + lane];
              ones[lane] |= active & bit;
              zeros[lane] |= active & ~bit;
            }
          }
          for (let lane = 0; lane < BUS_WIDTH; lane++) conflict |= ones[lane] & zeros[lane];
          x |= conflict;
          z &= ~x;
          for (let lane = 0; lane < BUS_WIDTH; lane++) {
            const next = ones[lane] & ~x & ~z;
            changed |= next ^ values[out + lane];
            values[out + lane] = next;
          }
          changed |= (z ^ values[out + Z]) | (x ^ values[out + X]);
          values[out + Z] = z;
          values[out + X] = x;
          continue;
        }
        default:
          continue;
      }
      changed |= v ^ values[out];
      values[out] = v;
    }
    return changed;
  }

  bit(net: number, copy = 0) {
    return Boolean((this.values[net] >>> copy) & 1);
  }

  /** Reads nets as a number, bit 0 first. */
  number(nets: readonly number[], copy = 0) {
    let value = 0;
    for (let i = 0; i < nets.length; i++) if ((this.values[nets[i]] >>> copy) & 1) value += 2 ** i;
    return value;
  }

  /** Reads the bus whose base net is `base`, as step() reports it. */
  bus(base: number, copy = 0): BusValue {
    if ((this.values[base + X] >>> copy) & 1) return "X";
    if ((this.values[base + Z] >>> copy) & 1) return "Z";
    return this.number(
      Array.from({ length: BUS_WIDTH }, (_, lane) => base + lane),
      copy,
    );
  }

  /** Every named probe as a number, like `readProbes`. */
  probes(copy = 0): Record<string, number> {
    return Object.fromEntries(
      this.netlist.probes.map(([name, nets]) => [name, this.number(nets, copy)]),
    );
  }
}
