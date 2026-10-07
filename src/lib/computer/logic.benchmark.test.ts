import { describe, expect, it } from "vitest";
import { legacyStep } from "./benchmark/legacyStep";
import {
  blockAdder,
  evaluatedNodes,
  flatAdder,
  moduleChain,
  norLatches,
  registerBlocks,
  type Synthetic,
} from "./benchmark/syntheticCircuits";
import {
  BUS_TYPES,
  type Circuit,
  type GateType,
  initialSnapshot,
  MAX_CIRCUIT_NODES,
  MAX_TOTAL_NODES,
  type Node,
  PRESETS,
  type Snapshot,
  step,
  validateCircuit,
  type Wire,
} from "./logic";

type Engine = typeof step;
// `BENCH=1 npx vitest run src/lib/computer/logic.benchmark.test.ts` prints the
// full ms/tick table and checks the caps; a normal test run uses small sizes.
const FULL = Boolean(process.env.BENCH);

function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/** Switch settings per tick, every switch flipping at random so no module stays idle. */
function inputsPerTick(switches: string[], ticks: number, seed: number) {
  const next = random(seed);
  const overrides: Record<string, boolean> = {};
  return Array.from({ length: ticks }, () => {
    for (const id of switches) if (next() < 0.5) overrides[id] = !overrides[id];
    return { ...overrides };
  });
}

function run(engine: Engine, { circuit, switches }: Synthetic, ticks: number, seed = 1) {
  let snapshot = initialSnapshot();
  return inputsPerTick(switches, ticks, seed).map(
    (overrides, tick) => (snapshot = engine(circuit, snapshot, tick % 2 === 1, {}, overrides)),
  );
}

function msPerTick(engine: Engine, { circuit, switches }: Synthetic, ticks: number) {
  const inputs = inputsPerTick(switches, ticks + 4, 1);
  let snapshot = initialSnapshot();
  for (let tick = 0; tick < 4; tick++)
    snapshot = engine(circuit, snapshot, tick % 2 === 1, {}, inputs[tick]);
  const start = performance.now();
  for (let tick = 4; tick < ticks + 4; tick++)
    snapshot = engine(circuit, snapshot, tick % 2 === 1, {}, inputs[tick]);
  return (performance.now() - start) / ticks;
}

function comparable(snapshot: Snapshot) {
  return {
    values: snapshot.values,
    memory: snapshot.memory,
    outputs: snapshot.outputs,
    unstable: snapshot.unstable,
  };
}

/** Top-level node values, the part of a snapshot that inlining keeps. */
function topLevel(snapshot: Snapshot) {
  return {
    lamps: Object.fromEntries(
      Object.entries(snapshot.values).filter(([id]) => id.startsWith("lamp")),
    ),
    unstable: snapshot.unstable,
  };
}

/**
 * The same circuit with each gate module replaced by its gates: an input port
 * becomes a junction fed twice by the port's source, and a wire from an output
 * port comes from whatever drives that output's lamp.
 */
function inlineModules(circuit: Circuit, prefix = ""): Circuit {
  const nodes: Node[] = [];
  const wires: Wire[] = [];
  const outputSource = new Map<string, [string, number | undefined]>();
  const inputNode = new Map<string, string>();
  for (const node of circuit.nodes) {
    if (node.type !== "module" || !node.module) {
      nodes.push({ ...node, id: prefix + node.id });
      continue;
    }
    const inner = inlineModules(node.module, `${prefix}${node.id}/`);
    const ins = node.module.nodes.filter((n) => ["switch", "clock", "pulse"].includes(n.type));
    const outs = node.module.nodes.filter((n) => n.type === "lamp");
    const ids = new Set(ins.map((n) => `${prefix}${node.id}/${n.id}`));
    for (const n of inner.nodes)
      nodes.push(ids.has(n.id) ? { id: n.id, type: "junction", x: 0, y: 0 } : n);
    wires.push(...inner.wires);
    ins.forEach((n, i) => inputNode.set(`${node.id}:${i}`, `${prefix}${node.id}/${n.id}`));
    outs.forEach((lamp, i) => {
      const feed = inner.wires.find((w) => w.to === `${prefix}${node.id}/${lamp.id}`);
      if (feed) outputSource.set(`${node.id}:${i}`, [feed.from, feed.output]);
    });
  }
  for (const wire of circuit.wires) {
    const source = outputSource.get(`${wire.from}:${wire.output ?? 0}`);
    const [from, output] = source ?? [prefix + wire.from, wire.output];
    const port = inputNode.get(`${wire.to}:${wire.input}`);
    const base = { from, ...(output === undefined ? {} : { output }) };
    if (port)
      wires.push(
        { ...base, id: `${prefix}${wire.id}#a`, to: port, input: 0 },
        { ...base, id: `${prefix}${wire.id}#b`, to: port, input: 1 },
      );
    else wires.push({ ...base, id: prefix + wire.id, to: prefix + wire.to, input: wire.input });
  }
  return { name: circuit.name, nodes, wires };
}

/** A random circuit with gates, feedback wires, flip-flops and folded modules. */
function randomCircuit(seed: number, size: number, feedback: boolean): Synthetic {
  const next = random(seed);
  const pick = <T>(items: readonly T[]) => items[Math.floor(next() * items.length)];
  const nodes: Node[] = [{ id: "clk", type: "clock", x: 0, y: 0 }];
  const wires: Wire[] = [];
  const switches: string[] = [];
  const gates: GateType[] = [
    "not",
    "and",
    "or",
    "xor",
    "xnor",
    "nand",
    "nor",
    "nmos",
    "pmos",
    "junction",
  ];
  const drivers: [string, number][] = [["clk", 0]];
  for (let i = 0; i < 6; i++) {
    switches.push(`s${i}`);
    nodes.push({ id: `s${i}`, type: "switch", x: 0, y: 0 });
    drivers.push([`s${i}`, 0]);
  }
  for (let i = 0; i < size; i++) {
    const roll = next();
    const id = `n${i}`;
    let ports = 2;
    let outs = 1;
    if (roll < 0.08) {
      nodes.push({ id, type: "dff", x: 0, y: 0 });
    } else if (roll < 0.14) {
      const module = pick([
        PRESETS["Half adder"],
        PRESETS["D flip-flop"],
        PRESETS["Full adder"],
        PRESETS["T flip-flop"],
      ]);
      nodes.push({ id, type: "module", x: 0, y: 0, module });
      ports = module.nodes.filter((n) => ["switch", "clock", "pulse"].includes(n.type)).length;
      outs = module.nodes.filter((n) => n.type === "lamp").length;
    } else {
      const type = pick(gates);
      nodes.push({ id, type, x: 0, y: 0 });
      ports = type === "not" ? 1 : 2;
    }
    for (let port = 0; port < ports; port++) {
      const [from, output] = pick(drivers);
      wires.push({ id: `${id}-${port}`, from, to: id, input: port, output });
    }
    for (let out = 0; out < outs; out++) drivers.push([id, out]);
  }
  if (feedback)
    for (let i = 0; i < size / 6; i++) {
      // Rewire a random gate input to a later node, closing a loop.
      const target = wires[Math.floor(next() * wires.length)];
      const [from, output] = pick(drivers);
      target.from = from;
      target.output = output;
    }
  for (let i = 0; i < 8; i++) {
    const [from, output] = pick(drivers);
    nodes.push({ id: `lamp${i}`, type: "lamp", x: 0, y: 0 });
    wires.push({ id: `lamp${i}`, from, to: `lamp${i}`, input: 0, output });
  }
  return { circuit: { name: `random ${seed}`, nodes, wires }, switches };
}

describe("engine equivalence with the previous step()", () => {
  it("matches on every bundled example", () => {
    for (const [name, circuit] of Object.entries(PRESETS)) {
      // The previous engine predates bus parts.
      if (circuit.nodes.some((node) => BUS_TYPES.has(node.type))) continue;
      const switches = circuit.nodes
        .filter((node) => node.type === "switch")
        .map((node) => node.id);
      const before = run(legacyStep, { circuit, switches }, 24).map(comparable);
      const after = run(step, { circuit, switches }, 24).map(comparable);
      expect(after, name).toEqual(before);
    }
  });
  it("matches on synthetic adders, latches and module chains", () => {
    for (const synthetic of [
      flatAdder(16),
      norLatches(12),
      moduleChain("8-bit full adder", 3),
      moduleChain("8-bit binary counter", 3),
      moduleChain("D flip-flop", 6),
    ]) {
      const before = run(legacyStep, synthetic, 30).map(comparable);
      const after = run(step, synthetic, 30).map(comparable);
      expect(after, synthetic.circuit.name).toEqual(before);
    }
  });
  // The previous engine let a gate module's flip-flops commit a second time
  // within one tick, when an input changed after the parent's commit. A flat
  // flip-flop never did, so the oracle for random circuits with modules is the
  // same circuit with every module's gates inlined into its parent.
  it("matches on random acyclic circuits with memory and modules", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const synthetic = randomCircuit(seed, 60, false);
      const flat = { ...synthetic, circuit: inlineModules(synthetic.circuit) };
      expect(run(step, flat, 20, seed).map(comparable), "flat circuits agree").toEqual(
        run(legacyStep, flat, 20, seed).map(comparable),
      );
      expect(run(step, synthetic, 20, seed).map(topLevel), `seed ${seed}`).toEqual(
        run(step, flat, 20, seed).map(topLevel),
      );
    }
  });
  it("settles random feedback circuits to the same stable values", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const synthetic = randomCircuit(seed, 40, true);
      const before = run(
        step,
        { ...synthetic, circuit: inlineModules(synthetic.circuit) },
        20,
        seed,
      );
      const after = run(step, synthetic, 20, seed);
      // Loops that oscillate may stop on a different phase; stable ticks must agree.
      after.forEach((snapshot, tick) => {
        if (before[tick].unstable) return;
        if (before.slice(0, tick).some((state) => state.unstable)) return;
        expect(topLevel(snapshot), `seed ${seed} tick ${tick}`).toEqual(topLevel(before[tick]));
      });
    }
  });
  it("runs a clocked gate module in a feedback loop as its inlined gates", () => {
    // A T flip-flop module whose output feeds its own T input through a NOT.
    const tff = PRESETS["T flip-flop"];
    const ports = tff.nodes.filter((n) => ["switch", "clock", "pulse"].includes(n.type));
    const synthetic: Synthetic = {
      circuit: {
        name: "module feedback",
        nodes: [
          { id: "clk", type: "clock", x: 0, y: 0 },
          { id: "m", type: "module", x: 0, y: 0, module: tff },
          { id: "inv", type: "not", x: 0, y: 0 },
          { id: "lamp", type: "lamp", x: 0, y: 0 },
        ],
        wires: [
          ...ports.map((port, i) => ({
            id: `in${i}`,
            from: port.type === "clock" ? "clk" : "inv",
            to: "m",
            input: i,
          })),
          { id: "fb", from: "m", output: 0, to: "inv", input: 0 },
          { id: "out", from: "m", output: 0, to: "lamp", input: 0 },
        ],
      },
      switches: [],
    };
    const nested = run(step, synthetic, 24);
    const flat = run(step, { ...synthetic, circuit: inlineModules(synthetic.circuit) }, 24);
    expect(nested.map(topLevel)).toEqual(flat.map(topLevel));
    expect(nested.some((state) => state.unstable)).toBe(false);
  });
});

describe("folded modules and behavioural blocks", () => {
  it("does not simulate a folded module again while its inputs hold", () => {
    const { circuit } = moduleChain("8-bit binary counter", 2);
    let state = step(circuit, initialSnapshot(), false);
    state = step(circuit, state, false);
    const idle = step(circuit, state, false);
    expect(idle.modules.m0).toBe(state.modules.m0);
    const ticked = step(circuit, idle, true);
    expect(ticked.modules.m0).not.toBe(idle.modules.m0);
    expect(ticked.values["m0-out0"]).toBe(true);
  });
  it("adds with behavioural full-adder blocks as the gate adder does", () => {
    const blocks = blockAdder(8);
    const gates = flatAdder(8);
    const next = random(7);
    for (let trial = 0; trial < 50; trial++) {
      const overrides = Object.fromEntries(gates.switches.map((id) => [id, next() < 0.5]));
      const a = step(blocks.circuit, initialSnapshot(), false, {}, overrides);
      const b = step(gates.circuit, initialSnapshot(), false, {}, overrides);
      for (const lamp of ["cout", ...Array.from({ length: 8 }, (_, i) => `s${i}`)])
        expect(a.values[lamp], lamp).toBe(b.values[lamp]);
    }
  });
  it("commits block state on the clock and keeps it while idle", () => {
    const { circuit } = registerBlocks(1);
    const data = { load: true, r0d0: true, r0d2: true };
    let state = step(circuit, initialSnapshot(), false, {}, data);
    expect(state.values.r0q0).toBe(false);
    state = step(circuit, state, true, {}, data);
    expect([0, 1, 2].map((bit) => state.values[`r0q${bit}`])).toEqual([true, false, true]);
    state = step(circuit, state, false, {}, { load: false });
    state = step(circuit, state, true, {}, { load: false });
    expect(state.values.r0q2).toBe(true);
    expect(state.blocks?.r0).toEqual({ q: 5, clock: true });
  });
  it("counts a behavioural block as one node in the import budget", () => {
    const { circuit } = registerBlocks(4);
    const validated = validateCircuit(JSON.parse(JSON.stringify(circuit)));
    expect(validated?.nodes.find((node) => node.id === "r0")?.behaviour).toBe(
      "benchmark register8",
    );
    const unknown = {
      ...circuit,
      nodes: circuit.nodes.map((n) => (n.behaviour ? { ...n, behaviour: "nope" } : n)),
    };
    expect(
      validateCircuit(unknown)?.nodes.find((node) => node.id === "r0")?.behaviour,
    ).toBeUndefined();
  });
});

// Sizes in evaluated nodes (every nesting level, a behavioural block as 1).
const SIZES = FULL ? [300, 1000, 3000, 6000, 9900, 20000] : [300, 1000];
const KINDS: [string, (nodes: number) => Synthetic][] = [
  ["flat gate adder", (n) => flatAdder(Math.round(n / 8))],
  ["NOR latches", (n) => norLatches(Math.round(n / 7))],
  [
    "8-bit full adder modules",
    (n) =>
      moduleChain(
        "8-bit full adder",
        Math.max(1, Math.round(n / evaluatedNodes(moduleChain("8-bit full adder", 1).circuit))),
      ),
  ],
  [
    "8-bit counter modules",
    (n) =>
      moduleChain(
        "8-bit binary counter",
        Math.max(1, Math.round(n / evaluatedNodes(moduleChain("8-bit binary counter", 1).circuit))),
      ),
  ],
  ["register blocks", (n) => registerBlocks(Math.round(n / 18))],
];

describe("engine benchmark", () => {
  it("records ms per tick before and after", { timeout: 600_000 }, () => {
    const rows: string[] = [];
    for (const [kind, build] of KINDS)
      for (const size of SIZES) {
        const synthetic = build(size);
        const nodes = evaluatedNodes(synthetic.circuit);
        const ticks = Math.max(4, Math.min(60, Math.round(60000 / nodes)));
        const after = msPerTick(step, synthetic, ticks);
        // Legacy step cannot run behavioural blocks, and gets very slow at size.
        const before =
          kind === "register blocks" || nodes > 6500
            ? NaN
            : msPerTick(legacyStep, synthetic, Math.max(2, ticks >> 2));
        rows.push(
          `${kind.padEnd(26)} ${String(nodes).padStart(6)} nodes  before ${before.toFixed(2).padStart(9)} ms  after ${after.toFixed(2).padStart(7)} ms  ×${(before / after).toFixed(1)}`,
        );
        if (FULL && nodes <= MAX_TOTAL_NODES) expect(after, `${kind} ${nodes}`).toBeLessThan(16);
      }
    console.log(`\n${rows.join("\n")}`);
    expect(rows.length).toBe(KINDS.length * SIZES.length);
  });
  it("accepts a circuit at the caps and steps it at an interactive rate", () => {
    const synthetic = flatAdder(Math.floor((MAX_CIRCUIT_NODES - 2) / 8));
    expect(synthetic.circuit.nodes.length).toBeLessThanOrEqual(MAX_CIRCUIT_NODES);
    expect(validateCircuit(synthetic.circuit)).not.toBeNull();
    if (FULL) expect(msPerTick(step, synthetic, 20)).toBeLessThan(16);
  });
  it("rejects circuits whose evaluated nodes exceed the total cap", () => {
    const perModule = evaluatedNodes(moduleChain("8-bit full adder", 1).circuit);
    const fits = moduleChain("8-bit full adder", Math.floor(MAX_TOTAL_NODES / perModule));
    expect(validateCircuit(fits.circuit)).not.toBeNull();
    const over = moduleChain("8-bit full adder", Math.ceil(MAX_TOTAL_NODES / perModule) + 1);
    expect(validateCircuit(over.circuit)).toBeNull();
    // The gate forms behind behavioural blocks are parsed but not charged.
    const blocks = registerBlocks(4).circuit;
    expect(
      validateCircuit(blocks, 0, { remaining: blocks.nodes.length, parsed: 1000 }),
    ).not.toBeNull();
    expect(
      validateCircuit(blocks, 0, { remaining: blocks.nodes.length, parsed: blocks.nodes.length }),
    ).toBeNull();
  });
});
