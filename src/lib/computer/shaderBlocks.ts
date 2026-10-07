// The shader unit as blocks: `shader8` is the whole unit, `shaderLane` one of
// its eight lane ALUs. The unit's gate form shows the point of a GPU: one
// program ROM and one decoder whose control lines fan out to eight identical
// lanes, each computing one pixel of the row in the same tick.
//
// Like the datapath blocks, outputs come from the state before the clock
// commit, so a screen clocked from the same CLK stores the row the shader
// shows on the tick its WE is on.
import {
  Builder,
  busPorts,
  cellIds,
  hex,
  ports,
  type Ref,
  range,
  readCells,
  seedCells,
  toBits,
  toNumber,
} from "./blockBuilder";
import { type Circuit, initialSnapshot, type Node, registerBlock, type Snapshot } from "./logic";
import {
  compileShader,
  disassembleShader,
  initialShaderState,
  LANE_LINES,
  type LaneControl,
  laneNext,
  SAMPLE_SHADERS,
  SHADER_LANES,
  SHADER_OPS,
  SHADER_ROM_SIZE,
  type ShaderState,
  shaderRowReady,
  shaderStep,
} from "./shader";

const laneIds = LANE_LINES.map((line) => line.toLowerCase());

// ---------------------------------------------------------------- shaderLane

/**
 * One lane: a 3-bit accumulator A, a pixel bit P and a small ALU. B is the
 * shared operand, plus the lane's own x or p when USEX or USEP is on.
 */
function laneCircuit(): Circuit {
  const b = new Builder();
  ports(b, [
    ...busPorts("x", "X", 3),
    ...busPorts("bs", "B", 3),
    ["usex", "USEX"],
    ["usep", "USEP"],
    ...LANE_LINES.map((line, i): [string, string] => [laneIds[i], line]),
    ["clock", "CLK"],
  ]);
  const operand = range(3).map((bit) => {
    const y = 30 + bit * 420;
    const own = b.gate(`own-x${bit}`, "and", 360, y, `x${bit}`, "usex");
    let ref: Ref = b.gate(`b${bit}`, "or", 500, y, `bs${bit}`, own, `B${bit}`);
    if (bit === 0) {
      const pixel = b.gate("own-p", "and", 500, y + 60, "p", "usep");
      ref = b.gate("b0-p", "or", 640, y + 30, ref, pixel, "B0 WITH P");
    }
    return ref;
  });
  // A + B, or A + NOT B + 1 when SUBTRACT is on.
  let carry: Ref = "subtract";
  const sum: Ref[] = [];
  const diff: Ref[] = [];
  for (let bit = 0; bit < 3; bit++) {
    const y = 30 + bit * 420;
    const B = operand[bit];
    const a = `a${bit}`;
    b.gate(`and${bit}`, "and", 800, y, a, B, `A AND B ${bit}`);
    b.gate(`or${bit}`, "or", 800, y + 50, a, B, `A OR B ${bit}`);
    diff.push(b.gate(`xor${bit}`, "xor", 800, y + 100, a, B, `A XOR B ${bit}`));
    const bv = b.gate(`bv${bit}`, "xor", 800, y + 150, B, "subtract", `B OR NOT B ${bit}`);
    const half = b.gate(`half${bit}`, "xor", 940, y + 150, a, bv);
    sum.push(b.gate(`sum${bit}`, "xor", 1080, y + 150, half, carry, `SUM ${bit}`));
    const both = b.gate(`both${bit}`, "and", 940, y + 210, a, bv);
    const pass = b.gate(`pass${bit}`, "and", 1080, y + 210, half, carry);
    carry = b.gate(`carry${bit}`, "or", 1220, y + 210, both, pass, `CARRY ${bit + 1}`);
  }
  b.gate("below", "not", 1360, 1300, carry, undefined, "A < B");
  const differ = b.orTree("differ", diff, 1080, 1360, "A ≠ B");
  b.gate("same", "not", 1360, 1400, differ, undefined, "A = B");
  // Shift right by B: by 1 if B0, by 2 if B1, to zero if B2.
  const not = range(3).map((bit) =>
    b.gate(`not-b${bit}`, "not", 640, 1500 + bit * 60, operand[bit], undefined, `NOT B${bit}`),
  );
  const mux = (id: string, y: number, sel: number, lo: Ref, hi?: Ref) => {
    const keep = b.gate(`${id}-lo`, "and", 800, y, lo, not[sel]);
    return hi === undefined
      ? keep
      : b.gate(id, "or", 940, y, keep, b.gate(`${id}-hi`, "and", 800, y + 30, hi, operand[sel]));
  };
  const by1 = range(3).map((bit) =>
    mux(`shr1-${bit}`, 1700 + bit * 70, 0, `a${bit}`, bit < 2 ? `a${bit + 1}` : undefined),
  );
  const by2 = range(3).map((bit) =>
    mux(`shr2-${bit}`, 1950 + bit * 70, 1, by1[bit], bit === 0 ? by1[2] : undefined),
  );
  const shr = range(3).map((bit) =>
    b.gate(`shr${bit}`, "and", 1080, 1950 + bit * 70, by2[bit], not[2], `SHR ${bit}`),
  );
  b.gate("arith", "or", 1220, 1500, "add", "sub", "ADD OR SUB");
  // Each line picks its result; KEEP holds A when no line writes it.
  for (let bit = 0; bit < 3; bit++) {
    const y = 30 + bit * 420;
    const pick = (name: string, line: Ref, value: Ref) =>
      b.gate(`pick-${name}${bit}`, "and", 1500, y + laneIds.indexOf(name) * 30, line, value);
    const terms = [
      pick("ld", "ld", operand[bit]),
      pick("and", "and", `and${bit}`),
      pick("or", "or", `or${bit}`),
      pick("xor", "xor", `xor${bit}`),
      pick("add", "arith", sum[bit]),
      pick("shr", "shr", shr[bit]),
      pick("keep", "keep", `a${bit}`),
      ...(bit === 0 ? [pick("lt", "lt", "below"), pick("eq", "eq", "same")] : []),
    ];
    const next = b.orTree(`next${bit}`, terms, 1640, y, `NEXT A${bit}`);
    b.add(`a${bit}`, "dff", 2200, y, `A BIT ${bit}`);
    b.connect(next, `a${bit}`);
    b.connect("clock", `a${bit}`, 1);
    b.gate(`out-a${bit}`, "lamp", 2400, y, `a${bit}`, undefined, `A${bit}`);
  }
  b.gate("not-set", "not", 1900, 1300, "set", undefined, "NOT SET");
  const write = b.gate("set-p", "and", 2040, 1260, "a0", "set", "P ← A0");
  const hold = b.gate("hold-p", "and", 2040, 1340, "p", "not-set");
  b.gate("next-p", "or", 2160, 1300, write, hold);
  b.add("p", "dff", 2200, 1300, "PIXEL");
  b.connect("next-p", "p");
  b.connect("clock", "p", 1);
  b.gate("out-p", "lamp", 2400, 1300, "p", undefined, "P");
  return b.circuit("Shader lane");
}

type Lane = { a: number; p: boolean; clock: boolean };
const LANE_INPUTS = 3 + 3 + 2 + LANE_LINES.length;
registerBlock<Lane>({
  name: "shaderLane",
  inputs: [
    ...busPorts("x", "X", 3).map(([, l]) => l),
    ...busPorts("bs", "B", 3).map(([, l]) => l),
    "USEX",
    "USEP",
    ...LANE_LINES,
    "CLK",
  ],
  outputs: ["A0", "A1", "A2", "P"],
  initialState: () => ({ a: 0, p: false, clock: false }),
  evaluate: (inputs, state) => {
    const clock = inputs[LANE_INPUTS];
    let { a, p } = state;
    if (clock && !state.clock) {
      const control = {
        ...Object.fromEntries(LANE_LINES.map((line, i) => [line, inputs[8 + i]])),
        shared: toNumber(inputs.slice(3, 6)),
        useX: inputs[6],
        useP: inputs[7],
      } as LaneControl;
      ({ a, p } = laneNext(control, toNumber(inputs.slice(0, 3)), state.a, state.p));
    }
    return {
      outputs: [...toBits(state.a, 3), state.p],
      nextState: a === state.a && p === state.p && clock === state.clock ? state : { a, p, clock },
    };
  },
});

// ---------------------------------------------------------------- shader8

/**
 * The whole unit. RUN gates the clock (GCLK = CLK AND RUN). PC picks a ROM row;
 * the opcode decoder and operand select drive every lane at once. END clears
 * PC, raises WE and moves Y on; Y wrapping from 7 moves T on.
 */
function shader8Circuit(bytes: readonly number[]): Circuit {
  const b = new Builder();
  ports(b, [
    ["run", "RUN"],
    ["clock", "CLK"],
  ]);
  b.add("one", "high", 30, 300, "1");
  b.add("zero", "ground", 30, 380, "0");
  b.gate("gclk", "and", 200, 120, "clock", "run", "GATED CLOCK");

  // Program ROM: one readable byte row per address, read at PC.
  const pc = cellIds("pc", 4);
  const select = b.decoder("addr", pc, 360, 30, undefined, "PC =");
  range(SHADER_ROM_SIZE).forEach((r) => {
    b.add(
      `inst${r}`,
      "input8",
      900,
      30 + r * 120,
      `${hex(r)}: ${disassembleShader(bytes[r] ?? 0)}`,
      {
        numberValue: (bytes[r] ?? 0) & 255,
      },
    );
  });
  const inst = range(8).map((bit) =>
    b.orTree(
      `read${bit}`,
      range(SHADER_ROM_SIZE).map((r) =>
        b.gate(
          `pick${r}-${bit}`,
          "and",
          1060,
          30 + r * 120 + bit * 14,
          [`inst${r}`, bit],
          select[r],
        ),
      ),
      1200,
      30 + bit * 240,
      `INSTRUCTION BIT ${bit}`,
    ),
  );

  // Shared control: decode once, fan out to every lane.
  const op = b.decoder("op", inst.slice(4), 1900, 30, undefined, "OP");
  SHADER_OPS.forEach(({ mnemonic }, code) => {
    const node = b.nodes.find((n) => n.id === `op-sel${code}`);
    if (node) node.label = mnemonic;
  });
  const line = (mnemonic: string) => op[SHADER_OPS.findIndex((o) => o.mnemonic === mnemonic)];
  const end = line("END");
  b.gate("subtract", "or", 2400, 1000, line("SUB"), line("LT"), "SUBTRACT");
  const writes = b.orTree(
    "writes",
    ["LD", "AND", "OR", "XOR", "ADD", "SUB", "SHR", "LT", "EQ"].map(line),
    2400,
    1100,
    "WRITES A",
  );
  b.gate("keep", "not", 2900, 1100, writes, undefined, "KEEP");
  const lines: Ref[] = LANE_LINES.map((name) =>
    name === "SUBTRACT" ? "subtract" : name === "KEEP" ? "keep" : line(name),
  );

  // Operand: immediate when bit 3 is off, else register x, y, t or p.
  b.gate("imm", "not", 1900, 1500, inst[3], undefined, "IMMEDIATE");
  b.gate("not-r2", "not", 1900, 1560, inst[2], undefined);
  b.gate("reg", "and", 2040, 1560, inst[3], "not-r2", "REGISTER");
  b.gate("not-r0", "not", 1900, 1620, inst[0]);
  b.gate("not-r1", "not", 1900, 1680, inst[1]);
  const register = (n: number, name: string) =>
    b.gate(
      `use-${name}`,
      "and",
      2300,
      1560 + n * 60,
      "reg",
      b.gate(
        `is-r${n}`,
        "and",
        2160,
        1560 + n * 60,
        n & 1 ? inst[0] : "not-r0",
        n & 2 ? inst[1] : "not-r1",
      ),
      `USE ${name.toUpperCase()}`,
    );
  const [useX, useY, useT, useP] = ["x", "y", "t", "p"].map((name, n) => register(n, name));
  const shared = range(3).map((bit) => {
    const y = 1900 + bit * 160;
    const fromImm = b.gate(`imm${bit}`, "and", 2160, y, inst[bit], "imm");
    const fromY = b.gate(`from-y${bit}`, "and", 2160, y + 50, `y${bit}`, useY);
    const fromT = b.gate(`from-t${bit}`, "and", 2160, y + 100, `t${bit}`, useT);
    return b.gate(
      `shared${bit}`,
      "or",
      2440,
      y,
      b.gate(`imm-or-y${bit}`, "or", 2300, y, fromImm, fromY),
      fromT,
      `B${bit}`,
    );
  });

  // PC: +1, or 0 after END. Y: +1 after END. T: +1 when Y wraps.
  b.gate("not-end", "not", 360, 1700, end, undefined, "NOT END");
  const counter = (name: string, width: number, carryIn: Ref, y: number, clear?: Ref) => {
    let carry = carryIn;
    for (let bit = 0; bit < width; bit++) {
      const id = `${name}${bit}`;
      const row = y + bit * 140;
      const inc = b.gate(
        `${id}-inc`,
        "xor",
        500,
        row,
        id,
        carry,
        `${name.toUpperCase()}+1 BIT ${bit}`,
      );
      carry = b.gate(`${id}-carry`, "and", 500, row + 60, id, carry);
      b.add(id, "dff", 780, row, `${name.toUpperCase()} BIT ${bit}`);
      b.connect(clear === undefined ? inc : b.gate(`${id}-next`, "and", 640, row, inc, clear), id);
      b.connect("gclk", id, 1);
    }
    return carry;
  };
  counter("pc", 4, "one", 1800, "not-end");
  const wrap = counter("y", 3, end, 2400);
  counter("t", 3, wrap, 2900);

  // Eight lanes, each fed the same lines; only X differs.
  range(SHADER_LANES).forEach((x) => {
    const id = `lane${x}`;
    b.add(id, "module", 3100, 30 + x * 420, `LANE ${x}`, {
      module: laneCircuit(),
      behaviour: "shaderLane",
    });
    [
      ...range(3).map((bit) => ((x >> bit) & 1 ? "one" : "zero")),
      ...shared,
      useX,
      useP,
      ...lines,
      "gclk",
    ].forEach((source, input) => {
      b.connect(source, id, input);
    });
  });

  range(3).forEach((bit) => {
    b.gate(`out-y${bit}`, "lamp", 3500, 30 + bit * 90, `y${bit}`, undefined, `Y${bit}`);
  });
  range(SHADER_LANES).forEach((x) => {
    b.gate(`out-d${x}`, "lamp", 3500, 400 + x * 90, [`lane${x}`, 3], undefined, `D${x}`);
  });
  b.gate("we", "and", 3360, 1200, end, "run", "ROW DONE");
  b.gate("out-we", "lamp", 3500, 1200, "we", undefined, "WE");
  range(3).forEach((bit) => {
    b.gate(`out-t${bit}`, "lamp", 3500, 1400 + bit * 90, `t${bit}`, undefined, `T${bit}`);
  });
  return b.circuit("8-lane shader");
}

/** The program bytes stored in a shader's ROM rows. */
export const shaderBytes = (module: Circuit) =>
  range(SHADER_ROM_SIZE).map(
    (r) => module.nodes.find((n) => n.id === `inst${r}`)?.numberValue ?? 0,
  );

type Shader = ShaderState & { bytes: number[]; clock: boolean };
registerBlock<Shader>({
  name: "shader8",
  inputs: ["RUN", "CLK"],
  outputs: [
    ...range(3).map((bit) => `Y${bit}`),
    ...range(SHADER_LANES).map((x) => `D${x}`),
    "WE",
    ...range(3).map((bit) => `T${bit}`),
  ],
  initialState: (module) => ({ ...initialShaderState(), bytes: shaderBytes(module), clock: false }),
  evaluate: ([run, clock], state) => {
    const gated = run && clock;
    const outputs = [
      ...toBits(state.y, 3),
      ...toBits(state.pixels, SHADER_LANES),
      run && shaderRowReady(state.bytes, state),
      ...toBits(state.t, 3),
    ];
    if (gated === state.clock) return { outputs, nextState: state };
    const next = gated ? shaderStep(state.bytes, state) : state;
    return { outputs, nextState: { ...next, bytes: state.bytes, clock: gated } };
  },
});

// ---------------------------------------------------------------- public API

export const SHADER_BLOCKS = {
  shader8: {
    label: "8-LANE SHADER",
    hint: "Runs one program on 8 lanes at once: lane i computes pixel i of row Y. WE marks a finished row.",
  },
  shaderLane: {
    label: "SHADER LANE",
    hint: "One lane of the shader: a 3-bit accumulator and pixel bit, driven by shared control lines.",
  },
} as const;
export type ShaderKind = keyof typeof SHADER_BLOCKS;

/** The gate form of a shader block. `bytes` is the program, e.g. `compileShader(...).bytes`. */
export function shaderBlockCircuit(kind: ShaderKind, bytes: readonly number[] = []): Circuit {
  if (kind === "shaderLane") return laneCircuit();
  return shader8Circuit(bytes.length ? bytes : compileShader(SAMPLE_SHADERS.STRIPES).bytes);
}

const laneCells = (snapshot: Snapshot, a: number, p: boolean, clock: boolean) => {
  seedCells(snapshot, cellIds("a", 3), a, clock);
  seedCells(snapshot, ["p"], Number(p), clock);
};
const readLane = (snapshot: Snapshot): Lane => ({
  a: readCells(snapshot, cellIds("a", 3)),
  p: Boolean(snapshot.memory.p),
  clock: Boolean(snapshot.lastClock.a0),
});

/** Inner snapshot for unfolding a shader block; see `unfoldBlockState`. */
export function unfoldShaderState(kind: ShaderKind, state: unknown): Snapshot {
  const snapshot = initialSnapshot();
  snapshot.blocks = {};
  if (state == null) return snapshot;
  if (kind === "shaderLane") {
    const { a, p, clock } = state as Lane;
    laneCells(snapshot, a, p, clock);
    return snapshot;
  }
  const { pc, y, t, a, pixels, clock } = state as Shader;
  seedCells(snapshot, cellIds("pc", 4), pc, clock);
  seedCells(snapshot, cellIds("y", 3), y, clock);
  seedCells(snapshot, cellIds("t", 3), t, clock);
  a.forEach((value, x) => {
    snapshot.blocks![`lane${x}`] = {
      a: value,
      p: Boolean((pixels >> x) & 1),
      clock,
    } satisfies Lane;
  });
  return snapshot;
}

/** Reads a shader block's state back out of its gate form; see `foldBlockState`. */
export function foldShaderState(node: Node, kind: ShaderKind, inner: Snapshot): unknown {
  if (kind === "shaderLane") return readLane(inner);
  // A lane may run as gates (unfolded) or as a block; prefer the gates.
  const lanes = range(SHADER_LANES).map((x): Lane => {
    const gates = inner.modules[`lane${x}`];
    if (gates && Object.keys(gates.memory).length) return readLane(gates);
    return (inner.blocks?.[`lane${x}`] as Lane | undefined) ?? { a: 0, p: false, clock: false };
  });
  return {
    pc: readCells(inner, cellIds("pc", 4)),
    y: readCells(inner, cellIds("y", 3)),
    t: readCells(inner, cellIds("t", 3)),
    a: lanes.map((lane) => lane.a),
    pixels: toNumber(lanes.map((lane) => lane.p)),
    bytes: shaderBytes(node.module!),
    clock: Boolean(inner.lastClock.pc0),
  } satisfies Shader;
}
