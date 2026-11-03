import { useCallback, useMemo, useState } from "react";
import { CMOS_GATES, type CmosGate, GATE_LABELS } from "../../lib/computer/cmosGates";
import { transistorDemo } from "../../lib/computer/demoCircuits";
import { CircuitDemo } from "./CircuitDemo";
import { buttonClass, controlsClass } from "./DeviceDemoParts";

export function TransistorGates({
  gate: initialGate = "not",
  fixed = false,
}: {
  gate?: CmosGate;
  fixed?: boolean;
}) {
  const [gate, setGate] = useState(initialGate);
  const circuit = useMemo(() => transistorDemo(gate), [gate]);
  const makeCircuit = useCallback(() => circuit, [circuit]);
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
      <CircuitDemo
        makeCircuit={makeCircuit}
        label={`${GATE_LABELS[gate]} from transistors`}
        revision="video-HaBMAD-Dr8M-compact-v3"
      />
    </div>
  );
}
