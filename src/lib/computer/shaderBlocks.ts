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
  initialShaderStateFor,
  LANE_LINES,
  type LaneControl,
  type LaneLine,
  laneNext,
  SAMPLE_SHADERS,
  SHADER_LANES,
  SHADER_OPS,
  SHADER_ROM_SIZE,
  type ShaderShape,
  type ShaderState,
  shaderRowReady,
  shaderStep,
} from "./shader";

const laneIds = LANE_LINES.map((line) => line.toLowerCase());

// ---------------------------------------------------------------- shaderLane

/** Lines a wide lane takes; it derives SUBTRACT and KEEP itself (see laneCircuit). */
const WIDE_LANE_LINES = LANE_LINES.filter((line) => line !== "SUBTRACT" && line !== "KEEP");
const lanePorts = (width: number): [string, string][] => [
  ...busPorts("x", "X", width),
  ...busPorts("bs", "B", width),
  ["usex", "USEX"],
  ["usep", "USEP"],
  ...(width === 3 ? LANE_LINES : WIDE_LANE_LINES).map((line): [string, string] => [
    line.toLowerCase(),
    line,
  ]),
  ["clock", "CLK"],
];

/**
 * One lane: a `width`-bit accumulator A, a pixel bit P and a small ALU. B is
 * the shared operand, plus the lane's own x or p when USEX or USEP is on.
 *
 * The 3-bit lane takes every control line from the unit. A 5-bit lane has 4
 * more X and B inputs, so to stay inside the builder's 24 inputs it derives
 * SUBTRACT (SUB or LT) and KEEP (no op writes A) from the op lines itself.
 */
function laneCircuit(width = 3): Circuit {
  const b = new Builder();
  ports(b, lanePorts(width));
  if (width !== 3) {
    b.gate("subtract", "or", 200, 1500, "sub", "lt", "SUBTRACT");
    const writes = b.orTree(
      "writes",
      ["ld", "and", "or", "xor", "add", "sub", "shr", "lt", "eq"],
      200,
      1600,
      "WRITES A",
    );
    b.gate("keep", "not", 500, 1600, writes, undefined, "KEEP");
  }
  const operand = range(width).map((bit) => {
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
  for (let bit = 0; bit < width; bit++) {
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
  const low = 30 + width * 420;
  b.gate("below", "not", 1360, low, carry, undefined, "A < B");
  const differ = b.orTree("differ", diff, 1080, low + 60, "A ≠ B");
  b.gate("same", "not", 1360, low + 100, differ, undefined, "A = B");
  // Shift right by B: one stage per B bit that can still keep a bit (by 1, 2, 4, …),
  // and zero when a higher B bit is on.
  const not = range(width).map((bit) =>
    b.gate(`not-b${bit}`, "not", 640, low + 200 + bit * 60, operand[bit], undefined, `NOT B${bit}`),
  );
  const mux = (id: string, y: number, sel: number, lo: Ref, hi?: Ref) => {
    const keep = b.gate(`${id}-lo`, "and", 800, y, lo, not[sel]);
    return hi === undefined
      ? keep
      : b.gate(id, "or", 940, y, keep, b.gate(`${id}-hi`, "and", 800, y + 30, hi, operand[sel]));
  };
  const stages = range(width).filter((k) => 1 << k < width);
  let shifted: Ref[] = range(width).map((bit) => `a${bit}`);
  for (const k of stages) {
    const by = 1 << k;
    const from = shifted;
    shifted = range(width).map((bit) =>
      mux(
        `shr${by}-${bit}`,
        low + 400 + k * 250 + bit * 70,
        k,
        from[bit],
        bit + by < width ? from[bit + by] : undefined,
      ),
    );
  }
  const high = range(width).filter((k) => !stages.includes(k));
  const zero =
    high.length === 1
      ? not[high[0]]
      : b.gate(
          "shr-high-none",
          "not",
          940,
          low + 1200,
          b.orTree(
            "shr-high",
            high.map((k) => operand[k]),
            800,
            low + 1200,
          ),
        );
  const shr = range(width).map((bit) =>
    b.gate(`shr${bit}`, "and", 1080, low + 900 + bit * 70, shifted[bit], zero, `SHR ${bit}`),
  );
  b.gate("arith", "or", 1220, 1500, "add", "sub", "ADD OR SUB");
  // Each line picks its result; KEEP holds A when no line writes it.
  for (let bit = 0; bit < width; bit++) {
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
  b.gate("not-set", "not", 1900, low, "set", undefined, "NOT SET");
  const write = b.gate("set-p", "and", 2040, low - 40, "a0", "set", "P ← A0");
  const hold = b.gate("hold-p", "and", 2040, low + 40, "p", "not-set");
  b.gate("next-p", "or", 2160, low, write, hold);
  b.add("p", "dff", 2200, low, "PIXEL");
  b.connect("next-p", "p");
  b.connect("clock", "p", 1);
  b.gate("out-p", "lamp", 2400, low, "p", undefined, "P");
  return b.circuit(width === 3 ? "Shader lane" : `${width}-bit shader lane`);
}

type Lane = { a: number; p: boolean; clock: boolean };
for (const [name, width] of [
  ["shaderLane", 3],
  ["shaderLane5", 5],
] as const) {
  const lines = width === 3 ? LANE_LINES : WIDE_LANE_LINES;
  const clockAt = 2 * width + 2 + lines.length;
  registerBlock<Lane>({
    name,
    inputs: lanePorts(width).map(([, label]) => label),
    outputs: [...range(width).map((bit) => `A${bit}`), "P"],
    initialState: () => ({ a: 0, p: false, clock: false }),
    evaluate: (inputs, state) => {
      const clock = inputs[clockAt];
      let { a, p } = state;
      if (clock && !state.clock) {
        const on = Object.fromEntries(
          lines.map((line, i) => [line, inputs[2 * width + 2 + i]]),
        ) as Record<LaneLine, boolean>;
        if (width !== 3) {
          on.SUBTRACT = on.SUB || on.LT;
          on.KEEP = !["LD", "AND", "OR", "XOR", "ADD", "SUB", "SHR", "LT", "EQ"].some(
            (line) => on[line as LaneLine],
          );
        }
        const control = {
          ...on,
          shared: toNumber(inputs.slice(width, 2 * width)),
          useX: inputs[2 * width],
          useP: inputs[2 * width + 1],
        } as LaneControl;
        ({ a, p } = laneNext(
          control,
          toNumber(inputs.slice(0, width)),
          state.a,
          state.p,
          (1 << width) - 1,
        ));
      }
      return {
        outputs: [...toBits(state.a, width), state.p],
        nextState:
          a === state.a && p === state.p && clock === state.clock ? state : { a, p, clock },
      };
    },
  });
}

// ---------------------------------------------------------------- shader8

/**
 * The whole unit. RUN gates the clock (GCLK = CLK AND RUN). PC picks a ROM row;
 * the opcode decoder and operand select drive every lane at once. END clears
 * PC, raises WE and moves Y on; Y wrapping from 7 moves T on.
 */
function shader8Circuit(bytes: readonly number[], wide = false): Circuit {
  /** Value bits: 3 on the 8×8 unit, 5 on the 32×32 one. */
  const width = wide ? 5 : 3;
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
  // Immediates are 3 bits; the upper value bits come from y or t only.
  const shared = range(width).map((bit) => {
    const y = 1900 + bit * 160;
    const fromImm = bit < 3 ? b.gate(`imm${bit}`, "and", 2160, y, inst[bit], "imm") : "zero";
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
  // The 32×32 unit's 8 lanes cover a row in 4 passes: END moves PASS on, and Y after the last.
  const rowDone = wide ? counter("pass", 2, end, 2200) : end;
  const wrap = counter("y", width, rowDone, 2600);
  counter("t", width, wrap, 2600 + width * 140);

  // Eight lanes, each fed the same lines; only X differs.
  // Lane i's x is its own number, plus PASS × 8 on the 32×32 unit: only wires.
  range(SHADER_LANES).forEach((x) => {
    const id = `lane${x}`;
    b.add(id, "module", 3100, 30 + x * 420, `LANE ${x}`, {
      module: laneCircuit(width),
      behaviour: wide ? "shaderLane5" : "shaderLane",
    });
    [
      ...range(3).map((bit) => ((x >> bit) & 1 ? "one" : "zero")),
      ...(wide ? ["pass0", "pass1"] : []),
      ...shared,
      useX,
      useP,
      ...(wide ? lines.filter((_, n) => !["SUBTRACT", "KEEP"].includes(LANE_LINES[n])) : lines),
      "gclk",
    ].forEach((source, input) => {
      b.connect(source, id, input);
    });
  });

  // Out: the frame byte address (PASS, then Y) on the 32×32 unit, else Y.
  const where = wide ? ["pass0", "pass1", ...cellIds("y", width)] : cellIds("y", width);
  where.forEach((bit, n) => {
    b.gate(`out-y${n}`, "lamp", 3500, 30 + n * 90, bit, undefined, wide ? `A${n}` : `Y${n}`);
  });
  range(SHADER_LANES).forEach((x) => {
    b.gate(`out-d${x}`, "lamp", 3500, 700 + x * 90, [`lane${x}`, width], undefined, `D${x}`);
  });
  b.gate("we", "and", 3360, 1500, end, "run", wide ? "BYTE DONE" : "ROW DONE");
  b.gate("out-we", "lamp", 3500, 1500, "we", undefined, "WE");
  range(width).forEach((bit) => {
    b.gate(`out-t${bit}`, "lamp", 3500, 1700 + bit * 90, `t${bit}`, undefined, `T${bit}`);
  });
  return b.circuit(wide ? "8-lane shader, 32×32" : "8-lane shader");
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

/** The 32×32 unit: 8 lanes, so each row takes 4 passes and END writes one frame byte. */
export const SHADER_32X32: ShaderShape = { width: 32, height: 32, lanes: SHADER_LANES };
registerBlock<Shader>({
  name: "shader32x32",
  inputs: ["RUN", "CLK"],
  outputs: [
    ...range(7).map((bit) => `A${bit}`),
    ...range(SHADER_LANES).map((x) => `D${x}`),
    "WE",
    ...range(5).map((bit) => `T${bit}`),
  ],
  initialState: (module) => ({
    ...initialShaderStateFor(SHADER_32X32),
    bytes: shaderBytes(module),
    clock: false,
  }),
  evaluate: ([run, clock], state) => {
    const gated = run && clock;
    const outputs = [
      ...toBits(state.pass ?? 0, 2),
      ...toBits(state.y, 5),
      ...toBits(state.pixels, SHADER_LANES),
      run && shaderRowReady(state.bytes, state),
      ...toBits(state.t, 5),
    ];
    if (gated === state.clock) return { outputs, nextState: state };
    const next = gated ? shaderStep(state.bytes, state, SHADER_32X32) : state;
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
  shader32x32: {
    label: "32×32 SHADER",
    hint: "The same 8 lanes on a 32×32 screen: values are 5 bits, and each row takes 4 passes, lane i of pass c computing pixel x = 8c + i. Each END writes one frame byte: wire A, D and WE to a 32×32 screen. Four times the pixels per row, four times the ticks: more lanes would cut that, at the price of a wider memory port.",
  },
  shaderLane5: {
    label: "5-BIT SHADER LANE",
    hint: "One lane of the 32×32 shader: a 5-bit accumulator and pixel bit. It works out SUBTRACT and KEEP from the op lines itself, so it fits the builder's 24 inputs.",
  },
} as const;
export type ShaderKind = keyof typeof SHADER_BLOCKS;
const isWide = (kind: ShaderKind) => kind === "shader32x32" || kind === "shaderLane5";
const widthOf = (kind: ShaderKind) => (isWide(kind) ? 5 : 3);

/** The gate form of a shader block. `bytes` is the program, e.g. `compileShader(...).bytes`. */
export function shaderBlockCircuit(kind: ShaderKind, bytes: readonly number[] = []): Circuit {
  if (kind === "shaderLane" || kind === "shaderLane5") return laneCircuit(widthOf(kind));
  return shader8Circuit(
    bytes.length ? bytes : compileShader(SAMPLE_SHADERS.STRIPES).bytes,
    kind === "shader32x32",
  );
}

const laneCells = (snapshot: Snapshot, width: number, a: number, p: boolean, clock: boolean) => {
  seedCells(snapshot, cellIds("a", width), a, clock);
  seedCells(snapshot, ["p"], Number(p), clock);
};
const readLane = (snapshot: Snapshot, width: number): Lane => ({
  a: readCells(snapshot, cellIds("a", width)),
  p: Boolean(snapshot.memory.p),
  clock: Boolean(snapshot.lastClock.a0),
});

/** Inner snapshot for unfolding a shader block; see `unfoldBlockState`. */
export function unfoldShaderState(kind: ShaderKind, state: unknown): Snapshot {
  const snapshot = initialSnapshot();
  snapshot.blocks = {};
  if (state == null) return snapshot;
  const width = widthOf(kind);
  if (kind === "shaderLane" || kind === "shaderLane5") {
    const { a, p, clock } = state as Lane;
    laneCells(snapshot, width, a, p, clock);
    return snapshot;
  }
  const { pc, y, t, pass, a, pixels, clock } = state as Shader;
  seedCells(snapshot, cellIds("pc", 4), pc, clock);
  seedCells(snapshot, cellIds("y", width), y, clock);
  seedCells(snapshot, cellIds("t", width), t, clock);
  if (kind === "shader32x32") seedCells(snapshot, cellIds("pass", 2), pass ?? 0, clock);
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
  const width = widthOf(kind);
  if (kind === "shaderLane" || kind === "shaderLane5") return readLane(inner, width);
  // A lane may run as gates (unfolded) or as a block; prefer the gates.
  const lanes = range(SHADER_LANES).map((x): Lane => {
    const gates = inner.modules[`lane${x}`];
    if (gates && Object.keys(gates.memory).length) return readLane(gates, width);
    return (inner.blocks?.[`lane${x}`] as Lane | undefined) ?? { a: 0, p: false, clock: false };
  });
  return {
    pc: readCells(inner, cellIds("pc", 4)),
    y: readCells(inner, cellIds("y", width)),
    t: readCells(inner, cellIds("t", width)),
    ...(kind === "shader32x32" ? { pass: readCells(inner, cellIds("pass", 2)) } : {}),
    a: lanes.map((lane) => lane.a),
    pixels: toNumber(lanes.map((lane) => lane.p)),
    bytes: shaderBytes(node.module!),
    clock: Boolean(inner.lastClock.pc0),
  } satisfies Shader;
}
