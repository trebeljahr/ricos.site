import clsx from "clsx";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
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
import panel from "./ByteExplorer.module.css";
import styles from "./Codebook.module.css";
import { DemoMachine } from "./CodebookParts";
import gates from "./GateDemos.module.css";
import { GateShape, gatePorts, InputMark, LampMark, WirePath } from "./GateDiagram";

const NUMBER_WORDS = ["ZERO", "ONE", "TWO", "THREE"];
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
      <div className={gates.tableHead} style={style} aria-hidden="true">
        {inputNames.map((name) => (
          <span key={name}>{name}</span>
        ))}
        {outputNames.map((name, index) => (
          <span key={name} className={clsx(index === 0 && gates.split)}>
            {name}
          </span>
        ))}
        {extra && <span className={gates.split}>{extra.name}</span>}
      </div>
      <ol className={gates.table} aria-label={label}>
        {inputRows(inputNames.length).map((row, index) => {
          const values = outputs(row);
          const description = `${inputNames.map((name, at) => `${name} ${bit(row[at])}`).join(", ")} gives ${outputNames
            .map((name, at) => `${name} ${bit(values[at])}`)
            .join(", ")}`;
          return (
            <li key={index}>
              <button
                type="button"
                className={gates.row}
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
                    className={clsx(at === 0 && gates.split, value && gates.out1)}
                  >
                    {bit(value)}
                  </span>
                ))}
                {extra && <span className={gates.split}>{extra.cell(row)}</span>}
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
    <div className={gates.quad} role="group" aria-label={`${name} as a grid`}>
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

/** One gate drawn on the board, its inputs coming in from the left. */
function GateBoard({ gate, inputs }: { gate: TruthGate; inputs: boolean[] }) {
  const scale = 1.8;
  const x = 92;
  const y = 50 - 21 * scale;
  const ports = gatePorts(gate, x, y, scale);
  const output = evalGate(gate, inputs[0], inputs[1]);
  const names = ["A", "B"];
  return (
    <div className={gates.board}>
      <svg
        viewBox="0 0 290 100"
        role="img"
        aria-label={`${GATE_LABELS[gate]} gate. ${ports.inputs
          .map((_, index) => `${names[index]} is ${bit(inputs[index])}`)
          .join(", ")}. Output is ${bit(output)}.`}
      >
        {ports.inputs.map((port, index) => (
          <g key={names[index]}>
            <WirePath points={[{ x: 58, y: port.y }, port]} on={inputs[index]} />
            <InputMark x={58} y={port.y} on={inputs[index]} name={names[index]} />
          </g>
        ))}
        <GateShape gate={gate} x={x} y={y} scale={scale} inputs={inputs} output={output} />
        <WirePath points={[ports.output, { x: 222, y: ports.output.y }]} on={output} />
        <LampMark x={230} y={ports.output.y} on={output} name="OUT" />
      </svg>
    </div>
  );
}

/**
 * Pick a gate, flip A and B, and watch its row light up in the truth table or
 * in the 2 × 2 grid. Usable in MDX articles.
 */
export function GateTruthTable({
  gate: initialGate = "and",
  fixed = false,
  view: initialView = "table",
}: {
  gate?: TruthGate;
  /** Hides the gate keys, for a spot in the text about one gate. */
  fixed?: boolean;
  view?: "table" | "grid";
}) {
  const [gate, setGate] = useState<TruthGate>(initialGate);
  const [inputs, setInputs] = useState([false, false]);
  const [view, setView] = useState(initialView);
  const { soundEnabled, toggleSound, playSwitch, playButton } = usePanelSound();
  const count = gateInputs(gate);
  const used = inputs.slice(0, count);
  const output = evalGate(gate, inputs[0], inputs[1]);
  const names = ["A", "B"].slice(0, count);

  function flip(index: number) {
    setInputs((current) => current.map((value, at) => (at === index ? !value : value)));
    playSwitch();
  }
  function pick(row: boolean[]) {
    setInputs((current) => [row[0], row[1] ?? current[1]]);
    playButton();
  }

  return (
    <DemoMachine
      title="TRUTH TABLE"
      label={`Truth table of the ${GATE_LABELS[gate]} gate`}
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
      className={gates.demo}
    >
      <div className={styles.body}>
        <div className={styles.plate}>
          <div className={clsx(panel.sectionHead, gates.headWrap)}>
            <span>{fixed ? `${GATE_LABELS[gate]} GATE` : "GATE"}</span>
            {!fixed && (
              <div className={styles.segmented} role="group" aria-label="Gate">
                {TRUTH_GATES.map((name) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={gate === name}
                    onClick={() => {
                      setGate(name);
                      if (name === "not") setView("table");
                      playButton();
                    }}
                  >
                    {GATE_LABELS[name]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <GateBoard gate={gate} inputs={used} />
          <div className={gates.keys}>
            {names.map((name, index) => (
              <InputKey key={name} name={name} on={inputs[index]} onFlip={() => flip(index)} />
            ))}
            <span className={gates.arrow} aria-hidden="true">
              →
            </span>
            <OutputLamp name="OUT" on={output} />
          </div>
          <p className={gates.rule} aria-live="polite">
            {GATE_LABELS[gate]}: {GATE_RULES[gate]}
          </p>
        </div>
        <div className={styles.plate}>
          <div className={clsx(panel.sectionHead, gates.headWrap)}>
            <span>{view === "grid" ? "FOUR CASES" : `${2 ** count} ROWS`}</span>
            {count === 2 && (
              <div className={styles.segmented} role="group" aria-label="Table layout">
                {(["table", "grid"] as const).map((name) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={view === name}
                    onClick={() => {
                      setView(name);
                      playButton();
                    }}
                  >
                    {name.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
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
              current={rowIndex(used)}
              onPick={pick}
              label={`Truth table of ${GATE_LABELS[gate]}`}
            />
          )}
          <p className={gates.note}>
            {view === "grid" && count === 2
              ? "Each cell is one case. A lit cell means the output is 1."
              : "Each row is one case. Press a row to set the inputs."}
          </p>
        </div>
      </div>
    </DemoMachine>
  );
}

/**
 * Adding two one-bit numbers, as a truth table with a SUM and a CARRY column.
 * Trying gates against the columns finds the two that build a half adder.
 * Usable in MDX articles.
 */
export function AdditionTable() {
  const [inputs, setInputs] = useState([true, true]);
  const [trial, setTrial] = useState<TruthGate | null>(null);
  const { soundEnabled, toggleSound, playSwitch, playButton } = usePanelSound();
  const [a, b] = inputs;
  const { sum, carry } = halfAdd(a, b);
  const total = Number(a) + Number(b);
  const rows = inputRows(2);
  const matches = (column: "sum" | "carry") =>
    trial ? rows.filter(([x, y]) => evalGate(trial, x, y) === halfAdd(x, y)[column]).length : 0;

  return (
    <DemoMachine
      title="ADDING TWO BITS"
      label="Truth table for adding two one-bit numbers"
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
      className={gates.demo}
    >
      <div className={styles.body}>
        <div className={styles.plate}>
          <div className={panel.sectionHead}>
            <span>A + B</span>
          </div>
          <div className={clsx(panel.screen, styles.lcd)} aria-live="polite">
            <div className={panel.screenTop}>
              <span>RESULT</span>
              <span>CARRY · SUM</span>
            </div>
            <div className={gates.sumLine}>
              {bit(a)} + {bit(b)} = {bit(carry)}
              {bit(sum)}
            </div>
            <div className={styles.lcdLine}>
              {NUMBER_WORDS[Number(a)]} + {NUMBER_WORDS[Number(b)]} = {NUMBER_WORDS[total]}
            </div>
          </div>
          <div className={gates.keys}>
            <InputKey
              name="A"
              on={a}
              onFlip={() => {
                setInputs([!a, b]);
                playSwitch();
              }}
            />
            <InputKey
              name="B"
              on={b}
              onFlip={() => {
                setInputs([a, !b]);
                playSwitch();
              }}
            />
            <span className={gates.arrow} aria-hidden="true">
              →
            </span>
            <OutputLamp name="CARRY" on={carry} />
            <OutputLamp name="SUM" on={sum} />
          </div>
          <p className={gates.note}>
            1 + 1 does not fit in one bit. SUM shows 0 and CARRY takes the 1 to the next column.
          </p>
        </div>
        <div className={styles.plate}>
          <div className={clsx(panel.sectionHead, gates.headWrap)}>
            <span>TRY A GATE</span>
            <div className={styles.segmented} role="group" aria-label="Gate to compare">
              {TWO_INPUT_GATES.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={trial === name}
                  onClick={() => {
                    setTrial(trial === name ? null : name);
                    playButton();
                  }}
                >
                  {GATE_LABELS[name]}
                </button>
              ))}
            </div>
          </div>
          <TruthList
            inputNames={["A", "B"]}
            outputNames={["CARRY", "SUM"]}
            outputs={([x, y]) => {
              const result = halfAdd(x, y);
              return [result.carry, result.sum];
            }}
            current={rowIndex(inputs)}
            onPick={(row) => {
              setInputs(row);
              playButton();
            }}
            extra={
              trial
                ? { name: GATE_LABELS[trial], cell: ([x, y]) => bit(evalGate(trial, x, y)) }
                : undefined
            }
            label="Truth table of one-bit addition"
          />
          <p className={gates.rule} aria-live="polite">
            {trial
              ? `${GATE_LABELS[trial]} matches SUM in ${matches("sum")} of 4 rows and CARRY in ${matches("carry")} of 4.`
              : "Pick a gate. Which one gives the SUM column? Which one gives CARRY?"}
          </p>
        </div>
      </div>
    </DemoMachine>
  );
}

/**
 * Adding three one-bit numbers: A, B and a carry from the column before. The
 * two outputs, read together, count the inputs that are on. Usable in MDX articles.
 */
export function FullAdderTable() {
  const [inputs, setInputs] = useState([true, false, true]);
  const { soundEnabled, toggleSound, playSwitch, playButton } = usePanelSound();
  const [a, b, carryIn] = inputs;
  const { sum, carry } = fullAdd(a, b, carryIn);
  const total = inputs.filter(Boolean).length;
  const names = ["A", "B", "CIN"];

  return (
    <DemoMachine
      title="FULL ADDER TABLE"
      label="Truth table of a full adder"
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
      className={gates.demo}
    >
      <div className={styles.body}>
        <div className={styles.plate}>
          <div className={panel.sectionHead}>
            <span>A + B + CARRY IN</span>
          </div>
          <div className={clsx(panel.screen, styles.lcd)} aria-live="polite">
            <div className={panel.screenTop}>
              <span>RESULT</span>
              <span>COUT · SUM</span>
            </div>
            <div className={gates.sumLine}>
              {bit(a)} + {bit(b)} + {bit(carryIn)} = {bit(carry)}
              {bit(sum)}
            </div>
            <div className={styles.lcdLine}>
              {NUMBER_WORDS[total]} {total === 1 ? "INPUT IS" : "INPUTS ARE"} ON
            </div>
          </div>
          <div className={gates.keys}>
            {names.map((name, index) => (
              <InputKey
                key={name}
                name={name}
                on={inputs[index]}
                onFlip={() => {
                  setInputs(inputs.map((value, at) => (at === index ? !value : value)));
                  playSwitch();
                }}
              />
            ))}
            <span className={gates.arrow} aria-hidden="true">
              →
            </span>
            <OutputLamp name="COUT" on={carry} />
            <OutputLamp name="SUM" on={sum} />
          </div>
          <p className={gates.note}>
            CIN is the carry from the column to the right. COUT goes on to the column to the left.
          </p>
        </div>
        <div className={styles.plate}>
          <div className={panel.sectionHead}>
            <span>8 ROWS</span>
            <span>3 INPUTS</span>
          </div>
          <TruthList
            inputNames={names}
            outputNames={["COUT", "SUM"]}
            outputs={([x, y, z]) => {
              const result = fullAdd(x, y, z);
              return [result.carry, result.sum];
            }}
            current={rowIndex(inputs)}
            onPick={(row) => {
              setInputs(row);
              playButton();
            }}
            label="Truth table of a full adder"
          />
          <p className={gates.note}>
            Read COUT and SUM together as one binary number. It counts how many inputs are 1.
          </p>
        </div>
      </div>
    </DemoMachine>
  );
}
