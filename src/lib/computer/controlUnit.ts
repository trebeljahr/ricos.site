// Control unit for the toy CPU: a T-state counter, a microcode ROM and the
// HALT line that gates the clock. Each is a module node with a behavioural
// folded form and a gate form, like the datapath blocks.
//
// The microcode ROM's gates are generated from `microcodeRom()`, which is
// generated from the stepper's microcode table, so the circuit cannot drift
// from the table. Its behavioural form reads its words back out of those gates.

import {
  INT_OPCODE,
  ISA,
  MAX_T_STATES,
  microcodeAddress,
  microcodeRom,
  SIGNALS,
  type Signal,
} from "../computerStepper";
import {
  Builder,
  busPorts,
  cellIds,
  ports,
  type Ref,
  range,
  readCells,
  seedCells,
  toBits,
  toNumber,
} from "./blockBuilder";
import {
  type Circuit,
  initialSnapshot,
  moduleInputs,
  type Node,
  registerBlock,
  type Snapshot,
} from "./logic";

/** Bits of the T-state counter: enough for MAX_T_STATES states. */
export const T_BITS = Math.ceil(Math.log2(MAX_T_STATES));
const T_MASK = (1 << T_BITS) - 1;
const bitOf = (signal: Signal) => 1 << SIGNALS.indexOf(signal);
const HALT_BIT = bitOf("HALT");
const RESET_BIT = bitOf("STEP_RESET");

// ---------------------------------------------------------------- tstate

function tstateCircuit(): Circuit {
  const b = new Builder();
  ports(b, [
    ["reset", "STEP_RESET"],
    ["clock", "CLK"],
  ]);
  b.add("one", "high", 30, 300, "1");
  b.gate("count", "not", 200, 30, "reset", undefined, "COUNT");
  let carry: Ref = "one";
  for (let bit = 0; bit < T_BITS; bit++) {
    const y = 30 + bit * 140;
    const sum = b.gate(`sum${bit}`, "xor", 360, y + 60, `cell${bit}`, carry, `+1 BIT ${bit}`);
    carry = b.gate(`carry${bit}`, "and", 360, y + 120, `cell${bit}`, carry);
    b.gate(`next${bit}`, "and", 500, y, sum, "count");
    b.add(`cell${bit}`, "dff", 650, y, `T BIT ${bit}`);
    b.connect(`next${bit}`, `cell${bit}`);
    b.connect("clock", `cell${bit}`, 1);
    b.gate(`t${bit}`, "lamp", 820, y, `cell${bit}`, undefined, `T${bit}`);
  }
  return b.circuit("T-state counter");
}

type TState = { t: number; clock: boolean };
/** The next T-state on a rising clock: 0 after STEP_RESET, else one more. */
const nextT = (t: number, reset: boolean) => (reset ? 0 : (t + 1) & T_MASK);

registerBlock<TState>({
  name: "tstate",
  inputs: ["STEP_RESET", "CLK"],
  outputs: range(T_BITS).map((bit) => `T${bit}`),
  initialState: () => ({ t: 0, clock: false }),
  evaluate: ([reset, clock], state) => {
    const t = clock && !state.clock ? nextT(state.t, reset) : state.t;
    return {
      outputs: toBits(state.t, T_BITS),
      nextState: t === state.t && clock === state.clock ? state : { t, clock },
    };
  },
});

// ---------------------------------------------------------------- microcode

const mnemonic = (opcode: number) =>
  opcode === INT_OPCODE
    ? "INT"
    : (ISA.find((item) => item.opcode === opcode)?.mnemonic ?? opcode.toString(16).toUpperCase());
const signalNames = (word: number) => SIGNALS.filter((signal) => word & bitOf(signal)).join(" ");

/**
 * The microcode ROM as a readable row view (a PLA): one AND row per group of
 * addresses that share a control word, then one OR per control line over the
 * rows that switch it on. Rows are found per T-state. The control word most
 * opcodes share at that T-state (fetch, or HALT for unknown opcodes) is one
 * "OTHER" row; opcodes with their own word get a row each, split on the carry
 * flag only where the word depends on it.
 */
function microcodeCircuit(rom: readonly number[]): Circuit {
  const b = new Builder();
  ports(b, [...busPorts("op", "OP"), ...busPorts("t", "T", T_BITS), ["carry", "CARRY"]]);
  b.gate("no-carry", "not", 200, 30 + (8 + T_BITS) * 90, "carry", undefined, "NOT CARRY");
  const literal = (prefix: string, bit: number, one: boolean, y: number): Ref => {
    if (one) return `${prefix}${bit}`;
    const id = `not-${prefix}${bit}`;
    if (!b.nodes.some((node) => node.id === id))
      b.gate(id, "not", 200, y, `${prefix}${bit}`, undefined, `NOT ${prefix.toUpperCase()}${bit}`);
    return id;
  };
  /** ANDs the sources pairwise down to one signal. */
  const andTree = (prefix: string, sources: Ref[], x: number, y: number, label: string): Ref => {
    let level = sources;
    for (let depth = 0; level.length > 1; depth++) {
      const next: Ref[] = [];
      for (let i = 0; i < level.length; i += 2)
        next.push(
          i + 1 < level.length
            ? b.gate(
                `${prefix}-and${depth}-${i / 2}`,
                "and",
                x + depth * 120,
                y + i * 20,
                level[i],
                level[i + 1],
                level.length === 2 ? label : undefined,
              )
            : level[i],
        );
      level = next;
    }
    return level[0];
  };

  const tLines = range(MAX_T_STATES).map((t) =>
    andTree(
      `tline${t}`,
      range(T_BITS).map((bit) => literal("t", bit, Boolean((t >> bit) & 1), 30 + (8 + bit) * 90)),
      360,
      30 + t * 90,
      `T${t}`,
    ),
  );
  const opMatches = new Map<number, Ref>();
  const opMatch = (opcode: number) => {
    let ref = opMatches.get(opcode);
    if (ref === undefined) {
      ref = andTree(
        `op${opcode}`,
        range(8).map((bit) => literal("op", bit, Boolean((opcode >> bit) & 1), 30 + bit * 90)),
        360,
        800 + opMatches.size * 180,
        `IS ${mnemonic(opcode)}`,
      );
      opMatches.set(opcode, ref);
    }
    return ref;
  };

  const rows: { ref: Ref; word: number }[] = [];
  let rowY = 30;
  const addRow = (id: string, match: Ref, carry: Ref | undefined, word: number, label: string) => {
    if (!word) return;
    // Without a carry split the match gate is the row; it takes the row's label.
    const ref = carry === undefined ? match : b.gate(id, "and", 1100, rowY, match, carry);
    const node = b.nodes.find((n) => n.id === ref);
    if (node) node.label = label.slice(0, 30);
    rows.push({ ref, word });
    rowY += 70;
  };
  for (let t = 0; t < MAX_T_STATES; t++) {
    const groups = new Map<string, number[]>();
    for (let opcode = 0; opcode < 256; opcode++) {
      const key = `${rom[microcodeAddress(opcode, t, false)]},${rom[microcodeAddress(opcode, t, true)]}`;
      groups.set(key, [...(groups.get(key) ?? []), opcode]);
    }
    const ordered = [...groups].sort((a, b) => b[1].length - a[1].length);
    const special = ordered.slice(1).flatMap(([, opcodes]) => opcodes);
    for (const [index, [key, opcodes]] of ordered.entries()) {
      const [clear, set] = key.split(",").map(Number);
      if (!clear && !set) continue;
      const name =
        index === 0 ? (special.length ? "OTHER" : "ANY") : opcodes.map(mnemonic).join("/");
      const id = `row-t${t}-${index}`;
      const which =
        index === 0
          ? special.length
            ? b.gate(
                `${id}-none`,
                "not",
                940,
                rowY,
                b.orTree(`${id}-any`, special.map(opMatch), 760, rowY, `T${t} SPECIAL`),
                undefined,
                "NOT SPECIAL",
              )
            : undefined
          : b.orTree(`${id}-which`, opcodes.map(opMatch), 760, rowY, `IS ${name}`);
      const match =
        which === undefined
          ? tLines[t]
          : b.gate(`${id}-match`, "and", 1000, rowY, tLines[t], which);
      if (clear === set)
        addRow(`${id}-row`, match, undefined, clear, `T${t} ${name}: ${signalNames(clear)}`);
      else {
        addRow(`${id}-clear`, match, "no-carry", clear, `T${t} ${name} C0: ${signalNames(clear)}`);
        addRow(`${id}-set`, match, "carry", set, `T${t} ${name} C1: ${signalNames(set)}`);
      }
    }
  }
  SIGNALS.forEach((signal, index) => {
    const sources = rows.filter((row) => row.word & (1 << index)).map((row) => row.ref);
    const y = 30 + index * 90;
    const line = sources.length
      ? b.orTree(`line-${signal}`, sources, 1300, y, signal)
      : b.add(`line-${signal}`, "ground", 1300, y, `${signal} (UNUSED)`);
    b.gate(`out-${signal}`, "lamp", 1900, y, line, undefined, signal);
  });
  return b.circuit("Microcode ROM");
}

/** Evaluates a combinational gate circuit for many inputs; returns lamp values. */
function combinational(circuit: Circuit): (inputs: boolean[]) => boolean[] {
  const byId = new Map(circuit.nodes.map((node) => [node.id, node]));
  const feeds = new Map<string, string[]>();
  for (const wire of circuit.wires) {
    const list = feeds.get(wire.to) ?? [];
    list[wire.input] = wire.from;
    feeds.set(wire.to, list);
  }
  const order: string[] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const from of feeds.get(id) ?? []) if (from) visit(from);
    order.push(id);
  };
  circuit.nodes.forEach((node) => visit(node.id));
  const inputIds = moduleInputs(circuit).map((node) => node.id);
  const lamps = circuit.nodes.filter((node) => node.type === "lamp").map((node) => node.id);
  return (inputs) => {
    const value = new Map<string, boolean>(inputIds.map((id, i) => [id, inputs[i]]));
    for (const id of order) {
      const node = byId.get(id)!;
      const [a, c] = (feeds.get(id) ?? []).map((from) => Boolean(from && value.get(from)));
      if (node.type === "and") value.set(id, a && c);
      else if (node.type === "or") value.set(id, a || c);
      else if (node.type === "not") value.set(id, !a);
      else if (node.type === "xor") value.set(id, a !== c);
      else if (node.type === "high") value.set(id, true);
      else if (node.type === "ground") value.set(id, false);
      else if (node.type === "lamp") value.set(id, Boolean(a));
      else if (!value.has(id)) value.set(id, false);
    }
    return lamps.map((id) => Boolean(value.get(id)));
  };
}

const wordCache = new WeakMap<Circuit, number[]>();
/** The control words a microcode ROM's gates produce, one per microcode address. */
export function microcodeWords(rom: Circuit): number[] {
  let words = wordCache.get(rom);
  if (!words) {
    const run = combinational(rom);
    words = range(256 * MAX_T_STATES * 2).map((address) =>
      toNumber(
        run([
          ...toBits(address >> 4, 8),
          ...toBits((address >> 1) & T_MASK, T_BITS),
          Boolean(address & 1),
        ]),
      ),
    );
    wordCache.set(rom, words);
  }
  return words;
}

type Microcode = { words: number[] };
const lookup = (words: readonly number[], opcode: number, t: number, carry: boolean) =>
  words[microcodeAddress(opcode, t, carry)] ?? 0;

registerBlock<Microcode>({
  name: "microcode",
  inputs: [...busPorts("op", "OP"), ...busPorts("t", "T", T_BITS), ["carry", "CARRY"]].map(
    ([, l]) => l,
  ),
  outputs: [...SIGNALS],
  initialState: (module) => ({ words: microcodeWords(module) }),
  evaluate: (inputs, state) => ({
    outputs: toBits(
      lookup(
        state.words,
        toNumber(inputs.slice(0, 8)),
        toNumber(inputs.slice(8, 8 + T_BITS)),
        inputs[8 + T_BITS],
      ),
      SIGNALS.length,
    ),
    nextState: state,
  }),
});

// ---------------------------------------------------------------- control

/**
 * The whole control unit: the T-state counter addresses the microcode ROM
 * together with the opcode and carry flag. STEP_RESET resets the counter at
 * the end of an instruction. HALT gates the clock: GCLK = CLK AND NOT HALT,
 * so once HALT is on, neither the counter nor anything clocked from GCLK moves.
 * INT (the CPU's interrupt latch) swaps the opcode for INT_OPCODE, so the ROM
 * runs the interrupt entry instead of the instruction in IR.
 */
function controlCircuit(rom: readonly number[]): Circuit {
  const b = new Builder();
  ports(b, [...busPorts("op", "OP"), ["carry", "CARRY"], ["clock", "CLK"], ["int", "INT"]]);
  b.gate("no-int", "not", 130, 1500, "int", undefined, "NOT INT");
  // Each opcode bit: IR's bit, or INT_OPCODE's bit while INT is on.
  const opcode = range(8).map((bit) =>
    (INT_OPCODE >> bit) & 1
      ? b.gate(`op-sel${bit}`, "or", 160, 30 + bit * 90, `op${bit}`, "int")
      : b.gate(`op-sel${bit}`, "and", 160, 30 + bit * 90, `op${bit}`, "no-int"),
  );
  b.nodes.push(
    {
      id: "tstate",
      type: "module",
      x: 260,
      y: 900,
      label: CONTROL_BLOCKS.tstate.label,
      module: tstateCircuit(),
      behaviour: "tstate",
    },
    {
      id: "microcode",
      type: "module",
      x: 600,
      y: 30,
      label: CONTROL_BLOCKS.microcode.label,
      module: microcodeCircuit(rom),
      behaviour: "microcode",
    },
  );
  for (const [bit, source] of opcode.entries()) b.connect(source, "microcode", bit);
  range(T_BITS).forEach((bit) => b.connect(["tstate", bit], "microcode", 8 + bit));
  b.connect("carry", "microcode", 8 + T_BITS);
  const halt: Ref = ["microcode", SIGNALS.indexOf("HALT")];
  b.gate("running", "not", 260, 700, halt, undefined, "NOT HALT");
  b.gate("gclk", "and", 420, 760, "clock", "running", "GATED CLOCK");
  b.connect(["microcode", SIGNALS.indexOf("STEP_RESET")], "tstate", 0);
  b.connect("gclk", "tstate", 1);
  SIGNALS.forEach((signal, index) =>
    b.gate(`out-${signal}`, "lamp", 1000, 30 + index * 90, ["microcode", index], undefined, signal),
  );
  b.gate("out-gclk", "lamp", 1000, 30 + SIGNALS.length * 90, "gclk", undefined, "GCLK");
  return b.circuit("Control unit");
}

type Control = { t: number; clock: boolean; words: number[] };
/** The gate form's microcode words; a fresh gate form holds `microcodeRom()`. */
const controlWords = (module: Circuit) => {
  const rom = module.nodes.find((node) => node.id === "microcode")?.module;
  return rom ? microcodeWords(rom) : microcodeRom();
};

registerBlock<Control>({
  name: "control",
  inputs: [...busPorts("op", "OP").map(([, l]) => l), "CARRY", "CLK", "INT"],
  outputs: [...SIGNALS, "GCLK"],
  initialState: (module) => ({ t: 0, clock: false, words: controlWords(module) }),
  evaluate: (inputs, state) => {
    const opcode = inputs[10] ? INT_OPCODE : toNumber(inputs.slice(0, 8));
    const word = lookup(state.words, opcode, state.t, inputs[8]);
    const gated = inputs[9] && !(word & HALT_BIT);
    const t = gated && !state.clock ? nextT(state.t, Boolean(word & RESET_BIT)) : state.t;
    return {
      outputs: [...toBits(word, SIGNALS.length), gated],
      nextState: t === state.t && gated === state.clock ? state : { ...state, t, clock: gated },
    };
  },
});

// ---------------------------------------------------------------- public API

export const CONTROL_BLOCKS = {
  tstate: {
    label: "T-STATE COUNTER",
    hint: "Counts clock ticks within an instruction. STEP_RESET sends it back to T0.",
  },
  microcode: {
    label: "MICROCODE ROM",
    hint: "Opcode, T-state and carry pick a row; the row's control lines switch on.",
  },
  control: {
    label: "CONTROL UNIT",
    hint: "Feed it the opcode, carry, clock and INT. It outputs the control word; HALT stops GCLK. With INT on it runs the interrupt entry instead of the opcode.",
  },
} as const;
export type ControlKind = keyof typeof CONTROL_BLOCKS;

/** The gate form of a control block. `rom` defaults to the stepper's microcode table. */
export function controlBlockCircuit(
  kind: ControlKind,
  rom: readonly number[] = microcodeRom(),
): Circuit {
  switch (kind) {
    case "tstate":
      return tstateCircuit();
    case "microcode":
      return microcodeCircuit(rom);
    case "control":
      return controlCircuit(rom);
  }
}

/** Inner snapshot for unfolding a control block; see `unfoldBlockState`. */
export function unfoldControlState(kind: ControlKind, state: unknown): Snapshot {
  const snapshot = initialSnapshot();
  snapshot.blocks = {};
  if (state == null) return snapshot;
  if (kind === "tstate") {
    const { t, clock } = state as TState;
    seedCells(snapshot, cellIds("cell", T_BITS), t, clock);
  } else if (kind === "control") {
    const { t, clock, words } = state as Control;
    snapshot.blocks.tstate = { t, clock } satisfies TState;
    snapshot.blocks.microcode = { words } satisfies Microcode;
  }
  return snapshot;
}

/** Reads a control block's state back out of its gate form; see `foldBlockState`. */
export function foldControlState(node: Node, kind: ControlKind, inner: Snapshot): unknown {
  const counter = (snapshot: Snapshot): TState => ({
    t: readCells(snapshot, cellIds("cell", T_BITS)),
    clock: Boolean(snapshot.lastClock.cell0),
  });
  switch (kind) {
    case "tstate":
      return counter(inner);
    case "microcode":
      return { words: microcodeWords(node.module!) } satisfies Microcode;
    case "control": {
      const gates = inner.modules.tstate;
      const { t, clock } =
        gates && Object.keys(gates.memory).length
          ? counter(gates)
          : ((inner.blocks?.tstate as TState | undefined) ?? { t: 0, clock: false });
      return { t, clock, words: controlWords(node.module!) } satisfies Control;
    }
  }
}
