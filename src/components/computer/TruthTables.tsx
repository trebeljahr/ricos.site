import clsx from "clsx";
import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { adderDemo, gateDemo } from "src/lib/computer/demoCircuits";
import {
  bit,
  evalGate,
  fullAdd,
  GATE_LABELS,
  GATE_RULES,
  halfAdd,
  inputRows,
  TRUTH_GATES,
  type TruthGate,
} from "src/lib/computer/gateLogic";
import { type Circuit, gateIds } from "src/lib/computer/logic";
import panel from "./ByteExplorer.module.css";
import toolbar from "./CircuitToolbar.module.css";
import gates from "./GateDemos.module.css";
import { type LockedClock, LogicBuilder } from "./LogicBuilder";
import { ToolbarMenu } from "./ToolbarMenu";
import table from "./TruthTables.module.css";
import { TruthTable } from "./tutorial/SpecView";
import tutorial from "./tutorial/Tutorial.module.css";

const TWO_INPUT_GATES = TRUTH_GATES.filter((gate) => gate !== "not");

/** A key for one input, with its name above. */
export function InputKey({ name, on, onFlip }: { name: string; on: boolean; onFlip: () => void }) {
  return (
    <div className={gates.key}>
      <span aria-hidden="true">{name}</span>
      <button
        type="button"
        className={panel.bitButton}
        onClick={onFlip}
        aria-pressed={on}
        aria-label={`Input ${name}: ${on ? "1" : "0"}. Flip.`}
      >
        {bit(on)}
      </button>
    </div>
  );
}

/** A lamp for one output, with its name above and its value below. */
export function OutputLamp({ name, on }: { name: string; on: boolean }) {
  return (
    <div className={gates.lampOut} role="img" aria-label={`Output ${name}: ${on ? "1" : "0"}`}>
      <span aria-hidden="true">{name}</span>
      <i data-on={on} aria-hidden="true" />
      <span aria-hidden="true">{bit(on)}</span>
    </div>
  );
}

/** The same menu surface used for the builder's File, View and Clock menus. */
function CircuitPicker({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={clsx(toolbar.root, table.picker)}>
      <ToolbarMenu label={label} closeOnSelect>
        {children}
      </ToolbarMenu>
    </div>
  );
}

const port = (name: string) => ({ id: name.toLowerCase(), label: name });

/** Use the builder's switches and timeline as the source of the selected row. */
function useTableCircuit(circuit: Circuit, controls?: ReactNode) {
  const clock = useRef<LockedClock | null>(null);
  const switches = useMemo(() => circuit.nodes.filter((node) => node.type === "switch"), [circuit]);
  const [inputs, setInputs] = useState(() => switches.map((node) => Boolean(node.value)));
  const initialFocus = useMemo(() => circuit.nodes.map((node) => node.id), [circuit]);
  const unfolded = useMemo(() => gateIds(circuit), [circuit]);
  const render = (sidebar: ReactNode) => (
    <div className={table.circuit}>
      <LogicBuilder
        embedded
        storageKey={null}
        initialFocus={initialFocus}
        locked={{
          circuit,
          clockRef: clock,
          unfolded,
          interactiveInputs: true,
          controls,
          panel: sidebar,
          panelLabel: "Truth table",
          onFrame: ({ frame }) => {
            const next = switches.map((node) => Boolean(frame.snapshot.values[node.id]));
            setInputs((current) =>
              next.every((value, index) => value === current[index]) &&
              next.length === current.length
                ? current
                : next,
            );
          },
        }}
      />
    </div>
  );
  const pick = (row: boolean[]) => {
    clock.current?.input(Object.fromEntries(switches.map((node, index) => [node.id, row[index]])));
  };
  return { render, inputs, pick };
}

function withInputs(circuit: Circuit, inputs: boolean[]): Circuit {
  let index = 0;
  return {
    ...circuit,
    nodes: circuit.nodes.map((node) =>
      node.type === "switch" ? { ...node, value: inputs[index++] ?? false } : node,
    ),
  };
}

/** Pick a gate and try its inputs in the shared circuit explorer or truth table. */
export function GateTruthTable({
  gate: initialGate = "and",
  fixed = false,
}: {
  gate?: TruthGate;
  /** Hides the gate selector for a passage about one gate. */
  fixed?: boolean;
  /** Legacy article markup is accepted; every gate now uses the shared table. */
  view?: "table" | "grid";
}) {
  const [gate, setGate] = useState<TruthGate>(initialGate);
  const [circuit, setCircuit] = useState(() => gateDemo(initialGate));
  const { render, inputs, pick } = useTableCircuit(
    circuit,
    !fixed && (
      <CircuitPicker label={`Gate: ${GATE_LABELS[gate]}`}>
        {TRUTH_GATES.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={gate === name}
            onClick={() => {
              setGate(name);
              setCircuit(withInputs(gateDemo(name), inputs));
            }}
          >
            {GATE_LABELS[name]}
          </button>
        ))}
      </CircuitPicker>
    ),
  );
  const names = gate === "not" ? ["A"] : ["A", "B"];

  return (
    <section
      className={clsx("not-prose", table.demo)}
      aria-label={`Truth table of the ${GATE_LABELS[gate]} gate`}
    >
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
          <p>
            {GATE_LABELS[gate]}: {GATE_RULES[gate]}
          </p>
        </div>,
      )}
    </section>
  );
}

/** Compare gates with the sum and carry of the shared half-adder circuit. */
export function AdditionTable() {
  const [circuit] = useState(() => withInputs(adderDemo("half"), [true, true]));
  const [trial, setTrial] = useState<TruthGate | null>(null);
  const { render, inputs, pick } = useTableCircuit(
    circuit,
    <CircuitPicker label={`Compare: ${trial ? GATE_LABELS[trial] : "None"}`}>
      {[null, ...TWO_INPUT_GATES].map((name) => (
        <button
          key={name ?? "none"}
          type="button"
          aria-pressed={trial === name}
          onClick={() => setTrial(name)}
        >
          {name ? GATE_LABELS[name] : "None"}
        </button>
      ))}
    </CircuitPicker>,
  );
  const [a, b] = inputs;
  const { sum, carry } = halfAdd(a, b);
  const matches = (column: "sum" | "carry") =>
    trial
      ? inputRows(2).filter(([x, y]) => evalGate(trial, x, y) === halfAdd(x, y)[column]).length
      : 0;

  return (
    <section
      className={clsx("not-prose", table.demo)}
      aria-label={"Truth table for adding two one-bit numbers"}
    >
      {render(
        <div className={tutorial.panel}>
          <h3 className={tutorial.subhead}>Truth table</h3>
          <TruthTable
            spec={{
              kind: "truth",
              inputs: ["A", "B"].map(port),
              outputs: ["CARRY", "SUM"].map(port),
              fn: ([x, y]) => {
                const result = halfAdd(x, y);
                return [result.carry, result.sum];
              },
            }}
            current={inputs}
            onPick={pick}
            extra={
              trial
                ? { name: GATE_LABELS[trial], cell: ([x, y]) => bit(evalGate(trial, x, y)) }
                : undefined
            }
            label="Truth table of one-bit addition"
          />
          <p aria-live="polite">
            {bit(a)} + {bit(b)} = {bit(carry)}
            {bit(sum)}
          </p>
          <p className={tutorial.muted} aria-live="polite">
            {trial
              ? `${GATE_LABELS[trial]} matches SUM in ${matches("sum")} of 4 rows and CARRY in ${matches("carry")} of 4.`
              : "Which gate gives the SUM column? Which one gives CARRY?"}
          </p>
        </div>,
      )}
    </section>
  );
}

/** The shared full-adder circuit and all eight input combinations. */
export function FullAdderTable() {
  const [circuit] = useState(() => withInputs(adderDemo("full"), [true, false, true]));
  const { render, inputs, pick } = useTableCircuit(circuit);
  const [a, b, carryIn] = inputs;
  const { sum, carry } = fullAdd(a, b, carryIn);

  return (
    <section className={clsx("not-prose", table.demo)} aria-label={"Truth table of a full adder"}>
      {render(
        <div className={tutorial.panel}>
          <h3 className={tutorial.subhead}>Truth table</h3>
          <TruthTable
            spec={{
              kind: "truth",
              inputs: ["A", "B", "CIN"].map(port),
              outputs: ["COUT", "SUM"].map(port),
              fn: ([x, y, z]) => {
                const result = fullAdd(x, y, z);
                return [result.carry, result.sum];
              },
            }}
            current={inputs}
            onPick={pick}
            label="Truth table of a full adder"
          />
          <p aria-live="polite">
            {bit(a)} + {bit(b)} + {bit(carryIn)} = {bit(carry)}
            {bit(sum)}
          </p>
        </div>,
      )}
    </section>
  );
}
