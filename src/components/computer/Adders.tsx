import clsx from "clsx";
import { useRef, useState } from "react";
import { adderDemo } from "../../lib/computer/demoCircuits";
import {
  bit,
  evalGate,
  fullAdd,
  GATE_LABELS,
  halfAdd,
  inputRows,
  TRUTH_GATES,
  type TruthGate,
} from "../../lib/computer/gateLogic";
import { type LockedClock, LogicBuilder } from "./LogicBuilder";
import { CircuitPicker, port, useTableCircuit, withInputs } from "./TruthTables";
import table from "./TruthTables.module.css";
import { TruthTable } from "./tutorial/SpecView";
import tutorial from "./tutorial/Tutorial.module.css";

const TWO_INPUT_GATES = TRUTH_GATES.filter((gate) => gate !== "not");

/** One XOR and its truth table: adding two bits with nowhere to put a carry. */
function BitSum() {
  const [circuit] = useState(() => adderDemo("sum"));
  const { render, inputs, pick } = useTableCircuit(circuit);
  return (
    <section className={clsx("not-prose", table.demo)} aria-label="Adding two bits, no carry">
      {render(
        <div className={tutorial.panel}>
          <h3 className={tutorial.subhead}>Truth table</h3>
          <TruthTable
            spec={{
              kind: "truth",
              inputs: ["A", "B"].map(port),
              outputs: [port("SUM")],
              fn: ([x, y]) => [evalGate("xor", x, y)],
            }}
            current={inputs}
            onPick={pick}
            label="Truth table of the sum of two bits"
          />
        </div>,
      )}
    </section>
  );
}

/** XOR and AND together, with the truth table of one-bit addition. */
export function HalfAdder({ sumOnly = false }: { sumOnly?: boolean }) {
  return sumOnly ? <BitSum /> : <HalfAdderWithTable />;
}

function HalfAdderWithTable() {
  const [circuit] = useState(() => adderDemo("half"));
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
    <section className={clsx("not-prose", table.demo)} aria-label="Half adder">
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
          {trial && (
            <p className={tutorial.muted} aria-live="polite">
              {`${GATE_LABELS[trial]} matches SUM in ${matches("sum")} of 4 rows and CARRY in ${matches("carry")} of 4.`}
            </p>
          )}
        </div>,
      )}
    </section>
  );
}

/** Two half adders and an OR, with all eight input combinations. */
export function FullAdder({ unfolded = true }: { unfolded?: boolean }) {
  const [circuit] = useState(() =>
    withInputs(adderDemo(unfolded ? "full" : "boxed-full"), [true, false, true]),
  );
  const { render, inputs, pick } = useTableCircuit(circuit);
  const [a, b, carryIn] = inputs;
  const { sum, carry } = fullAdd(a, b, carryIn);

  return (
    <section className={clsx("not-prose", table.demo)} aria-label="Full adder">
      {render(
        <div className={tutorial.panel}>
          <h3 className={tutorial.subhead}>Truth table</h3>
          <TruthTable
            spec={{
              kind: "truth",
              inputs: ["A", "B", "CARRY IN"].map(port),
              outputs: ["CARRY", "SUM"].map(port),
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

/** The chapter's names for the two adders above, from when their tables were separate demos. */
export const AdditionTable = () => <HalfAdder />;
export const FullAdderTable = () => <FullAdder />;

/** Full adders stacked into a column: too many input rows for a table, so the board is all. */
function AdderColumn({ kind, label }: { kind: "nibble" | "byte"; label: string }) {
  const [circuit] = useState(() => adderDemo(kind));
  const [focus] = useState(() => circuit.nodes.map((node) => node.id));
  const clock = useRef<LockedClock | null>(null);
  return (
    <section className="not-prose my-6" aria-label={label}>
      <div className="h-[80svh] min-h-[640px]">
        <LogicBuilder
          embedded
          storageKey={null}
          initialFocus={focus}
          locked={{ circuit, clockRef: clock, interactiveInputs: true }}
        />
      </div>
    </section>
  );
}

export const FourBitAdder = () => <AdderColumn kind="nibble" label="Four-bit adder" />;
export const EightBitAdder = () => <AdderColumn kind="byte" label="Eight-bit adder" />;
