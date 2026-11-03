import { useCallback } from "react";
import { type DeviceKind, deviceDemo } from "../../lib/computer/demoCircuits";
import { CircuitDemo } from "./CircuitDemo";

/** The same memory bus and hardware blocks as the CPU, driven by hand. */
export function DeviceCircuitDemo({ kind }: { kind: DeviceKind }) {
  const makeCircuit = useCallback(() => deviceDemo(kind), [kind]);
  const initialFocus = [
    "address",
    "data",
    "we",
    "clock",
    ["bank", "vram", "big-blitter"].includes(kind) ? "big-screen" : "screen",
  ];
  return (
    <CircuitDemo
      makeCircuit={makeCircuit}
      label={`${kind} circuit bench`}
      initialFocus={initialFocus}
    />
  );
}
