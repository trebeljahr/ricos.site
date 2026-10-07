// Datapath blocks for the toy CPU: register8, counter8, alu8, rom256, ram16 and
// stack16. Each is a module node whose gate form is the inner circuit and whose
// folded form runs as a registered behavioural block (see `registerBlock`).
//
// Outputs always come from the state before the clock commit, as a D flip-flop's
// do, so the folded block and its gates agree after every step. RAM and stack
// rows are nested register8 blocks; ROM is 16 page blocks of readable byte rows.
import {
  type Circuit,
  type GateType,
  initialSnapshot,
  type Node,
  registerBlock,
  type Snapshot,
  type Wire,
} from "./logic";

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
export const toBits = (value: number, width: number) =>
  range(width).map((bit) => Boolean((value >> bit) & 1));
export const toNumber = (bits: readonly boolean[]) =>
  bits.reduce((n, bit, i) => n | (Number(bit) << i), 0);
const hex = (value: number) => value.toString(16).toUpperCase().padStart(2, "0");

/** A signal source: a node id, plus the output port for multi-output nodes. */
type Ref = string | [string, number];

class Builder {
  readonly nodes: Node[] = [];
  readonly wires: Wire[] = [];
  add(id: string, type: GateType, x: number, y: number, label?: string, extra: Partial<Node> = {}) {
    this.nodes.push({ id, type, x, y, ...(label ? { label } : {}), ...extra });
    return id;
  }
  connect(from: Ref, to: string, input = 0) {
    const [id, output] = typeof from === "string" ? [from, undefined] : from;
    this.wires.push({
      id: `${id}:${output ?? 0}-${to}:${input}`,
      from: id,
      to,
      input,
      ...(output === undefined ? {} : { output }),
    });
  }
  gate(id: string, type: GateType, x: number, y: number, a: Ref, b?: Ref, label?: string) {
    this.add(id, type, x, y, label);
    this.connect(a, id);
    if (b !== undefined) this.connect(b, id, 1);
    return id;
  }
  /** ORs the sources pairwise down to one signal. */
  orTree(prefix: string, sources: Ref[], x: number, y: number, label?: string): Ref {
    let level = sources;
    for (let depth = 0; level.length > 1; depth++) {
      const next: Ref[] = [];
      for (let i = 0; i < level.length; i += 2)
        next.push(
          i + 1 < level.length
            ? this.gate(
                `${prefix}-or${depth}-${i / 2}`,
                "or",
                x + depth * 140,
                y + i * 30,
                level[i],
                level[i + 1],
                level.length === 2 ? label : undefined,
              )
            : level[i],
        );
      level = next;
    }
    return level[0];
  }
  /** One-hot select lines for a 4-bit address, optionally gated by an enable. */
  decoder(prefix: string, address: Ref[], x: number, y: number, enable?: Ref, label = "ROW") {
    const inverted = address.map((bit, b) =>
      this.gate(`${prefix}-not${b}`, "not", x, y + b * 80, bit, undefined, `NOT A${b}`),
    );
    const pick = (b: number, one: boolean) => (one ? address[b] : inverted[b]);
    const pair = (lo: number, combo: number) =>
      this.gate(
        `${prefix}-p${lo}-${combo}`,
        "and",
        x + 150,
        y + (lo * 2 + combo / 4) * 160,
        pick(lo, Boolean(combo & 1)),
        pick(lo + 1, Boolean(combo & 2)),
      );
    const low = range(4).map((combo) => pair(0, combo));
    const high = range(4).map((combo) => pair(2, combo));
    return range(16).map((row) => {
      const sel = this.gate(
        `${prefix}-sel${row}`,
        "and",
        x + 300,
        y + row * 90,
        low[row & 3],
        high[row >> 2],
        enable === undefined ? `${label} ${row}` : undefined,
      );
      return enable === undefined
        ? sel
        : this.gate(
            `${prefix}-en${row}`,
            "and",
            x + 440,
            y + row * 90,
            sel,
            enable,
            `${label} ${row}`,
          );
    });
  }
  circuit(name: string): Circuit {
    return { name, nodes: this.nodes, wires: this.wires };
  }
}

/** Adds input nodes for a block's ports, in port order. */
function ports(b: Builder, specs: [id: string, label: string][], clock = "clock") {
  specs.forEach(([id, label], i) =>
    b.add(id, id === clock ? "clock" : "switch", 30, 30 + i * 90, label),
  );
}
const busPorts = (prefix: string, label: string, width = 8): [string, string][] =>
  range(width).map((bit) => [`${prefix}${bit}`, `${label}${bit}`]);

// ---------------------------------------------------------------- register8

function register8Circuit(): Circuit {
  const b = new Builder();
  ports(b, [...busPorts("d", "D"), ["load", "LOAD"], ["clock", "CLK"]]);
  b.gate("hold", "not", 200, 750, "load", undefined, "HOLD");
  for (let bit = 0; bit < 8; bit++) {
    const y = 30 + bit * 140;
    const keep = b.gate(`keep${bit}`, "and", 360, y + 60, `cell${bit}`, "hold");
    const write = b.gate(`write${bit}`, "and", 360, y, `d${bit}`, "load");
    b.gate(`next${bit}`, "or", 500, y, keep, write);
    b.add(`cell${bit}`, "dff", 650, y, `BIT ${bit}`);
    b.connect(`next${bit}`, `cell${bit}`);
    b.connect("clock", `cell${bit}`, 1);
    b.gate(`q${bit}`, "lamp", 820, y, `cell${bit}`, undefined, `Q${bit}`);
  }
  return b.circuit("8-bit register");
}

type ClockedByte = { q: number; clock: boolean };
registerBlock<ClockedByte>({
  name: "register8",
  inputs: [...busPorts("d", "D").map(([, l]) => l), "LOAD", "CLK"],
  outputs: range(8).map((bit) => `Q${bit}`),
  initialState: () => ({ q: 0, clock: false }),
  evaluate: (inputs, state) => {
    const [load, clock] = inputs.slice(8);
    const q = clock && !state.clock && load ? toNumber(inputs.slice(0, 8)) : state.q;
    return {
      outputs: toBits(state.q, 8),
      nextState: q === state.q && clock === state.clock ? state : { q, clock },
    };
  },
});

// ---------------------------------------------------------------- counter8

function counter8Circuit(): Circuit {
  const b = new Builder();
  ports(b, [...busPorts("d", "D"), ["inc", "INC"], ["load", "LOAD"], ["clock", "CLK"]]);
  b.gate("count", "not", 200, 840, "load", undefined, "COUNT");
  let carry: Ref = "inc";
  for (let bit = 0; bit < 8; bit++) {
    const y = 30 + bit * 140;
    const sum = b.gate(`sum${bit}`, "xor", 360, y + 60, `cell${bit}`, carry, `+1 BIT ${bit}`);
    carry = b.gate(`carry${bit}`, "and", 360, y + 120, `cell${bit}`, carry);
    const write = b.gate(`write${bit}`, "and", 500, y, `d${bit}`, "load");
    const keep = b.gate(`keep${bit}`, "and", 500, y + 60, sum, "count");
    b.gate(`next${bit}`, "or", 640, y, write, keep);
    b.add(`cell${bit}`, "dff", 790, y, `BIT ${bit}`);
    b.connect(`next${bit}`, `cell${bit}`);
    b.connect("clock", `cell${bit}`, 1);
    b.gate(`q${bit}`, "lamp", 960, y, `cell${bit}`, undefined, `Q${bit}`);
  }
  return b.circuit("Program counter");
}

registerBlock<ClockedByte>({
  name: "counter8",
  inputs: [...busPorts("d", "D").map(([, l]) => l), "INC", "LOAD", "CLK"],
  outputs: range(8).map((bit) => `Q${bit}`),
  initialState: () => ({ q: 0, clock: false }),
  evaluate: (inputs, state) => {
    const [inc, load, clock] = inputs.slice(8);
    const rising = clock && !state.clock;
    const q = !rising
      ? state.q
      : load
        ? toNumber(inputs.slice(0, 8))
        : inc
          ? (state.q + 1) & 255
          : state.q;
    return {
      outputs: toBits(state.q, 8),
      nextState: q === state.q && clock === state.clock ? state : { q, clock },
    };
  },
});

// ---------------------------------------------------------------- alu8

/** The ALU's arithmetic: CARRY is the carry out on add and the borrow on subtract. */
export function alu(a: number, b: number, sub: boolean) {
  const raw = sub ? a - b : a + b;
  const result = raw & 255;
  return { result, carry: sub ? raw < 0 : raw > 255, zero: result === 0 };
}

function alu8Circuit(): Circuit {
  const b = new Builder();
  ports(b, [...busPorts("a", "A"), ...busPorts("b", "B"), ["sub", "SUB"]]);
  // A − B is A + NOT B + 1: SUB flips every B bit and is the first carry in.
  let carry: Ref = "sub";
  for (let bit = 0; bit < 8; bit++) {
    const y = 30 + bit * 190;
    const operand = b.gate(`bx${bit}`, "xor", 220, y, `b${bit}`, "sub", `B${bit} OR NOT B${bit}`);
    const half = b.gate(`half${bit}`, "xor", 380, y, `a${bit}`, operand);
    b.gate(`sum${bit}`, "xor", 540, y, half, carry, `SUM ${bit}`);
    const both = b.gate(`both${bit}`, "and", 380, y + 70, `a${bit}`, operand);
    const pass = b.gate(`pass${bit}`, "and", 540, y + 70, half, carry);
    carry = b.gate(`carry${bit}`, "or", 700, y + 70, both, pass, `CARRY ${bit + 1}`);
  }
  for (let bit = 0; bit < 8; bit++)
    b.gate(`r${bit}`, "lamp", 1100, 30 + bit * 190, `sum${bit}`, undefined, `R${bit}`);
  // No carry out of A + NOT B + 1 means A < B: a borrow.
  b.gate("flag", "xor", 860, 1600, carry, "sub", "CARRY OR BORROW");
  b.gate("carry", "lamp", 1100, 1600, "flag", undefined, "CARRY");
  const any = b.orTree(
    "zero",
    range(8).map((bit) => `sum${bit}`),
    860,
    1700,
    "ANY BIT",
  );
  b.gate("none", "not", 1000, 1760, any, undefined, "ALL ZERO");
  b.gate("zero", "lamp", 1100, 1760, "none", undefined, "ZERO");
  return b.circuit("ALU with flags");
}

registerBlock<null>({
  name: "alu8",
  inputs: [...busPorts("a", "A"), ...busPorts("b", "B"), ["sub", "SUB"]].map(([, l]) => l),
  outputs: [...range(8).map((bit) => `R${bit}`), "CARRY", "ZERO"],
  initialState: () => null,
  evaluate: (inputs, state) => {
    const { result, carry, zero } = alu(
      toNumber(inputs.slice(0, 8)),
      toNumber(inputs.slice(8, 16)),
      inputs[16],
    );
    return { outputs: [...toBits(result, 8), carry, zero], nextState: state };
  },
});

// ---------------------------------------------------------------- memory rows

/** Wraps a register8 block as a memory row. */
const rowNode = (id: string, x: number, y: number, label: string): Node => ({
  id,
  type: "module",
  x,
  y,
  label,
  module: register8Circuit(),
  behaviour: "register8",
});

/**
 * 16 register8 rows sharing the data inputs. `write[r]` loads row r on the
 * clock; the outputs read the row picked by `read[r]`. Returns the 8 read bits.
 */
function memoryRows(b: Builder, data: Ref[], write: Ref[], read: Ref[], x: number): Ref[] {
  const rows = range(16).map((r) => {
    const id = `row${r}`;
    b.nodes.push(rowNode(id, x, 30 + r * 220, `ROW ${hex(r).slice(1)}`));
    data.forEach((bit, i) => b.connect(bit, id, i));
    b.connect(write[r], id, 8);
    b.connect("clock", id, 9);
    return id;
  });
  return range(8).map((bit) =>
    b.orTree(
      `read${bit}`,
      rows.map((row, r) =>
        b.gate(`pick${r}-${bit}`, "and", x + 260, 30 + r * 220 + bit * 24, [row, bit], read[r]),
      ),
      x + 420,
      30 + bit * 440,
      `READ BIT ${bit}`,
    ),
  );
}
const rowState = (q: number, clock: boolean): ClockedByte => ({ q, clock });

// ---------------------------------------------------------------- ram16

function ram16Circuit(): Circuit {
  const b = new Builder();
  ports(b, [...busPorts("a", "A", 4), ...busPorts("d", "D"), ["we", "WE"], ["clock", "CLK"]]);
  const select = b.decoder(
    "addr",
    range(4).map((bit) => `a${bit}`),
    200,
    30,
    undefined,
    "ADDRESS",
  );
  const write = select.map((sel, r) =>
    b.gate(`write${r}`, "and", 680, 30 + r * 90, sel, "we", `WRITE ${r}`),
  );
  const out = memoryRows(
    b,
    range(8).map((bit) => `d${bit}`),
    write,
    select,
    900,
  );
  out.forEach((bit, i) => b.gate(`q${i}`, "lamp", 2000, 30 + i * 440, bit, undefined, `Q${i}`));
  return b.circuit("16-byte RAM");
}

type Ram = { bytes: number[]; clock: boolean };
registerBlock<Ram>({
  name: "ram16",
  inputs: [...busPorts("a", "A", 4), ...busPorts("d", "D"), ["we", "WE"], ["clock", "CLK"]].map(
    ([, l]) => l,
  ),
  outputs: range(8).map((bit) => `Q${bit}`),
  initialState: () => ({ bytes: Array(16).fill(0), clock: false }),
  evaluate: (inputs, state) => {
    const address = toNumber(inputs.slice(0, 4));
    const [we, clock] = inputs.slice(12);
    let bytes = state.bytes;
    if (clock && !state.clock && we) {
      bytes = [...bytes];
      bytes[address] = toNumber(inputs.slice(4, 12));
    }
    return {
      outputs: toBits(state.bytes[address], 8),
      nextState: bytes === state.bytes && clock === state.clock ? state : { bytes, clock },
    };
  },
});

// ---------------------------------------------------------------- stack16

function stack16Circuit(): Circuit {
  const b = new Builder();
  ports(b, [...busPorts("d", "D"), ["push", "PUSH"], ["pop", "POP"], ["clock", "CLK"]]);
  b.add("one", "high", 200, 1000, "1");
  b.gate("not-push", "not", 200, 1100, "push", undefined, "NOT PUSH");
  b.gate("not-pop", "not", 200, 1200, "pop", undefined, "NOT POP");
  // SP + 1 for a push, SP − 1 for a pop and for the read address (the top entry).
  let up: Ref = "one";
  let down: Ref = "one";
  for (let bit = 0; bit < 4; bit++) {
    const y = 1300 + bit * 260;
    const sp = `sp${bit}`;
    b.gate(`inc${bit}`, "xor", 360, y, sp, up, `SP+1 BIT ${bit}`);
    up = b.gate(`inc-carry${bit}`, "and", 360, y + 60, sp, up);
    b.gate(`dec${bit}`, "xor", 360, y + 120, sp, down, `SP−1 BIT ${bit}`);
    const zero = b.gate(`sp-zero${bit}`, "not", 220, y + 180, sp);
    down = b.gate(`dec-borrow${bit}`, "and", 360, y + 180, zero, down);
    const popped = b.gate(`popped${bit}`, "and", 500, y + 60, `dec${bit}`, "pop");
    const kept = b.gate(`kept${bit}`, "and", 500, y + 120, sp, "not-pop");
    const hold = b.gate(`hold${bit}`, "or", 640, y + 90, popped, kept);
    const pushed = b.gate(`pushed${bit}`, "and", 640, y, `inc${bit}`, "push");
    const other = b.gate(`other${bit}`, "and", 780, y + 90, hold, "not-push");
    b.gate(`next-sp${bit}`, "or", 920, y, pushed, other);
    b.add(sp, "dff", 1060, y, `SP BIT ${bit}`);
    b.connect(`next-sp${bit}`, sp);
    b.connect("clock", sp, 1);
  }
  const write = b.decoder(
    "write",
    range(4).map((bit) => `sp${bit}`),
    1200,
    30,
    "push",
    "PUSH TO",
  );
  const read = b.decoder(
    "top",
    range(4).map((bit) => `dec${bit}`),
    1200,
    1600,
    undefined,
    "TOP",
  );
  const out = memoryRows(
    b,
    range(8).map((bit) => `d${bit}`),
    write,
    read,
    1800,
  );
  out.forEach((bit, i) => b.gate(`top${i}`, "lamp", 2900, 30 + i * 440, bit, undefined, `TOP${i}`));
  range(4).forEach((bit) =>
    b.gate(`sp-out${bit}`, "lamp", 2900, 3600 + bit * 90, `sp${bit}`, undefined, `SP${bit}`),
  );
  return b.circuit("16-entry stack");
}

type Stack = { bytes: number[]; sp: number; clock: boolean };
registerBlock<Stack>({
  name: "stack16",
  inputs: [...busPorts("d", "D").map(([, l]) => l), "PUSH", "POP", "CLK"],
  outputs: [...range(8).map((bit) => `TOP${bit}`), ...range(4).map((bit) => `SP${bit}`)],
  initialState: () => ({ bytes: Array(16).fill(0), sp: 0, clock: false }),
  evaluate: (inputs, state) => {
    const [push, pop, clock] = inputs.slice(8);
    let { bytes, sp } = state;
    if (clock && !state.clock) {
      if (push) {
        bytes = [...bytes];
        bytes[sp] = toNumber(inputs.slice(0, 8));
        sp = (sp + 1) & 15;
      } else if (pop) sp = (sp - 1) & 15;
    }
    return {
      outputs: [...toBits(state.bytes[(state.sp - 1) & 15], 8), ...toBits(state.sp, 4)],
      nextState:
        bytes === state.bytes && sp === state.sp && clock === state.clock
          ? state
          : { bytes, sp, clock },
    };
  },
});

// ---------------------------------------------------------------- rom256

/** A 16-byte ROM page: one readable 8-bit row per address, enabled by EN. */
function rom16Circuit(bytes: readonly number[], base = 0): Circuit {
  const b = new Builder();
  ports(b, [...busPorts("a", "A", 4), ["en", "EN"]]);
  const select = b.decoder(
    "addr",
    range(4).map((bit) => `a${bit}`),
    200,
    30,
    "en",
    "ADDRESS",
  );
  range(16).forEach((r) =>
    b.add(`byte${r}`, "input8", 820, 30 + r * 220, `${hex(base + r)}: ${hex(bytes[r] ?? 0)}`, {
      numberValue: (bytes[r] ?? 0) & 255,
    }),
  );
  range(8).forEach((bit) => {
    const picked = b.orTree(
      `read${bit}`,
      range(16).map((r) =>
        b.gate(
          `pick${r}-${bit}`,
          "and",
          1000,
          30 + r * 220 + bit * 24,
          [`byte${r}`, bit],
          select[r],
        ),
      ),
      1160,
      30 + bit * 440,
      `READ BIT ${bit}`,
    );
    b.gate(`q${bit}`, "lamp", 1800, 30 + bit * 440, picked, undefined, `D${bit}`);
  });
  return b.circuit(`ROM ${hex(base)}–${hex(base + 15)}`);
}
/** The bytes stored in a ROM page's rows. */
const pageBytes = (page: Circuit) =>
  range(16).map((r) => page.nodes.find((node) => node.id === `byte${r}`)?.numberValue ?? 0);

type Rom = { bytes: number[] };
registerBlock<Rom>({
  name: "rom16",
  inputs: [...busPorts("a", "A", 4), ["en", "EN"]].map(([, l]) => l),
  outputs: range(8).map((bit) => `D${bit}`),
  initialState: (module) => ({ bytes: pageBytes(module) }),
  evaluate: (inputs, state) => ({
    outputs: toBits(inputs[4] ? state.bytes[toNumber(inputs.slice(0, 4))] : 0, 8),
    nextState: state,
  }),
});

function rom256Circuit(bytes: readonly number[]): Circuit {
  const b = new Builder();
  ports(b, busPorts("a", "A"));
  const page = b.decoder(
    "page",
    range(4).map((bit) => `a${bit + 4}`),
    200,
    30,
    undefined,
    "PAGE",
  );
  const pages = range(16).map((p) => {
    const id = `page${p}`;
    b.add(id, "module", 700, 30 + p * 140, `ROM ${hex(p * 16)}–${hex(p * 16 + 15)}`, {
      module: rom16Circuit(bytes.slice(p * 16, p * 16 + 16), p * 16),
      behaviour: "rom16",
    });
    range(4).forEach((bit) => b.connect(`a${bit}`, id, bit));
    b.connect(page[p], id, 4);
    return id;
  });
  range(8).forEach((bit) => {
    const any = b.orTree(
      `out${bit}`,
      pages.map((id) => [id, bit] as Ref),
      900,
      30 + bit * 280,
      `DATA BIT ${bit}`,
    );
    b.gate(`q${bit}`, "lamp", 1500, 30 + bit * 280, any, undefined, `D${bit}`);
  });
  return b.circuit("256-byte ROM");
}
/** The 256 bytes stored in a ROM's pages. */
export const romBytes = (rom: Circuit) =>
  range(16).flatMap((p) => {
    const page = rom.nodes.find((node) => node.id === `page${p}`)?.module;
    return page ? pageBytes(page) : Array<number>(16).fill(0);
  });

registerBlock<Rom>({
  name: "rom256",
  inputs: busPorts("a", "A").map(([, l]) => l),
  outputs: range(8).map((bit) => `D${bit}`),
  initialState: (module) => ({ bytes: romBytes(module) }),
  evaluate: (inputs, state) => ({
    outputs: toBits(state.bytes[toNumber(inputs)], 8),
    nextState: state,
  }),
});

// ---------------------------------------------------------------- public API

export const DATAPATH_BLOCKS = {
  register8: { label: "8-BIT REGISTER", hint: "Set D and LOAD, then raise CLK: Q takes D." },
  counter8: { label: "PROGRAM COUNTER", hint: "On a rising CLK: LOAD takes D, else INC adds 1." },
  alu8: {
    label: "8-BIT ALU",
    hint: "R = A + B, or A − B with SUB. CARRY is the borrow when subtracting.",
  },
  rom256: { label: "256-BYTE ROM", hint: "A picks a byte; D reads it. Unfold to see the rows." },
  ram16: { label: "16-BYTE RAM", hint: "A picks a row; with WE on, a rising CLK stores D there." },
  stack16: {
    label: "16-ENTRY STACK",
    hint: "PUSH stores D at SP and adds 1; POP subtracts 1. TOP is the last entry.",
  },
} as const;
export type DatapathKind = keyof typeof DATAPATH_BLOCKS;
export const DATAPATH_KINDS = Object.keys(DATAPATH_BLOCKS) as DatapathKind[];
export const isDatapathKind = (name: string | undefined): name is DatapathKind =>
  name !== undefined && name in DATAPATH_BLOCKS;

/** The gate form of a datapath block. `bytes` fills a ROM, e.g. `compileProgram(...).bytes`. */
export function datapathCircuit(kind: DatapathKind, bytes: readonly number[] = []): Circuit {
  switch (kind) {
    case "register8":
      return register8Circuit();
    case "counter8":
      return counter8Circuit();
    case "alu8":
      return alu8Circuit();
    case "ram16":
      return ram16Circuit();
    case "stack16":
      return stack16Circuit();
    case "rom256":
      return rom256Circuit(range(256).map((i) => (bytes[i] ?? 0) & 255));
  }
}

/** A module node that runs as the behavioural block while folded. */
export const datapathNode = (
  kind: DatapathKind,
  id: string,
  x: number,
  y: number,
  bytes?: readonly number[],
): Node => ({
  id,
  type: "module",
  x,
  y,
  label: DATAPATH_BLOCKS[kind].label,
  module: datapathCircuit(kind, bytes),
  behaviour: kind,
});

/** Writes a byte into flip-flops `${prefix}0..7`, as their stored bit and last clock. */
function seedCells(snapshot: Snapshot, cells: string[], value: number, clock: boolean) {
  cells.forEach((id, bit) => {
    const on = Boolean((value >> bit) & 1);
    snapshot.memory[id] = on;
    snapshot.values[id] = on;
    snapshot.lastClock[id] = clock;
  });
}
const readCells = (snapshot: Snapshot, cells: string[]) =>
  toNumber(cells.map((id) => Boolean(snapshot.memory[id])));
const cellIds = (prefix: string, width = 8) => range(width).map((bit) => `${prefix}${bit}`);

/**
 * The inner snapshot to unfold a block into: its gate form's flip-flops (and
 * nested row blocks) hold the block's stored value. Settle it with one `step`
 * before drawing outputs.
 */
export function unfoldBlockState(node: Node, state: unknown): Snapshot {
  const snapshot = initialSnapshot();
  snapshot.blocks = {};
  if (state == null || !isDatapathKind(node.behaviour)) return snapshot;
  switch (node.behaviour) {
    case "register8":
    case "counter8": {
      const { q, clock } = state as ClockedByte;
      seedCells(snapshot, cellIds("cell"), q, clock);
      break;
    }
    case "ram16": {
      const { bytes, clock } = state as Ram;
      for (const [r, q] of bytes.entries()) snapshot.blocks![`row${r}`] = rowState(q, clock);
      break;
    }
    case "stack16": {
      const { bytes, sp, clock } = state as Stack;
      for (const [r, q] of bytes.entries()) snapshot.blocks![`row${r}`] = rowState(q, clock);
      seedCells(snapshot, cellIds("sp", 4), sp, clock);
      break;
    }
    case "rom256":
    case "alu8":
      break;
  }
  return snapshot;
}

/** Reads a block's state back out of its unfolded gate form, for folding. */
export function foldBlockState(node: Node, snapshot: Snapshot | undefined): unknown {
  if (!isDatapathKind(node.behaviour) || !node.module) return undefined;
  const inner = snapshot ?? initialSnapshot();
  // A nested row may run as gates (unfolded) or as a block; prefer the gates.
  const row = (r: number): ClockedByte => {
    const gates = inner.modules[`row${r}`];
    if (gates && Object.keys(gates.memory).length)
      return { q: readCells(gates, cellIds("cell")), clock: Boolean(gates.lastClock.cell0) };
    return (inner.blocks?.[`row${r}`] as ClockedByte | undefined) ?? rowState(0, false);
  };
  switch (node.behaviour) {
    case "register8":
    case "counter8":
      return { q: readCells(inner, cellIds("cell")), clock: Boolean(inner.lastClock.cell0) };
    case "ram16": {
      const rows = range(16).map(row);
      return { bytes: rows.map((r) => r.q), clock: rows[0].clock };
    }
    case "stack16": {
      const rows = range(16).map(row);
      return {
        bytes: rows.map((r) => r.q),
        sp: readCells(inner, cellIds("sp", 4)),
        clock: Boolean(inner.lastClock.sp0),
      };
    }
    case "rom256":
      return { bytes: romBytes(node.module) };
    case "alu8":
      return null;
  }
}
