import { useCallback, useMemo, useState } from "react";
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
      <CircuitDemo makeCircuit={makeCircuit} label={`${GATE_LABELS[gate]} from transistors`}>
        {legend && (
          <div className="space-y-2">
            <p>
              <strong>
                {GATE_LABELS[gate]} · {transistorCount} transistors in the starting circuit.
              </strong>
              {gate === "xor" || gate === "xnor"
                ? " This XOR uses four NAND gates (16 transistors); XNOR adds an inverter (18). Other transistor designs use different counts."
                : gate === "and" || gate === "or"
                  ? " A four-transistor NAND or NOR followed by a two-transistor inverter."
                  : " Both the pull-up and pull-down networks are included."}
            </p>
            <p>
              These are CMOS gates. G is the gate control, S is the source, and D is the drain. PMOS
              connects toward VDD when its gate is 0. NMOS connects toward GND when its gate is 1.
              The output is the shared node between those paths.
            </p>
            <p>
              Follow the vertical source–drain paths, then flip A or B. The circle on a PMOS gate
              means it switches on at 0.
            </p>
            <p>
              Bipolar transistors use base, collector, and emitter terminals. The{" "}
              <a
                className="underline"
                href="https://www.electronics-tutorials.ws/logic/logic-gates-using-transistors.html"
              >
                resistor–transistor circuits
              </a>{" "}
              use NPN transistors and resistors to build the same logic functions.
            </p>
            <p>
              This builder uses ideal directed switches: a conducting transistor passes its source
              level to its drain. It omits body terminals, analog voltages, current, resistance, and
              capacitance.
            </p>
          </div>
        )}
      </CircuitDemo>
    </div>
  );
}
