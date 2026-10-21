import { evalGate, type TruthGate } from "./gateLogic";

export type BooleanOperation =
  | TruthGate
  | "implies"
  | "nonimplication"
  | "converse"
  | "converse-nonimplication";

type Notation = { expression: string; reading: string };
type BooleanDefinition = {
  name: string;
  inputs: 1 | 2;
  rule: string;
  gate?: TruthGate;
  notations: readonly Notation[];
};

/** Mathematical aliases share one Boolean function, independent of their spelling. */
export const BOOLEAN_OPERATIONS: Record<BooleanOperation, BooleanDefinition> = {
  not: {
    name: "NOT",
    inputs: 1,
    gate: "not",
    rule: "The output is the opposite of A.",
    notations: [
      { expression: "¬A", reading: "not A" },
      { expression: "A̅", reading: "A bar, meaning not A" },
      { expression: "~A", reading: "not A" },
    ],
  },
  and: {
    name: "AND",
    inputs: 2,
    gate: "and",
    rule: "The output is 1 only when both inputs are 1.",
    notations: [
      { expression: "A ∧ B", reading: "A and B" },
      { expression: "A · B", reading: "A and B" },
      { expression: "AB", reading: "A and B" },
    ],
  },
  nand: {
    name: "NAND",
    inputs: 2,
    gate: "nand",
    rule: "The output is 0 only when both inputs are 1.",
    notations: [
      { expression: "A ↑ B", reading: "A NAND B" },
      { expression: "¬(A ∧ B)", reading: "not, open bracket, A and B, close bracket" },
    ],
  },
  or: {
    name: "OR",
    inputs: 2,
    gate: "or",
    rule: "The output is 1 when either input is 1, including when both are 1.",
    notations: [
      { expression: "A ∨ B", reading: "A or B" },
      { expression: "A + B", reading: "A or B" },
    ],
  },
  nor: {
    name: "NOR",
    inputs: 2,
    gate: "nor",
    rule: "The output is 1 only when both inputs are 0.",
    notations: [
      { expression: "A ↓ B", reading: "A NOR B" },
      { expression: "¬(A ∨ B)", reading: "not, open bracket, A or B, close bracket" },
    ],
  },
  xor: {
    name: "XOR",
    inputs: 2,
    gate: "xor",
    rule: "The output is 1 when exactly one input is 1.",
    notations: [
      { expression: "A ⊕ B", reading: "A exclusive or B" },
      { expression: "A ≠ B", reading: "A is different from B" },
    ],
  },
  xnor: {
    name: "XNOR / equivalence",
    inputs: 2,
    gate: "xnor",
    rule: "The output is 1 when the inputs are equal.",
    notations: [
      { expression: "A ↔ B", reading: "A if and only if B" },
      { expression: "A ≡ B", reading: "A is equivalent to B" },
      { expression: "A ⊙ B", reading: "A XNOR B" },
    ],
  },
  implies: {
    name: "Implication",
    inputs: 2,
    rule: "The output is 0 only when A is 1 and B is 0. This describes a logical condition, not causation.",
    notations: [
      { expression: "A ⇒ B", reading: "A implies B" },
      { expression: "A → B", reading: "if A, then B" },
      { expression: "¬A ∨ B", reading: "not A, or B" },
    ],
  },
  nonimplication: {
    name: "Nonimplication",
    inputs: 2,
    rule: "The output is 1 only when A is 1 and B is 0.",
    notations: [
      { expression: "A ↛ B", reading: "A does not imply B" },
      { expression: "A ∧ ¬B", reading: "A and not B" },
    ],
  },
  converse: {
    name: "Converse implication",
    inputs: 2,
    rule: "The output is 0 only when B is 1 and A is 0. This is B implies A.",
    notations: [
      { expression: "A ⇐ B", reading: "A is implied by B" },
      { expression: "B ⇒ A", reading: "B implies A" },
      { expression: "A ∨ ¬B", reading: "A, or not B" },
    ],
  },
  "converse-nonimplication": {
    name: "Converse nonimplication",
    inputs: 2,
    rule: "The output is 1 only when B is 1 and A is 0.",
    notations: [
      { expression: "A ↚ B", reading: "A is not implied by B" },
      { expression: "¬A ∧ B", reading: "not A, and B" },
    ],
  },
};

export const BOOLEAN_OPERATION_IDS = Object.keys(BOOLEAN_OPERATIONS) as BooleanOperation[];

/** Truth-table specification. Gate views use the shared circuit simulator. */
export function booleanResult(operation: BooleanOperation, a: boolean, b: boolean): boolean {
  const gate = BOOLEAN_OPERATIONS[operation].gate;
  if (gate) return evalGate(gate, a, b);
  switch (operation) {
    case "implies":
      return !a || b;
    case "nonimplication":
      return a && !b;
    case "converse":
      return a || !b;
    case "converse-nonimplication":
      return !a && b;
    default:
      throw new Error(`No Boolean specification for ${operation}`);
  }
}

export const MAX_BOOLEAN_INPUTS = 8;
export const TRUTH_PREVIEW_ROWS = 8;

/** Counts functions with one Boolean output; even zero inputs have one empty assignment. */
export function truthTableSize(inputs: number): { rows: number; functions: bigint } {
  if (!Number.isInteger(inputs) || inputs < 0 || inputs > MAX_BOOLEAN_INPUTS)
    throw new RangeError(`Input count must be an integer from 0 to ${MAX_BOOLEAN_INPUTS}`);
  const rows = 2 ** inputs;
  return { rows, functions: BigInt(1) << BigInt(rows) };
}

/** Only a bounded preview is materialized, independently of the function count. */
export function truthTablePreview(inputs: number): boolean[][] {
  const { rows } = truthTableSize(inputs);
  return Array.from({ length: Math.min(rows, TRUTH_PREVIEW_ROWS) }, (_, row) =>
    Array.from({ length: inputs }, (_, bit) => Boolean((row >> (inputs - bit - 1)) & 1)),
  );
}

export const BOOLEAN_EXPLANATIONS = {
  notation: {
    title: "How do I read these symbols?",
    paragraphs: [
      "A and B each stand for one Boolean value: false or true, written here as 0 or 1.",
      "C names the output. C = A ∧ B says that C gets the result of A AND B.",
      "A bar or ¬ means NOT. Parentheses show which expression an operator acts on.",
      "The + in Boolean algebra means OR. For example, 1 + 1 = 1 here. Ordinary arithmetic uses different rules.",
      "Programming languages choose their own spellings. Bitwise operators act on each bit of a word. Logical operators use truth values.",
    ],
  },
  "rows-and-functions": {
    title: "Rows and functions count different things",
    paragraphs: [
      "With n Boolean inputs, a truth table has 2ⁿ rows: one for each input combination.",
      "Each row has two possible output choices, 0 or 1. Choosing every output gives one complete function.",
      "For one output, the number of possible functions is 2 raised to the number of rows: 2⁽²ⁿ⁾.",
      "With m output bits, each row instead has 2ᵐ choices. The number of functions becomes 2^(m × 2ⁿ).",
    ],
  },
  constants: {
    title: "What if there are no inputs?",
    paragraphs: [
      "There is still one case: the empty input combination. So 2⁰ = 1 row.",
      "Its output can always be 0 or always be 1. Those are the two constant functions.",
    ],
  },
  "computer-state": {
    title: "Could a whole computer be one truth table?",
    paragraphs: [
      "For a finite digital model, yes, if the inputs include every stored bit as well as the external inputs.",
      "Each row then gives the outputs and the next stored state for one specified step. Repeating steps describes a running computation.",
      "The same key press can produce different results when memory differs. A table of external inputs alone cannot capture that.",
      "This is a model of digital state changes. It leaves out analog voltages and physical timing effects.",
    ],
  },
} as const;

export type BooleanExplanationTopic = keyof typeof BOOLEAN_EXPLANATIONS;
