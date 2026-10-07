// The blitter as a block: a command processor that draws into the 8×8 screen
// on its own. The CPU sets X, Y, COLOUR and ARG, then writes a command; from
// the next clock edge the blitter writes one screen row per tick until the
// command is done, while the CPU keeps fetching and executing.
//
// Like the datapath blocks, outputs come from the state before the clock
// commit, so a screen clocked from the same CLK stores the row the blitter
// shows on each tick it is BUSY.
import {
  type BlitterState,
  blitCommandName,
  blitterClock,
  blitterData,
  blitterRow,
  blitterSource,
  initialBlitter,
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
import { type Circuit, initialSnapshot, registerBlock, type Snapshot } from "./logic";

const INPUTS: [string, string][] = [
  ...busPorts("d", "D"),
  ...busPorts("a", "A", 3),
  ["we", "WE"],
  ...busPorts("r", "R"),
  ["clock", "CLK"],
];
const OUTPUTS = [
  ...range(3).map((bit) => `ROW${bit}`),
  ...range(8).map((bit) => `OUT${bit}`),
  "SWE",
  ...range(8).map((bit) => `SRC${bit}`),
  "BUSY",
  "ROM",
];
/** Output port numbers, for wiring the block into a circuit. */
export const BLITTER_OUTPUTS = {
  row: 0,
  out: 3,
  swe: 11,
  src: 12,
  busy: 20,
  rom: 21,
} as const;

/** Flip-flop groups of the gate form: register name, width. */
const REGISTERS = [
  ["x", 3],
  ["y", 3],
  ["colour", 8],
  ["arg", 8],
] as const;

/**
 * The gate form. Five registers (X, Y, COLOUR, ARG, OP) load from D while the
 * blitter is idle; a valid command also sets BUSY. While BUSY, the step
 * counter I counts up to the command's last step L, then BUSY clears. ROW,
 * the pixel column and OUT are chosen per command from I, X + I and Y + I; a
 * column decoder and one mux per bit change a single pixel of Q, the row read
 * back from the screen. SRC = ARG + I addresses the sprite byte in code ROM.
 *
 * R is the one byte the blitter reads each tick: the screen row at ROW, or,
 * while ROM is on (COPY SPRITE), the code ROM byte at SRC. One shared input
 * keeps the block inside the builder's 24-input limit.
 */
function blitterCircuit(): Circuit {
  const b = new Builder();
  ports(b, INPUTS);
  const not = (id: string, a: Ref, x: number, y: number, label?: string) =>
    b.gate(id, "not", x, y, a, undefined, label);
  const and = (id: string, a: Ref, c: Ref, x: number, y: number, label?: string) =>
    b.gate(id, "and", x, y, a, c, label);
  const or = (id: string, a: Ref, c: Ref, x: number, y: number, label?: string) =>
    b.gate(id, "or", x, y, a, c, label);
  const xor = (id: string, a: Ref, c: Ref, x: number, y: number, label?: string) =>
    b.gate(id, "xor", x, y, a, c, label);
  const cell = (id: string, next: Ref, x: number, y: number, label: string) => {
    b.add(id, "dff", x, y, label);
    b.connect(next, id);
    b.connect("clock", id, 1);
    return id;
  };
  /** One-hot lines for a 3-bit value. */
  const decode3 = (prefix: string, bits: Ref[], x: number, y: number, labels: string[]) => {
    const inverted = bits.map((bit, i) => not(`${prefix}-not${i}`, bit, x, y + i * 60));
    return range(8).map((value) => {
      const pick = (i: number) => ((value >> i) & 1 ? bits[i] : inverted[i]);
      const low = and(`${prefix}-p${value}`, pick(0), pick(1), x + 140, y + value * 70);
      return and(`${prefix}-sel${value}`, low, pick(2), x + 280, y + value * 70, labels[value]);
    });
  };
  /** A + B for 3-bit A and B, wrapping. */
  const add3 = (prefix: string, a: Ref[], c: Ref[], x: number, y: number, label: string) => {
    const half = range(3).map((bit) => xor(`${prefix}-h${bit}`, a[bit], c[bit], x, y + bit * 120));
    const carry1 = and(`${prefix}-c1`, a[0], c[0], x, y + 360);
    const both1 = and(`${prefix}-b1`, a[1], c[1], x, y + 420);
    const pass1 = and(`${prefix}-p1`, half[1], carry1, x + 140, y + 420);
    const carry2 = or(`${prefix}-c2`, both1, pass1, x + 280, y + 420);
    return [
      half[0],
      xor(`${prefix}-s1`, half[1], carry1, x + 140, y + 120, `${label} BIT 1`),
      xor(`${prefix}-s2`, half[2], carry2, x + 420, y + 240, `${label} BIT 2`),
    ];
  };
  const d = cellIds("d");
  const i = cellIds("i", 3);

  // Register writes: only while idle.
  b.gate("idle", "not", 200, 900, "busy", undefined, "IDLE");
  const write = and("wen", "we", "idle", 340, 900, "WRITE WHILE IDLE");
  const select = decode3("reg", cellIds("a", 3), 200, 1000, [
    "X (E0)",
    "Y (E1)",
    "COLOUR (E2)",
    "ARG (E3)",
    "CMD (E4)",
  ]);
  const register = (name: string, width: number, which: number, top: number) => {
    const load = and(`load-${name}`, write, select[which], 600, top, `LOAD ${name.toUpperCase()}`);
    const keep = not(`keep-${name}`, load, 740, top + 60);
    return range(width).map((bit) => {
      const y = top + bit * 90;
      const fresh = and(`${name}-w${bit}`, d[bit], load, 880, y);
      const kept = and(`${name}-k${bit}`, `${name}${bit}`, keep, 880, y + 40);
      const next = or(`${name}-n${bit}`, fresh, kept, 1020, y);
      return cell(`${name}${bit}`, next, 1160, y, `${name.toUpperCase()} BIT ${bit}`);
    });
  };
  let top = 30;
  const stored: Record<string, Ref[]> = {};
  for (const [which, [name, width]] of REGISTERS.entries()) {
    stored[name] = register(name, width, which, top);
    top += width * 90 + 60;
  }
  const op = register("op", 3, 4, top);
  const [x, y, colour, arg] = REGISTERS.map(([name]) => stored[name]);

  // Which command: decoded from OP. A write of 1–6 to CMD starts one.
  const command = decode3("cmd", op, 1400, 30, [
    "NO COMMAND",
    "CLEAR",
    "FILL ROW",
    "HLINE",
    "VLINE",
    "SET PIXEL",
    "COPY SPRITE",
    "NO COMMAND",
  ]);
  const [, isClear, isFill, isHline, isVline, isPixel, isSprite] = command;
  const anyBit = or("cmd-any", or("cmd-any01", d[0], d[1], 1400, 700), d[2], 1540, 700);
  const allBits = and("cmd-all", and("cmd-all01", d[0], d[1], 1400, 760), d[2], 1540, 760);
  const valid = and("cmd-valid", anyBit, not("cmd-not7", allBits, 1680, 760), 1820, 700, "1–6");
  const start = and("start", "load-op", valid, 1960, 700, "START");

  // The last step L: 7 for CLEAR and SPRITE, ARG − 1 for lines, 0 otherwise.
  const allRows = or("all-rows", isClear, isSprite, 1400, 900, "8 ROWS");
  const line = or("line", isHline, isVline, 1400, 960, "LINE");
  const lowArg = not("arg-dec0", arg[0], 1400, 1020, "ARG − 1 BIT 0");
  const borrow2 = and("arg-borrow2", not("arg-not1", arg[1], 1400, 1080), lowArg, 1540, 1080);
  const argLess = [
    lowArg,
    xor("arg-dec1", arg[1], lowArg, 1540, 1020, "ARG − 1 BIT 1"),
    xor("arg-dec2", arg[2], borrow2, 1680, 1080, "ARG − 1 BIT 2"),
  ];
  const last = range(3).map((bit) =>
    or(
      `last${bit}`,
      allRows,
      and(`last-line${bit}`, line, argLess[bit], 1820, 1000 + bit * 60),
      1960,
      1000 + bit * 60,
      `L BIT ${bit}`,
    ),
  );
  const same = range(3).map((bit) =>
    not(
      `i-eq${bit}`,
      xor(`i-diff${bit}`, i[bit], last[bit], 2100, 1000 + bit * 60),
      2240,
      1000 + bit * 60,
    ),
  );
  const atLast = and(
    "at-last",
    and("at-last01", same[0], same[1], 2380, 1000),
    same[2],
    2520,
    1000,
    "I = L",
  );
  const more = and("more", "busy", not("not-last", atLast, 2660, 1060), 2800, 1000, "MORE STEPS");
  cell("busy", or("busy-next", more, start, 2940, 900), 3080, 900, "BUSY");

  // Step counter: I + 1 while there are more steps, else back to 0.
  const carry2 = and("i-c2", i[1], i[0], 1400, 1300);
  const plusOne = [
    not("i-inc0", i[0], 1540, 1240),
    xor("i-inc1", i[1], i[0], 1540, 1300),
    xor("i-inc2", i[2], carry2, 1540, 1360),
  ];
  range(3).forEach((bit) => {
    cell(
      i[bit],
      and(`i-n${bit}`, more, plusOne[bit], 1680, 1240 + bit * 60),
      1820,
      1240 + bit * 60,
      `I BIT ${bit}`,
    );
  });

  // Where to draw: ROW and the pixel column.
  const yPlus = add3("yi", y, i, 2100, 1300, "Y + I");
  const xPlus = add3("xi", x, i, 2100, 1800, "X + I");
  const rowFromY = or(
    "row-y",
    or("row-y01", isFill, isHline, 2700, 1300),
    isPixel,
    2840,
    1300,
    "ROW = Y",
  );
  const rowFromSum = or("row-yi", isVline, isSprite, 2700, 1400, "ROW = Y + I");
  const row = range(3).map((bit) => {
    const at = 1500 + bit * 140;
    const fromI = and(`row-i${bit}`, isClear, i[bit], 3000, at);
    const fromY = and(`row-from-y${bit}`, rowFromY, y[bit], 3000, at + 40);
    const fromSum = and(`row-from-yi${bit}`, rowFromSum, yPlus[bit], 3000, at + 80);
    return or(
      `row${bit}`,
      or(`row-a${bit}`, fromI, fromY, 3140, at),
      fromSum,
      3280,
      at,
      `ROW BIT ${bit}`,
    );
  });
  const columnFromX = or("col-x", isVline, isPixel, 2700, 1900, "COLUMN = X");
  const column = range(3).map((bit) =>
    or(
      `col${bit}`,
      and(`col-xi${bit}`, isHline, xPlus[bit], 3000, 1900 + bit * 90),
      and(`col-from-x${bit}`, columnFromX, x[bit], 3000, 1940 + bit * 90),
      3140,
      1900 + bit * 90,
      `COLUMN BIT ${bit}`,
    ),
  );
  const columnSelect = decode3(
    "col",
    column,
    3300,
    1900,
    range(8).map((n) => `COLUMN ${n}`),
  );

  // What to draw: COLOUR, Q with one pixel changed, or the sprite byte R.
  const wholeRow = or("whole-row", isClear, isFill, 3700, 30, "ROW = COLOUR");
  const plotting = or("plotting", line, isPixel, 3700, 90, "ONE PIXEL");
  const out = range(8).map((bit) => {
    const at = 200 + bit * 200;
    const kept = and(
      `old${bit}`,
      `r${bit}`,
      not(`keep-px${bit}`, columnSelect[bit], 3700, at + 40),
      3840,
      at + 40,
    );
    const pixel = or(
      `px${bit}`,
      and(`new${bit}`, colour[0], columnSelect[bit], 3840, at),
      kept,
      3980,
      at,
      `PIXEL ROW BIT ${bit}`,
    );
    const fill = and(`out-fill${bit}`, wholeRow, colour[bit], 4120, at);
    const plot = and(`out-plot${bit}`, plotting, pixel, 4120, at + 40);
    const copy = and(`out-copy${bit}`, isSprite, `r${bit}`, 4120, at + 80);
    return or(
      `out${bit}`,
      or(`out-a${bit}`, fill, plot, 4260, at),
      copy,
      4400,
      at,
      `OUT BIT ${bit}`,
    );
  });

  // SRC = ARG + I: an 8-bit adder whose upper five I bits are 0.
  let carry: Ref | null = null;
  const source = range(8).map((bit) => {
    const at = 1900 + bit * 120;
    if (bit < 3) {
      const half = xor(`src-h${bit}`, arg[bit], i[bit], 3700, at);
      const sum = carry === null ? half : xor(`src-s${bit}`, half, carry, 3840, at);
      const both = and(`src-b${bit}`, arg[bit], i[bit], 3700, at + 50);
      carry =
        carry === null
          ? both
          : or(`src-c${bit}`, both, and(`src-p${bit}`, half, carry, 3840, at + 50), 3980, at + 50);
      return sum;
    }
    const sum = xor(`src-s${bit}`, arg[bit], carry!, 3840, at);
    carry = and(`src-c${bit}`, arg[bit], carry!, 3980, at + 50);
    return sum;
  });

  row.forEach((bit, n) => {
    b.gate(`row-out${n}`, "lamp", 4600, 30 + n * 90, bit, undefined, `ROW${n}`);
  });
  out.forEach((bit, n) => {
    b.gate(`out-lamp${n}`, "lamp", 4600, 330 + n * 90, bit, undefined, `OUT${n}`);
  });
  b.gate("swe", "lamp", 4600, 1100, "busy", undefined, "SWE");
  source.forEach((bit, n) => {
    b.gate(`src-out${n}`, "lamp", 4600, 1200 + n * 90, bit, undefined, `SRC${n}`);
  });
  b.gate("busy-out", "lamp", 4600, 2000, "busy", undefined, "BUSY");
  b.gate("rom-out", "lamp", 4600, 2100, isSprite, undefined, "ROM");
  return b.circuit("Blitter");
}

type Blitter = BlitterState & { clock: boolean };

registerBlock<Blitter>({
  name: "blitter",
  inputs: INPUTS.map(([, label]) => label),
  outputs: OUTPUTS,
  initialState: () => ({ ...initialBlitter(), clock: false }),
  evaluate: (inputs, state) => {
    const data = toNumber(inputs.slice(0, 8));
    const register = toNumber(inputs.slice(8, 11));
    const we = inputs[11];
    const read = toNumber(inputs.slice(12, 20));
    const clock = inputs[20];
    const outputs = [
      ...toBits(blitterRow(state), 3),
      ...toBits(blitterData(state, read, read), 8),
      state.busy,
      ...toBits(blitterSource(state), 8),
      state.busy,
      blitCommandName(state.op) === "sprite",
    ];
    if (clock === state.clock) return { outputs, nextState: state };
    const next = clock ? blitterClock(state, we ? { register, value: data } : null) : state;
    return { outputs, nextState: { ...next, clock } };
  },
});

export const BLITTER_BLOCKS = {
  blitter: {
    label: "BLITTER",
    hint: "Set X (E0), Y (E1), COLOUR (E2) and ARG (E3), then write a command to CMD (E4): 1 CLEAR, 2 FILL ROW, 3 HLINE, 4 VLINE, 5 SET PIXEL, 6 COPY SPRITE from code ROM at ARG. While BUSY it writes one screen row per clock edge and has priority: ROW, OUT and SWE drive the screen, register writes are ignored, and CPU screen writes are lost. Poll BUSY before touching the screen. R reads the screen row at ROW, or the code ROM byte at SRC while ROM is on.",
  },
} as const;
export type BlitterKind = keyof typeof BLITTER_BLOCKS;

export const blitterBlockCircuit = (_kind: BlitterKind): Circuit => blitterCircuit();

const GROUPS = [...REGISTERS, ["op", 3], ["i", 3]] as const;
const FIELDS = { x: "x", y: "y", colour: "colour", arg: "arg", op: "op", i: "i" } as const;

/** Inner snapshot for unfolding the blitter; see `unfoldBlockState`. */
export function unfoldBlitterState(state: unknown): Snapshot {
  const snapshot = initialSnapshot();
  snapshot.blocks = {};
  if (state == null) return snapshot;
  const blitter = state as Blitter;
  for (const [name, width] of GROUPS)
    seedCells(snapshot, cellIds(name, width), blitter[FIELDS[name]], blitter.clock);
  seedCells(snapshot, ["busy"], Number(blitter.busy), blitter.clock);
  return snapshot;
}

/** Reads the blitter's state back out of its gate form; see `foldBlockState`. */
export function foldBlitterState(inner: Snapshot): Blitter {
  const read = (name: keyof typeof FIELDS, width: number) => readCells(inner, cellIds(name, width));
  return {
    x: read("x", 3),
    y: read("y", 3),
    colour: read("colour", 8),
    arg: read("arg", 8),
    op: read("op", 3),
    i: read("i", 3),
    busy: Boolean(inner.memory.busy),
    clock: Boolean(inner.lastClock.busy),
  };
}
