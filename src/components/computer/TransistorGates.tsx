import clsx from "clsx";
import { useState } from "react";
import { CMOS_GATES, type CmosGate, GATE_LABELS } from "../../lib/computer/cmosGates";
import { transistorDemo } from "../../lib/computer/demoCircuits";
import { evalGate } from "../../lib/computer/gateLogic";
import { buttonClass, controlsClass } from "./DeviceDemoParts";
import { port, useTableCircuit, withInputs } from "./TruthTables";
import table from "./TruthTables.module.css";
import { TruthTable } from "./tutorial/SpecView";
import tutorial from "./tutorial/Tutorial.module.css";

/** The lamp carries the same name as the table's output column. */
const gateCircuit = (gate: CmosGate) => {
  const circuit = transistorDemo(gate);
  return {
    ...circuit,
    nodes: circuit.nodes.map((node) => (node.id === "out" ? { ...node, label: "OUT" } : node)),
  };
};

/** Each gate's transistors beside its truth table: the table and the switches set each other. */
export function TransistorGates({
  gate: initialGate = "not",
  fixed = false,
}: {
  gate?: CmosGate;
  fixed?: boolean;
}) {
  const [gate, setGate] = useState(initialGate);
  const [circuit, setCircuit] = useState(() => gateCircuit(initialGate));
  const { render, inputs, pick } = useTableCircuit(circuit);
  const names = gate === "not" ? ["A"] : ["A", "B"];
  return (
    <section
      className={clsx("not-prose", table.demo)}
      aria-label={`${GATE_LABELS[gate]} from transistors`}
    >
      {!fixed && (
        <fieldset className={clsx(controlsClass, "mb-label")} aria-label="Gate">
          {CMOS_GATES.map((name) => (
            <button
              key={name}
              type="button"
              className={buttonClass}
              aria-label={`Show the ${GATE_LABELS[name]} gate`}
              aria-pressed={gate === name}
              onClick={() => {
                setGate(name);
                setCircuit(withInputs(gateCircuit(name), inputs));
              }}
            >
              {GATE_LABELS[name]}
            </button>
          ))}
        </fieldset>
      )}
      {render(
        <div className={tutorial.panel}>
          <h3 className={tutorial.subhead}>Truth table</h3>
          <TruthTable
            spec={{
              kind: "truth",
              inputs: names.map(port),
              outputs: [port("OUT")],
              fn: ([a, b]) => [evalGate(gate, a, b)],
            }}
            current={inputs}
            onPick={pick}
            label={`Truth table of ${GATE_LABELS[gate]}`}
          />
        </div>,
      )}
    </section>
  );
}

/** The chapter's name for the same demo, opening on AND. */
export function GateTruthTable({
  gate = "and",
  fixed,
}: {
  gate?: CmosGate;
  fixed?: boolean;
  /** Legacy article markup is accepted and ignored. */
  view?: "table" | "grid";
}) {
  return <TransistorGates gate={gate} fixed={fixed} />;
}
