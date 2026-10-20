// Independent specifications for truth-table comparisons and the physical
// switch analogy. Live circuit diagrams run through logic.ts and LogicBuilder.

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
