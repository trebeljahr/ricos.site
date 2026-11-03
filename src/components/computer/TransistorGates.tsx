import { useCallback, useMemo, useState } from "react";
import {
  CMOS_GATES,
  type CmosGate,
  GATE_LABELS,
  gateReferenceUrl,
} from "../../lib/computer/cmosGates";
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
  const circuit = useMemo(() => transistorDemo(gate), [gate]);
  const makeCircuit = useCallback(() => circuit, [circuit]);
  const transistorCount = circuit.nodes.filter(
    (node) => node.type === "pmos" || node.type === "nmos",
  ).length;
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
      >
        {legend && (
          <div className="space-y-2">
            <p>
              <strong>
                {GATE_LABELS[gate]} · {transistorCount} transistors in the starting circuit.
              </strong>
              {gate === "xor"
                ? " B selects A or inverted A using two pass transistors. The other two transistors invert A."
                : gate === "xnor"
                  ? " The video's four-transistor XOR followed by its two-transistor NOT. This is a derived extension."
                  : gate === "and" || gate === "or"
                    ? " A four-transistor NAND or NOR followed by a two-transistor NOT."
                    : " Complementary PMOS and NMOS paths drive the output toward 1 or 0."}
            </p>
            <p>
              G controls the transistor. A conducting transistor passes its source (S) level to its
              drain (D). PMOS switches on at 0; NMOS switches on at 1. OUT is a voltage level, shown
              by the lamp.
            </p>
            <p>
              Wiring follows the{" "}
              <a className="underline" href={gateReferenceUrl(gate)}>
                video diagram
              </a>
              .
              {gate === "xor" || gate === "xnor"
                ? " The pass-transistor XOR uses ideal switches here. Real devices can weaken its output voltage; this model omits that effect."
                : " The simulator uses ideal switches and omits analog voltage, resistance, and capacitance."}
            </p>
          </div>
        )}
      </CircuitDemo>
    </div>
  );
}
