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
