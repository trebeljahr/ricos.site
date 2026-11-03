import { adderDemo } from "../../lib/computer/demoCircuits";
import { CircuitDemo } from "./CircuitDemo";

const sum = () => adderDemo("sum");
const half = () => adderDemo("half");
const full = () => adderDemo("full");
const boxedFull = () => adderDemo("boxed-full");
const byte = () => adderDemo("byte");

export function HalfAdder({ sumOnly = false }: { sumOnly?: boolean }) {
  return (
    <CircuitDemo
      makeCircuit={sumOnly ? sum : half}
      label={sumOnly ? "The sum bit" : "Half adder"}
      openGates
    />
  );
}

export function FullAdder({ unfolded = true }: { unfolded?: boolean }) {
  return <CircuitDemo makeCircuit={unfolded ? full : boxedFull} label="Full adder" openGates />;
}

export function EightBitAdder() {
  return <CircuitDemo makeCircuit={byte} label="Eight-bit adder" />;
}
