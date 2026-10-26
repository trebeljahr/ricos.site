// CMOS gate choices for the chapter demo. Wiring and simulation live in logic.ts.
export const CMOS_GATES = ["not", "nand", "nor", "and", "or", "xor", "xnor"] as const;
export type CmosGate = (typeof CMOS_GATES)[number];
export const GATE_LABELS: Record<CmosGate, string> = {
  not: "NOT",
  nand: "NAND",
  nor: "NOR",
  and: "AND",
  or: "OR",
  xor: "XOR",
  xnor: "XNOR",
};

// Circuit references in Computer&Electronics' transistor-to-gate lesson.
export const GATE_REFERENCE_SECONDS: Record<CmosGate, number> = {
  not: 295,
  nand: 122,
  nor: 451,
  and: 386,
  or: 494,
  xor: 555,
  xnor: 555,
};
export function gateReferenceUrl(gate: CmosGate) {
  return `https://www.youtube.com/watch?v=HaBMAD-Dr8M&t=${GATE_REFERENCE_SECONDS[gate]}s`;
}
