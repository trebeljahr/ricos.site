// A tiny SIMD "shader" ISA: one instruction stream drives 8 lanes, and lane i
// computes pixel i of the current row in the same tick. That is the idea that
// makes a GPU a GPU, shrunk to 3-bit values.
//
// Each lane has a 3-bit accumulator A and a pixel bit P. An instruction reads
// one operand B: an immediate 0–7, or a register: x (the lane index), y (the
// row, shared), t (the frame counter, shared) or p (the lane's own pixel bit).
//
// Encoding, one byte per instruction: bits 7–4 opcode, bit 3 register mode,
// bits 2–0 the immediate or register number. 0x00 is END, so an empty ROM row
// ends the row. END writes the pixel row out and moves to the next row.

export const SHADER_OPS = [
  { mnemonic: "END", operand: false, effect: "write the row out, go to the next row" },
  { mnemonic: "LD", operand: true, effect: "A ← B" },
  { mnemonic: "AND", operand: true, effect: "A ← A AND B" },
  { mnemonic: "OR", operand: true, effect: "A ← A OR B" },
  { mnemonic: "XOR", operand: true, effect: "A ← A XOR B" },
  { mnemonic: "ADD", operand: true, effect: "A ← A + B (wraps at 8)" },
  { mnemonic: "SUB", operand: true, effect: "A ← A − B (wraps at 8)" },
  { mnemonic: "SHR", operand: true, effect: "A ← A shifted right by B" },
  { mnemonic: "LT", operand: true, effect: "A ← 1 if A < B, else 0" },
  { mnemonic: "EQ", operand: true, effect: "A ← 1 if A = B, else 0" },
  { mnemonic: "SET", operand: false, effect: "P ← bit 0 of A" },
] as const;
export type ShaderMnemonic = (typeof SHADER_OPS)[number]["mnemonic"];
export const shaderOpcode = (mnemonic: ShaderMnemonic) =>
  SHADER_OPS.findIndex((op) => op.mnemonic === mnemonic);

/** Register operands, by register number. Numbers 4–7 read as 0. */
export const SHADER_REGISTERS = ["x", "y", "t", "p"] as const;
export const SHADER_LANES = 8;
/** ROM rows; a program plus its END must fit. */
export const SHADER_ROM_SIZE = 16;
const MASK = 7;

export type ShaderInstruction = {
  address: number;
  byte: number;
  mnemonic: ShaderMnemonic;
  operand: string | null;
  line: number;
};
export type CompiledShader = { instructions: ShaderInstruction[]; bytes: number[] };

function fail(line: number, message: string): never {
  throw new Error(`Line ${line}: ${message}`);
}

/** Readable text for one instruction byte, e.g. "XOR y" or "ADD 3". */
export function disassembleShader(byte: number): string {
  const op = SHADER_OPS[byte >> 4];
  if (!op) return `?? ${(byte >> 4).toString(16).toUpperCase()}`;
  if (!op.operand) return op.mnemonic;
  const value = byte & MASK;
  return `${op.mnemonic} ${byte & 8 ? (SHADER_REGISTERS[value] ?? `r${value}`) : value}`;
}

/**
 * Assembles one instruction per line: a mnemonic, then for most ops an operand
 * (x, y, t, p or a number 0–7). `;` and `#` start comments. An END is added
 * when the program has none; it must be the last instruction.
 */
export function compileShader(source: string): CompiledShader {
  const instructions: ShaderInstruction[] = [];
  const lines = source.split("\n");
  for (const [index, raw] of lines.entries()) {
    const line = index + 1;
    const text = raw.replace(/[;#].*$/, "").trim();
    if (!text) continue;
    const [word, operand, ...rest] = text.split(/[\s,]+/);
    const mnemonic = word.toUpperCase();
    const opcode = SHADER_OPS.findIndex((op) => op.mnemonic === mnemonic);
    if (opcode < 0)
      fail(
        line,
        `Unknown instruction “${word}”. Use ${SHADER_OPS.map((op) => op.mnemonic).join(", ")}.`,
      );
    const op = SHADER_OPS[opcode];
    if (rest.length) fail(line, `${op.mnemonic} takes at most one operand.`);
    if (instructions.at(-1)?.mnemonic === "END") fail(line, "Nothing runs after END.");
    let low = 0;
    if (op.operand) {
      if (operand === undefined) fail(line, `${op.mnemonic} needs an operand: x, y, t, p or 0–7.`);
      const register = SHADER_REGISTERS.indexOf(
        operand.toLowerCase() as (typeof SHADER_REGISTERS)[number],
      );
      if (register >= 0) low = 8 | register;
      else if (/^\d+$/.test(operand) && Number(operand) <= MASK) low = Number(operand);
      else fail(line, `Operand “${operand}” must be x, y, t, p or a number 0–7.`);
    } else if (operand !== undefined) fail(line, `${op.mnemonic} takes no operand.`);
    if (instructions.length >= SHADER_ROM_SIZE)
      fail(line, `A shader holds at most ${SHADER_ROM_SIZE} instructions, END included.`);
    const byte = (opcode << 4) | low;
    instructions.push({
      address: instructions.length,
      byte,
      mnemonic: op.mnemonic,
      operand: op.operand ? disassembleShader(byte).split(" ")[1] : null,
      line,
    });
  }
  if (instructions.at(-1)?.mnemonic !== "END") {
    if (instructions.length >= SHADER_ROM_SIZE)
      fail(
        lines.length,
        `No room for the closing END: at most ${SHADER_ROM_SIZE - 1} instructions before it.`,
      );
    instructions.push({
      address: instructions.length,
      byte: 0,
      mnemonic: "END",
      operand: null,
      line: lines.length,
    });
  }
  const bytes = Array<number>(SHADER_ROM_SIZE).fill(0);
  for (const { address, byte } of instructions) bytes[address] = byte;
  return { instructions, bytes };
}

/** The example shaders. */
export const SAMPLE_SHADERS = {
  /** (x XOR y) AND 1. */
  CHECKER: "LD x\nXOR y\nAND 1\nSET",
  /** Diagonal stripes two pixels wide that move one pixel per frame. */
  STRIPES: "LD x\nADD y\nADD t\nSHR 1\nAND 1\nSET",
  /** A 4×4 square from (2, 2) to (5, 5): x − 2 < 4 and y − 2 < 4. */
  SQUARE: "LD x\nSUB 2\nLT 4\nSET\nLD y\nSUB 2\nLT 4\nAND p\nSET",
} as const;

// ---------------------------------------------------------------- lane

/**
 * The decoded control lines every lane receives, in lane port order. One per
 * ALU op, SET, and two shared helpers: SUBTRACT (SUB or LT: invert B, carry in)
 * and KEEP (no op writes A).
 */
export const LANE_LINES = [
  "LD",
  "AND",
  "OR",
  "XOR",
  "ADD",
  "SUB",
  "SHR",
  "LT",
  "EQ",
  "SET",
  "SUBTRACT",
  "KEEP",
] as const;
export type LaneLine = (typeof LANE_LINES)[number];
export type LaneControl = Record<LaneLine, boolean> & {
  /** The shared part of B: the immediate, y or t. */
  shared: number;
  useX: boolean;
  useP: boolean;
};
const WRITES_A: LaneLine[] = ["LD", "AND", "OR", "XOR", "ADD", "SUB", "SHR", "LT", "EQ"];

/** Decodes an instruction byte into the lines the shared control sends to every lane. */
export function decodeShader(byte: number, y: number, t: number): LaneControl {
  const mnemonic = SHADER_OPS[byte >> 4]?.mnemonic;
  const lines = Object.fromEntries(LANE_LINES.map((line) => [line, line === mnemonic])) as Record<
    LaneLine,
    boolean
  >;
  lines.SUBTRACT = lines.SUB || lines.LT;
  lines.KEEP = !WRITES_A.some((line) => lines[line]);
  const register = byte & 8 ? byte & MASK : -1;
  return {
    ...lines,
    shared: register < 0 ? byte & MASK : register === 1 ? y : register === 2 ? t : 0,
    useX: register === 0,
    useP: register === 3,
  };
}

/**
 * One lane's next A and P. Each active line ORs its result in, exactly as the
 * lane's gates do, so the block and the gates agree even for odd line mixes.
 */
export function laneNext(c: LaneControl, x: number, a: number, p: boolean) {
  const b = c.shared | (c.useX ? x : 0) | (c.useP && p ? 1 : 0);
  const raw = a + (c.SUBTRACT ? ~b & MASK : b) + Number(c.SUBTRACT);
  const below = raw <= MASK; // no carry out of A + NOT B + 1 means A < B
  let next = 0;
  if (c.LD) next |= b;
  if (c.AND) next |= a & b;
  if (c.OR) next |= a | b;
  if (c.XOR) next |= a ^ b;
  if (c.ADD || c.SUB) next |= raw & MASK;
  if (c.SHR) next |= a >> b;
  if (c.LT && below) next |= 1;
  if (c.EQ && a === b) next |= 1;
  if (c.KEEP) next |= a;
  return { a: next, p: c.SET ? Boolean(a & 1) : p };
}

// ---------------------------------------------------------------- whole unit

export type ShaderState = {
  pc: number;
  y: number;
  t: number;
  /** Accumulator per lane. */
  a: number[];
  /** Pixel bits, bit i for lane i. */
  pixels: number;
};
export const initialShaderState = (): ShaderState => ({
  pc: 0,
  y: 0,
  t: 0,
  a: Array<number>(SHADER_LANES).fill(0),
  pixels: 0,
});

/** One clock tick: every lane runs the instruction at PC. END moves to the next row. */
export function shaderStep(bytes: readonly number[], state: ShaderState): ShaderState {
  const byte = bytes[state.pc] ?? 0;
  const control = decodeShader(byte, state.y, state.t);
  let pixels = 0;
  const a = state.a.map((value, x) => {
    const next = laneNext(control, x, value, Boolean((state.pixels >> x) & 1));
    if (next.p) pixels |= 1 << x;
    return next.a;
  });
  const end = byte >> 4 === 0;
  return {
    pc: end ? 0 : (state.pc + 1) % SHADER_ROM_SIZE,
    y: end ? (state.y + 1) & MASK : state.y,
    t: end && state.y === MASK ? (state.t + 1) & MASK : state.t,
    a,
    pixels,
  };
}

/** Whether the instruction at PC is END, i.e. the row is ready to be written. */
export const shaderRowReady = (bytes: readonly number[], state: ShaderState) =>
  (bytes[state.pc] ?? 0) >> 4 === 0;

/** Runs the shader until it has written `rows` rows; returns each row's pixel byte. */
export function renderShader(bytes: readonly number[], rows = 8, start = initialShaderState()) {
  const out: { y: number; t: number; pixels: number }[] = [];
  let state = start;
  while (out.length < rows) {
    if (shaderRowReady(bytes, state)) out.push({ y: state.y, t: state.t, pixels: state.pixels });
    state = shaderStep(bytes, state);
  }
  return out;
}
