import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { adderDemo, gateDemo } from "src/lib/computer/demoCircuits";
import {
  bit,
  evalGate,
  fullAdd,
  GATE_LABELS,
  GATE_RULES,
  gateInputs,
  halfAdd,
  inputRows,
  rowIndex,
  TRUTH_GATES,
  type TruthGate,
} from "src/lib/computer/gateLogic";
import type { Circuit } from "src/lib/computer/logic";
import panel from "./ByteExplorer.module.css";
import gates from "./GateDemos.module.css";
import { type LockedClock, LogicBuilder } from "./LogicBuilder";
import table from "./TruthTables.module.css";

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

type ExtraColumn = { name: string; cell: (inputs: boolean[]) => ReactNode };

/** One row per combination of inputs; pressing a row sets the inputs to it. */
export function TruthList({
  inputNames,
  outputNames,
  outputs,
  current,
  onPick,
  extra,
  label,
}: {
  inputNames: string[];
  outputNames: string[];
  outputs: (inputs: boolean[]) => boolean[];
  current: number;
  onPick: (inputs: boolean[]) => void;
  extra?: ExtraColumn;
  label: string;
}) {
  const columns = `repeat(${inputNames.length + outputNames.length}, minmax(0, 1fr))${extra ? " minmax(0, 1.2fr)" : ""}`;
  const style = { "--columns": columns } as CSSProperties;
  return (
    <div>
      <div className={table.tableHead} style={style} aria-hidden="true">
        {inputNames.map((name) => (
          <span key={name}>{name}</span>
        ))}
        {outputNames.map((name, index) => (
          <span key={name} className={clsx(index === 0 && table.split)}>
            {name}
          </span>
        ))}
        {extra && <span className={table.split}>{extra.name}</span>}
      </div>
      <ol className={table.table} aria-label={label}>
        {inputRows(inputNames.length).map((row, index) => {
          const values = outputs(row);
          const description = `${inputNames.map((name, at) => `${name} ${bit(row[at])}`).join(", ")} gives ${outputNames
            .map((name, at) => `${name} ${bit(values[at])}`)
            .join(", ")}`;
          return (
            <li key={index}>
              <button
                type="button"
                className={table.row}
                style={style}
                aria-current={index === current ? "true" : undefined}
                aria-label={`${description}. Set the inputs to this row.`}
                onClick={() => onPick(row)}
              >
                {row.map((value, at) => (
                  <span key={inputNames[at]}>{bit(value)}</span>
                ))}
                {values.map((value, at) => (
                  <span
                    key={outputNames[at]}
                    className={clsx(at === 0 && table.split, value && table.out1)}
                  >
                    {bit(value)}
                  </span>
                ))}
                {extra && <span className={table.split}>{extra.cell(row)}</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** A two-input table as a 2 × 2 grid: A down the side, B across the top. */
function TruthGrid({
  output,
  inputs,
  onPick,
  name,
}: {
  output: (a: boolean, b: boolean) => boolean;
  inputs: boolean[];
  onPick: (inputs: boolean[]) => void;
  name: string;
}) {
  return (
    <div className={table.quad} role="group" aria-label={`${name} as a grid`}>
      <span />
      <span>B 0</span>
      <span>B 1</span>
      {[false, true].map((a) => (
        <GridRow
          key={String(a)}
          a={a}
          output={output}
          inputs={inputs}
          onPick={onPick}
          name={name}
        />
      ))}
    </div>
  );
}

function GridRow({
  a,
  output,
  inputs,
  onPick,
  name,
}: {
  a: boolean;
  output: (a: boolean, b: boolean) => boolean;
  inputs: boolean[];
  onPick: (inputs: boolean[]) => void;
  name: string;
}) {
  return (
    <>
      <span>A {bit(a)}</span>
      {[false, true].map((b) => {
        const out = output(a, b);
        const current = inputs[0] === a && inputs[1] === b;
        return (
          <button
            key={String(b)}
            type="button"
            data-out={out}
            aria-current={current ? "true" : undefined}
            aria-label={`A ${bit(a)}, B ${bit(b)}: ${name} ${bit(out)}. Set the inputs here.`}
            onClick={() => onPick([a, b])}
          >
            {bit(out)}
          </button>
        );
      })}
    </>
  );
}

/** Use the builder's switches and timeline as the source of the selected row. */
function useTableCircuit(circuit: Circuit) {
  const clock = useRef<LockedClock | null>(null);
  const switches = useMemo(() => circuit.nodes.filter((node) => node.type === "switch"), [circuit]);
  const [inputs, setInputs] = useState(() => switches.map((node) => Boolean(node.value)));
  const initialFocus = useMemo(() => circuit.nodes.map((node) => node.id), [circuit]);
  const board = (
    <div className={table.circuit}>
      <LogicBuilder
        embedded
        storageKey={null}
        initialFocus={initialFocus}
        locked={{
          circuit,
          clockRef: clock,
          interactiveInputs: true,
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
  return { board, inputs, pick };
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
  view: initialView = "table",
}: {
  gate?: TruthGate;
  /** Hides the gate selector for a passage about one gate. */
  fixed?: boolean;
  view?: "table" | "grid";
}) {
  const [gate, setGate] = useState<TruthGate>(initialGate);
  const [circuit, setCircuit] = useState(() => gateDemo(initialGate));
  const [view, setView] = useState(initialView);
  const { board, inputs, pick } = useTableCircuit(circuit);
  const count = gateInputs(gate);
  const names = ["A", "B"].slice(0, count);

  return (
    <section
      className={clsx("not-prose", table.demo)}
      aria-label={`Truth table of the ${GATE_LABELS[gate]} gate`}
    >
      <div className={table.toolbar}>
        {fixed ? (
          <span>{GATE_LABELS[gate]} gate</span>
        ) : (
          <label className={table.selectLabel}>
            Gate
            <select
              value={gate}
              onChange={(event) => {
                const next = event.target.value as TruthGate;
                setGate(next);
                setCircuit(withInputs(gateDemo(next), inputs));
                if (next === "not") setView("table");
              }}
            >
              {TRUTH_GATES.map((name) => (
                <option key={name} value={name}>
                  {GATE_LABELS[name]}
                </option>
              ))}
            </select>
          </label>
        )}
        {count === 2 && (
          <div className={table.segmented} role="group" aria-label="Table layout">
            {(["table", "grid"] as const).map((name) => (
              <button
                key={name}
                type="button"
                aria-pressed={view === name}
                onClick={() => setView(name)}
              >
                {name === "table" ? "Table" : "Grid"}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className={table.workspace}>
        {board}
        <div className={table.results}>
          {view === "grid" && count === 2 ? (
            <TruthGrid
              output={(a, b) => evalGate(gate, a, b)}
              inputs={inputs}
              onPick={pick}
              name={GATE_LABELS[gate]}
            />
          ) : (
            <TruthList
              inputNames={names}
              outputNames={["OUT"]}
              outputs={([a, b]) => [evalGate(gate, a, b)]}
              current={rowIndex(inputs.slice(0, count))}
              onPick={pick}
              label={`Truth table of ${GATE_LABELS[gate]}`}
            />
          )}
          <p className={table.note}>
            Choose a {view === "grid" && count === 2 ? "cell" : "row"} or flip a circuit switch.
          </p>
        </div>
      </div>
      <p className={table.rule}>
        {GATE_LABELS[gate]}: {GATE_RULES[gate]}
      </p>
    </section>
  );
}

/** Compare gates with the sum and carry of the shared half-adder circuit. */
export function AdditionTable() {
  const [circuit] = useState(() => withInputs(adderDemo("half"), [true, true]));
  const [trial, setTrial] = useState<TruthGate | null>(null);
  const { board, inputs, pick } = useTableCircuit(circuit);
  const [a, b] = inputs;
  const { sum, carry } = halfAdd(a, b);
  const matches = (column: "sum" | "carry") =>
    trial
      ? inputRows(2).filter(([x, y]) => evalGate(trial, x, y) === halfAdd(x, y)[column]).length
      : 0;

  return (
    <section
      className={clsx("not-prose", table.demo)}
      aria-label="Truth table for adding two one-bit numbers"
    >
      <div className={table.toolbar}>
        <span>Adding two bits</span>
        <label className={table.selectLabel}>
          Compare a gate
          <select
            value={trial ?? ""}
            onChange={(event) =>
              setTrial(event.target.value ? (event.target.value as TruthGate) : null)
            }
          >
            <option value="">None</option>
            {TWO_INPUT_GATES.map((name) => (
              <option key={name} value={name}>
                {GATE_LABELS[name]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={table.workspace}>
        {board}
        <div className={table.results}>
          <TruthList
            inputNames={["A", "B"]}
            outputNames={["CARRY", "SUM"]}
            outputs={([x, y]) => {
              const result = halfAdd(x, y);
              return [result.carry, result.sum];
            }}
            current={rowIndex(inputs)}
            onPick={pick}
            extra={
              trial
                ? { name: GATE_LABELS[trial], cell: ([x, y]) => bit(evalGate(trial, x, y)) }
                : undefined
            }
            label="Truth table of one-bit addition"
          />
          <p className={table.note}>Choose a row or flip a circuit switch.</p>
        </div>
      </div>
      <p className={table.rule} aria-live="polite">
        {bit(a)} + {bit(b)} = {bit(carry)}
        {bit(sum)}
      </p>
      <p className={table.note} aria-live="polite">
        {trial
          ? `${GATE_LABELS[trial]} matches SUM in ${matches("sum")} of 4 rows and CARRY in ${matches("carry")} of 4.`
          : "Which gate gives the SUM column? Which one gives CARRY?"}
      </p>
    </section>
  );
}

/** The shared full-adder circuit and all eight input combinations. */
export function FullAdderTable() {
  const [circuit] = useState(() => withInputs(adderDemo("full"), [true, false, true]));
  const { board, inputs, pick } = useTableCircuit(circuit);
  const [a, b, carryIn] = inputs;
  const { sum, carry } = fullAdd(a, b, carryIn);

  return (
    <section className={clsx("not-prose", table.demo)} aria-label="Truth table of a full adder">
      <div className={table.toolbar}>
        <span>Full adder</span>
        <span className={table.note}>CIN: carry in · COUT: carry out</span>
      </div>
      <div className={table.workspace}>
        {board}
        <div className={table.results}>
          <TruthList
            inputNames={["A", "B", "CIN"]}
            outputNames={["COUT", "SUM"]}
            outputs={([x, y, z]) => {
              const result = fullAdd(x, y, z);
              return [result.carry, result.sum];
            }}
            current={rowIndex(inputs)}
            onPick={pick}
            label="Truth table of a full adder"
          />
          <p className={table.note}>Choose a row or flip a circuit switch.</p>
        </div>
      </div>
      <p className={table.rule} aria-live="polite">
        {bit(a)} + {bit(b)} + {bit(carryIn)} = {bit(carry)}
        {bit(sum)}
      </p>
      <p className={table.note}>
        Read COUT and SUM together as one binary number. It counts how many inputs are 1.
      </p>
    </section>
  );
}
