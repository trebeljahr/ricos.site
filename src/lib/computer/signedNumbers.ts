export type SignedWidth = 4 | 8;
export type IntegerEncoding = "unsigned" | "sign-magnitude" | "ones-complement" | "twos-complement";

export const INTEGER_ENCODINGS: { id: IntegerEncoding; label: string }[] = [
  { id: "unsigned", label: "Unsigned" },
  { id: "sign-magnitude", label: "Sign + magnitude" },
  { id: "ones-complement", label: "Ones’ complement" },
  { id: "twos-complement", label: "Two’s complement" },
];

export const bitMask = (width: SignedWidth) => 2 ** width - 1;
export const bitPattern = (raw: number, width: SignedWidth) =>
  (raw & bitMask(width)).toString(2).padStart(width, "0");

/** Interpretation only. Preserve negative zero. */
export function decodeInteger(raw: number, width: SignedWidth, encoding: IntegerEncoding): number {
  const value = raw & bitMask(width);
  const sign = 2 ** (width - 1);
  if (encoding === "unsigned" || value < sign) return value;
  if (encoding === "sign-magnitude") return -(value & (sign - 1));
  if (encoding === "ones-complement") return -(bitMask(width) ^ value);
  return value - 2 ** width;
}

/**
 * What a set bit adds to the value. Only the top bit differs between encodings.
 * Sign + magnitude's sign bit adds nothing: it flips the sum of the others.
 */
export function bitWeight(bit: number, width: SignedWidth, encoding: IntegerEncoding): number {
  if (bit !== width - 1 || encoding === "unsigned") return 2 ** bit;
  if (encoding === "twos-complement") return -(2 ** bit);
  if (encoding === "ones-complement") return -(2 ** bit - 1);
  return 0;
}

export const displayInteger = (value: number) =>
  Object.is(value, -0) ? "−0" : String(value).replace("-", "−");

export type ArithmeticEncoding = Extract<IntegerEncoding, "ones-complement" | "twos-complement">;
export type ArithmeticOperation = "add" | "subtract";
export type Bit = 0 | 1;

export const ARITHMETIC_ENCODINGS = INTEGER_ENCODINGS.filter(
  (item): item is { id: ArithmeticEncoding; label: string } =>
    item.id === "ones-complement" || item.id === "twos-complement",
).reverse();

export function integerRange(width: SignedWidth, encoding: ArithmeticEncoding) {
  const max = 2 ** (width - 1) - 1;
  return { min: encoding === "twos-complement" ? -max - 1 : -max, max };
}

/** The pattern of a value, or of the nearest value this encoding has. */
export function encodeInteger(value: number, width: SignedWidth, encoding: ArithmeticEncoding) {
  const { min, max } = integerRange(width, encoding);
  const fitted = Math.min(max, Math.max(min, value));
  if (encoding === "twos-complement") return fitted < 0 ? fitted + 2 ** width : 0 + fitted;
  return fitted < 0 || Object.is(fitted, -0) ? bitMask(width) ^ Math.abs(fitted) : fitted;
}

/** One thing written on the paper, in the order a person writes it. */
export type ArithmeticStep =
  | { kind: "invert"; column: number; from: Bit; to: Bit }
  | { kind: "first-carry"; carry: Bit }
  | {
      kind: "column";
      pass: 1 | 2;
      column: number;
      top: Bit;
      /** Null in the second pass, which adds only the carry. */
      bottom: Bit | null;
      carryIn: Bit;
      sum: Bit;
      carryOut: Bit;
    }
  | { kind: "carry-out"; fate: "dropped" | "wrapped" }
  | { kind: "result" };

export type ColumnWork = {
  a: number;
  b: number;
  width: SignedWidth;
  encoding: ArithmeticEncoding;
  operation: ArithmeticOperation;
  /** What is actually added to A: B, or B with every bit flipped. */
  addend: number;
  firstPass: number;
  result: number;
  value: number;
  /** The answer with unlimited digits. */
  trueValue: number;
  carryIntoTop: Bit;
  carryOutOfTop: Bit;
  overflow: boolean;
  endAround: boolean;
  negativeZero: boolean;
  steps: ArithmeticStep[];
};

const bitOf = (raw: number, column: number): Bit => ((raw >> column) & 1) as Bit;

/** A + B or A − B worked by hand, column by column from the right. */
export function workColumns(
  a: number,
  b: number,
  width: SignedWidth,
  encoding: ArithmeticEncoding,
  operation: ArithmeticOperation,
): ColumnWork {
  const mask = bitMask(width);
  const subtract = operation === "subtract";
  const addend = subtract ? b ^ mask : b;
  const steps: ArithmeticStep[] = [];

  if (subtract) {
    for (let column = 0; column < width; column++)
      steps.push({ kind: "invert", column, from: bitOf(b, column), to: bitOf(addend, column) });
  }
  let carry: Bit = subtract && encoding === "twos-complement" ? 1 : 0;
  if (subtract) steps.push({ kind: "first-carry", carry });

  const topColumn = width - 1;
  let firstPass = 0;
  let carryIntoTop: Bit = 0;
  for (let column = 0; column < width; column++) {
    const [top, bottom] = [bitOf(a, column), bitOf(addend, column)];
    const total = top + bottom + carry;
    if (column === topColumn) carryIntoTop = carry;
    const [sum, carryOut] = [(total & 1) as Bit, (total >> 1) as Bit];
    steps.push({ kind: "column", pass: 1, column, top, bottom, carryIn: carry, sum, carryOut });
    firstPass |= sum << column;
    carry = carryOut;
  }

  const carryOutOfTop = carry;
  const endAround = encoding === "ones-complement" && carryOutOfTop === 1;
  if (carryOutOfTop) steps.push({ kind: "carry-out", fate: endAround ? "wrapped" : "dropped" });

  let result = firstPass;
  if (endAround) {
    result = 0;
    for (let column = 0; column < width; column++) {
      const top = bitOf(firstPass, column);
      const total = top + carry;
      // The carry that wrapped round can still climb into the top column.
      if (column === topColumn && carry) carryIntoTop = 1;
      const [sum, carryOut] = [(total & 1) as Bit, (total >> 1) as Bit];
      steps.push({
        kind: "column",
        pass: 2,
        column,
        top,
        bottom: null,
        carryIn: carry,
        sum,
        carryOut,
      });
      result |= sum << column;
      carry = carryOut;
    }
  }
  steps.push({ kind: "result" });

  const [left, right] = [decodeInteger(a, width, encoding), decodeInteger(b, width, encoding)];
  return {
    a,
    b,
    width,
    encoding,
    operation,
    addend,
    firstPass,
    result,
    value: decodeInteger(result, width, encoding),
    trueValue: (subtract ? left - right : left + right) + 0,
    carryIntoTop,
    carryOutOfTop,
    overflow: carryIntoTop !== carryOutOfTop,
    endAround,
    negativeZero: encoding === "ones-complement" && result === mask,
    steps,
  };
}

/** What the paper holds after the first `position` steps, each row indexed by column. */
export type SheetState = {
  addend: (Bit | null)[];
  /** One more than the width: the last one is the carry out of the top column. */
  carries: (Bit | null)[];
  sum: (Bit | null)[];
  secondCarries: (Bit | null)[];
  final: (Bit | null)[];
  fate: "dropped" | "wrapped" | null;
  step: ArithmeticStep | null;
  done: boolean;
};

export function sheetAt(work: ColumnWork, position: number): SheetState {
  const blank = (length: number) => Array<Bit | null>(length).fill(null);
  const sheet: SheetState = {
    addend: blank(work.width),
    carries: blank(work.width + 1),
    sum: blank(work.width),
    secondCarries: blank(work.width),
    final: blank(work.width),
    fate: null,
    step: work.steps[position - 1] ?? null,
    done: position >= work.steps.length,
  };
  for (const step of work.steps.slice(0, position)) {
    if (step.kind === "invert") sheet.addend[step.column] = step.to;
    if (step.kind === "first-carry") sheet.carries[0] = step.carry;
    if (step.kind === "carry-out") {
      sheet.fate = step.fate;
      if (step.fate === "wrapped") sheet.secondCarries[0] = 1;
    }
    if (step.kind !== "column") continue;
    const [written, carries] =
      step.pass === 1 ? [sheet.sum, sheet.carries] : [sheet.final, sheet.secondCarries];
    written[step.column] = step.sum;
    carries[step.column] = step.carryIn;
    if (step.column + 1 < carries.length) carries[step.column + 1] = step.carryOut;
  }
  return sheet;
}

export function arithmeticExpression(
  a: number,
  b: number,
  width: SignedWidth,
  encoding: ArithmeticEncoding,
  operation: ArithmeticOperation,
) {
  const right = decodeInteger(b, width, encoding);
  const shown = displayInteger(right);
  const negative = right < 0 || Object.is(right, -0);
  const sign = operation === "add" ? "+" : "−";
  const left = displayInteger(decodeInteger(a, width, encoding));
  return `${left} ${sign} ${negative ? `(${shown})` : shown}`;
}

export function stepHeading(step: ArithmeticStep | null) {
  if (!step) return "START";
  if (step.kind === "invert") return `FLIP B · COLUMN ${step.column}`;
  if (step.kind === "first-carry") return "FIRST CARRY";
  if (step.kind === "carry-out") return "CARRY OUT";
  if (step.kind === "result") return "RESULT";
  return `${step.pass === 2 ? "SECOND PASS · " : ""}COLUMN ${step.column}`;
}

/** The live readout: what this step just did, in a few short lines. */
export function stepReadout(work: ColumnWork, step: ArithmeticStep | null): string[] {
  const { a, b, width, encoding, operation } = work;
  const expression = arithmeticExpression(a, b, width, encoding, operation);
  if (!step) {
    const sign = operation === "add" ? "+" : "−";
    return [expression, `${bitPattern(a, width)} ${sign} ${bitPattern(b, width)}`];
  }
  if (step.kind === "invert") return [`flip ${step.from} → ${step.to}`];
  if (step.kind === "first-carry")
    return [step.carry ? "+1 enters as the first carry" : "no +1, first carry stays 0"];
  if (step.kind === "carry-out")
    return [step.fate === "dropped" ? "carry 1 → dropped" : "carry 1 → back into column 0"];
  if (step.kind === "column") {
    const terms = step.bottom === null ? `${step.top}` : `${step.top} + ${step.bottom}`;
    const total = step.carryOut ? `1${step.sum}` : `${step.sum}`;
    return [
      `${terms} + carry ${step.carryIn} = ${total}, write ${step.sum}, carry ${step.carryOut}`,
    ];
  }

  const lines = [`${expression} ${work.overflow ? "→" : "="} ${displayInteger(work.value)}`];
  if (work.overflow) lines.push(`true answer ${displayInteger(work.trueValue)}, doesn’t fit`);
  if (work.carryOutOfTop)
    lines.push(work.endAround ? "carry 1 → back into column 0" : "carry 1 → dropped");
  if (work.negativeZero)
    lines.push(`two zeros: ${bitPattern(0, width)} = 0, ${bitPattern(work.result, width)} = −0`);
  const relation = work.overflow ? "≠" : "=";
  lines.push(`carry into top ${work.carryIntoTop} ${relation} carry out ${work.carryOutOfTop}`);
  return lines;
}

export type ArithmeticPreset = {
  label: string;
  a: number;
  b: number;
  operation: ArithmeticOperation;
};

/** The sums worth reaching in one press. Each encoding and width has its own smallest number. */
export function arithmeticPresets(
  width: SignedWidth,
  encoding: ArithmeticEncoding,
): ArithmeticPreset[] {
  const sums: [number, number, ArithmeticOperation][] = [
    [2, -5, "add"],
    [5, -3, "add"],
    [5, -5, "add"],
    [5, 3, "subtract"],
    width === 4 ? [4, 7, "add"] : [100, 100, "add"],
    [integerRange(width, encoding).min, -3, "add"],
  ];
  return sums.map(([left, right, operation]) => {
    const a = encodeInteger(left, width, encoding);
    const b = encodeInteger(right, width, encoding);
    return { label: arithmeticExpression(a, b, width, encoding, operation), a, b, operation };
  });
}
