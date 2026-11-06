import { aluCircuit } from "../../lib/computer/aluCircuit";
import { layoutCircuit } from "../../lib/computer/circuitLayout";
import { CATALOG } from "../../lib/computer/tutorial/levels";
import { CircuitDemo } from "./CircuitDemo";

const fullAlu = () => aluCircuit();

/**
 * A whole 4-bit ALU: ADD, SUB, AND and OR, with ZERO, NEGATIVE, CARRY and OVERFLOW.
 * The name is the chapter's, kept from when a 74181 drawing shared this demo.
 */
export const AluArchitectureComparison = () => (
  <CircuitDemo makeCircuit={fullAlu} label="4-bit ALU" showcase />
);

function teachingSlice() {
  const circuit = CATALOG.builtInModule("alu-slice");
  if (!circuit) throw new Error("The bit slice demo needs the teaching ALU's slice");
  return layoutCircuit(structuredClone(circuit));
}

/** One bit of the teaching ALU, its logic unit, full adder and selector open. */
export const AluBitSlice = () => (
  <CircuitDemo makeCircuit={teachingSlice} label="ALU bit slice" openModules showcase />
);
