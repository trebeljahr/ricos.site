// Plain boolean logic for the chapter-sized gate and adder demos. The circuit
// editor simulates wires and gates in lib/computer/logic.ts; these demos only
// need the truth of each gate, so they compute it directly.

export const TRUTH_GATES = ["and", "or", "not", "nand", "nor", "xor", "xnor"] as const;
export type TruthGate = (typeof TRUTH_GATES)[number];

export const GATE_LABELS: Record<TruthGate, string> = {
  and: "AND",
  or: "OR",
  not: "NOT",
  nand: "NAND",
  nor: "NOR",
  xor: "XOR",
  xnor: "XNOR",
};

/** What the gate does, in one sentence a reader can check against its table. */
export const GATE_RULES: Record<TruthGate, string> = {
  and: "On only when A and B are both on.",
  or: "On when A or B is on, or both.",
  not: "On when A is off. Off when A is on.",
  nand: "Off only when A and B are both on.",
  nor: "On only when A and B are both off.",
  xor: "On when exactly one of A and B is on.",
  xnor: "On when A and B are the same.",
};

export const gateInputs = (gate: TruthGate) => (gate === "not" ? 1 : 2);

export function evalGate(gate: TruthGate, a: boolean, b = false): boolean {
  switch (gate) {
    case "and":
      return a && b;
    case "or":
      return a || b;
    case "not":
      return !a;
    case "nand":
      return !(a && b);
    case "nor":
      return !(a || b);
    case "xor":
      return a !== b;
    case "xnor":
      return a === b;
  }
}

/**
 * Every combination of `count` inputs, in counting order: 00, 01, 10, 11. The
 * first input is the most significant, as in a written truth table.
 */
export function inputRows(count: number): boolean[][] {
  return Array.from({ length: 2 ** count }, (_, row) =>
    Array.from({ length: count }, (_, index) => Boolean((row >> (count - 1 - index)) & 1)),
  );
}

/** The row number of a combination of inputs: its bits read as a binary number. */
export const rowIndex = (inputs: readonly boolean[]) =>
  inputs.reduce((total, bit) => total * 2 + (bit ? 1 : 0), 0);

export const bit = (value: boolean) => (value ? "1" : "0");

export type HalfAdd = { sum: boolean; carry: boolean };

/** Two one-bit numbers added: SUM is their XOR, CARRY their AND. */
export const halfAdd = (a: boolean, b: boolean): HalfAdd => ({ sum: a !== b, carry: a && b });

export type FullAdd = {
  sum: boolean;
  carry: boolean;
  /** The first half adder: A and B. */
  first: HalfAdd;
  /** The second half adder: the first one's SUM and CARRY IN. */
  second: HalfAdd;
};

/**
 * Three one-bit numbers added the way the circuit does it: two half adders in
 * a row, and an OR joining their carries.
 */
export function fullAdd(a: boolean, b: boolean, carryIn: boolean): FullAdd {
  const first = halfAdd(a, b);
  const second = halfAdd(first.sum, carryIn);
  return { sum: second.sum, carry: first.carry || second.carry, first, second };
}

export type ByteAdd = {
  /** The eight SUM bits as a number, 0 to 255. */
  sum: number;
  /** CARRY OUT of the last full adder: the ninth bit of the result. */
  carryOut: boolean;
  /** One full adder per bit, bit 0 (the least significant) first. */
  stages: FullAdd[];
};

/** Two bytes added by eight full adders, each one's carry going into the next. */
export function addBytes(a: number, b: number, carryIn = false): ByteAdd {
  const stages: FullAdd[] = [];
  let carry = carryIn;
  let sum = 0;
  for (let position = 0; position < 8; position++) {
    const stage = fullAdd(Boolean((a >> position) & 1), Boolean((b >> position) & 1), carry);
    stages.push(stage);
    if (stage.sum) sum |= 1 << position;
    carry = stage.carry;
  }
  return { sum, carryOut: carry, stages };
}

/** A byte's bits, most significant first, as a string: 13 → "00001101". */
export const byteBits = (value: number) => (value & 255).toString(2).padStart(8, "0");

/**
 * One gate delay of an 8-bit ripple-carry adder. `carries[i]` is the carry
 * into bit i (`carries[0]` is CARRY IN, `carries[8]` is CARRY OUT). Every full
 * adder computes its carry out from the carry it sees now, all at once, as the
 * real circuit does; repeated, the right carries ripple up from bit 0.
 */
export function rippleStep(a: number, b: number, carries: readonly boolean[]): boolean[] {
  return carries.map((carry, position) =>
    position === 0
      ? carry
      : fullAdd(
          Boolean((a >> (position - 1)) & 1),
          Boolean((b >> (position - 1)) & 1),
          carries[position - 1],
        ).carry,
  );
}

/** The carries into each bit once the adder has settled, CARRY OUT last. */
export function settledCarries(a: number, b: number, carryIn = false): boolean[] {
  const { stages, carryOut } = addBytes(a, b, carryIn);
  return [carryIn, ...stages.slice(0, 7).map((stage) => stage.carry), carryOut];
}

/** The eight SUM bits for the carries the adder sees right now. */
export const sumWith = (a: number, b: number, carries: readonly boolean[]) =>
  Array.from(
    { length: 8 },
    (_, position) =>
      fullAdd(Boolean((a >> position) & 1), Boolean((b >> position) & 1), carries[position]).sum,
  ).reduce((total, on, position) => total | (on ? 1 << position : 0), 0);
