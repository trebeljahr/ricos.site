import type { TruthGate } from "./gateLogic";

export const BOOLEAN_NOTATION_CONVENTIONS = [
  { id: "logic", label: "Logic notation" },
  { id: "algebra", label: "Algebra notation" },
  { id: "other", label: "Other symbols" },
] as const;

type Notation = { expression: string; reading: string; overline?: boolean };
type Convention = (typeof BOOLEAN_NOTATION_CONVENTIONS)[number]["id"];
type BooleanDefinition = {
  name: string;
  rule: string;
  notations: Partial<Record<Convention, readonly Notation[]>>;
};

export const BOOLEAN_OPERATIONS: Record<TruthGate, BooleanDefinition> = {
  not: {
    name: "NOT",
    rule: "The output is the opposite of A.",
    notations: {
      logic: [{ expression: "¬A", reading: "not A" }],
      algebra: [
        { expression: "A", reading: "A bar, meaning not A", overline: true },
        { expression: "A′", reading: "A prime, meaning not A" },
      ],
    },
  },
  and: {
    name: "AND",
    rule: "The output is 1 only when both inputs are 1.",
    notations: {
      logic: [{ expression: "A ∧ B", reading: "A and B" }],
      algebra: [
        { expression: "A · B", reading: "A and B" },
        { expression: "AB", reading: "A and B" },
      ],
    },
  },
  or: {
    name: "OR",
    rule: "The output is 1 when either input is 1, including when both are 1.",
    notations: {
      logic: [{ expression: "A ∨ B", reading: "A or B" }],
      algebra: [{ expression: "A + B", reading: "A or B" }],
    },
  },
  nand: {
    name: "NAND",
    rule: "The output is 0 only when both inputs are 1.",
    notations: {
      logic: [{ expression: "¬(A ∧ B)", reading: "not, A and B" }],
      algebra: [{ expression: "A · B", reading: "not, A and B", overline: true }],
      other: [{ expression: "A ↑ B", reading: "A NAND B" }],
    },
  },
  nor: {
    name: "NOR",
    rule: "The output is 1 only when both inputs are 0.",
    notations: {
      logic: [{ expression: "¬(A ∨ B)", reading: "not, A or B" }],
      algebra: [{ expression: "A + B", reading: "not, A or B", overline: true }],
      other: [{ expression: "A ↓ B", reading: "A NOR B" }],
    },
  },
  xor: {
    name: "XOR",
    rule: "The output is 1 when exactly one input is 1.",
    notations: {
      logic: [{ expression: "A ⊕ B", reading: "A exclusive or B" }],
      algebra: [{ expression: "A ⊕ B", reading: "A exclusive or B" }],
      other: [{ expression: "A ≠ B", reading: "A is different from B" }],
    },
  },
  xnor: {
    name: "XNOR",
    rule: "The output is 1 when the inputs are equal.",
    notations: {
      logic: [{ expression: "¬(A ⊕ B)", reading: "not, A exclusive or B" }],
      algebra: [{ expression: "A ⊕ B", reading: "not, A exclusive or B", overline: true }],
      other: [
        { expression: "A ≡ B", reading: "A is equivalent to B" },
        { expression: "A ⊙ B", reading: "A XNOR B" },
      ],
    },
  },
};

export const BOOLEAN_OPERATION_IDS = ["not", "and", "or", "nand", "nor", "xor", "xnor"] as const;

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
