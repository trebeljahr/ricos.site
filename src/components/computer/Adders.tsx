import { adderDemo } from "../../lib/computer/demoCircuits";
import { CircuitDemo } from "./CircuitDemo";

const sum = () => adderDemo("sum");
const half = () => adderDemo("half");
const full = () => adderDemo("full");
const boxedFull = () => adderDemo("boxed-full");
const byte = () => adderDemo("byte");

export function HalfAdder({ sumOnly = false }: { sumOnly?: boolean }) {
  return (
    <CircuitDemo makeCircuit={sumOnly ? sum : half} label={sumOnly ? "The sum bit" : "Half adder"}>
      {sumOnly
        ? "Flip A and B. XOR gives the sum bit; 1 + 1 still needs a carry."
        : "Flip A and B. XOR gives SUM; AND gives CARRY. Open either gate to see its construction."}
    </CircuitDemo>
  );
}

export function FullAdder({ unfolded = true }: { unfolded?: boolean }) {
  return (
    <CircuitDemo makeCircuit={unfolded ? full : boxedFull} label="Full adder">
      A full adder adds A, B and CARRY IN. Unfold its parts or change the wiring to follow SUM and
      CARRY.
    </CircuitDemo>
  );
}

export function EightBitAdder() {
  return (
    <CircuitDemo makeCircuit={byte} label="Eight-bit adder">
      Eight full adders pass the carry from bit 0 to bit 7. Set A and B and enable Ripple to follow
      the gate delays.
    </CircuitDemo>
  );
}
