import { useCallback, useState } from "react";
import { CMOS_GATES, type CmosGate, GATE_LABELS } from "../../lib/computer/cmosGates";
import { transistorDemo } from "../../lib/computer/demoCircuits";
import { CircuitDemo } from "./CircuitDemo";
import { buttonClass, controlsClass } from "./DeviceDemoParts";

export function TransistorGates({
  gate: initialGate = "not",
  fixed = false,
  legend = true,
}: {
  gate?: CmosGate;
  fixed?: boolean;
  legend?: boolean;
}) {
  const [gate, setGate] = useState(initialGate);
  const makeCircuit = useCallback(() => transistorDemo(gate), [gate]);
  return (
    <div className="not-prose">
      {!fixed && (
        <fieldset className={controlsClass} aria-label="Gate">
          {CMOS_GATES.map((name) => (
            <button
              key={name}
              type="button"
              className={buttonClass}
              aria-label={`Show the ${GATE_LABELS[name]} gate`}
              aria-pressed={gate === name}
              onClick={() => setGate(name)}
            >
              {GATE_LABELS[name]}
            </button>
          ))}
        </fieldset>
      )}
      <CircuitDemo makeCircuit={makeCircuit} label={`${GATE_LABELS[gate]} from transistors`}>
        {legend &&
          "Flip the inputs to trace the conducting paths. PMOS conducts at 0; NMOS conducts at 1. Edit the circuit to try another construction."}
      </CircuitDemo>
    </div>
  );
}
