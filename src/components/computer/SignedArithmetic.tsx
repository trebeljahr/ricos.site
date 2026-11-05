import clsx from "clsx";
import { type CSSProperties, type ReactNode, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";

import {
  ARITHMETIC_ENCODINGS,
  type ArithmeticEncoding,
  type ArithmeticOperation,
  type ArithmeticStep,
  arithmeticPresets,
  type Bit,
  bitMask,
  decodeInteger,
  displayInteger,
  encodeInteger,
  type SignedWidth,
  sheetAt,
  stepHeading,
  stepReadout,
  workColumns,
} from "../../lib/computer/signedNumbers";
import panel from "./ByteExplorer.module.css";
import codebook from "./Codebook.module.css";
import { DemoMachine } from "./CodebookParts";
import styles from "./SignedArithmetic.module.css";
import signed from "./SignedNumbers.module.css";

type RowName = "carry" | "a" | "b" | "addend" | "sum" | "second" | "final";

const PASS_ONE_ROWS: RowName[] = ["carry", "a", "sum"];
const PASS_TWO_ROWS: RowName[] = ["sum", "second", "final"];

/** Whether this step is working on this cell. A column of `width` is the carry out of the top. */
function isCurrent(
  step: ArithmeticStep | null,
  row: RowName,
  column: number,
  width: SignedWidth,
  subtract: boolean,
) {
  if (!step || step.kind === "result") return false;
  if (step.kind === "invert") return column === step.column && (row === "b" || row === "addend");
  if (step.kind === "first-carry") return row === "carry" && column === 0;
  if (step.kind === "carry-out") {
    if (row === "carry") return column === width;
    return step.fate === "wrapped" && row === "second" && column === 0;
  }
  if (column !== step.column) return false;
  if (step.pass === 2) return PASS_TWO_ROWS.includes(row);
  return PASS_ONE_ROWS.includes(row) || row === (subtract ? "addend" : "b");
}

function SheetRow({
  row,
  label,
  width,
  subtract,
  step,
  cells,
  carryOut = null,
  carryOutClass,
  value = null,
  valueClass,
  className,
}: {
  row: RowName;
  label: string;
  width: SignedWidth;
  subtract: boolean;
  step: ArithmeticStep | null;
  /** Indexed by column. */
  cells: ReactNode[];
  carryOut?: ReactNode;
  carryOutClass?: string;
  value?: ReactNode;
  valueClass?: string;
  className?: string;
}) {
  const current = (column: number) => isCurrent(step, row, column, width, subtract);
  return (
    <tr className={clsx(styles.row, className)}>
      <th scope="row" className={styles.label}>
        {label}
      </th>
      <td className={clsx(styles.cell, carryOutClass, current(width) && styles.current)}>
        {carryOut}
      </td>
      {cells
        .map((cell, column) => (
          <td
            key={column}
            className={clsx(styles.cell, current(column) && styles.current)}
            data-column={column}
          >
            {cell}
          </td>
        ))
        .reverse()}
      <td className={clsx(styles.value, valueClass)}>{value}</td>
    </tr>
  );
}

const bitsOf = (raw: number, width: SignedWidth): Bit[] =>
  Array.from({ length: width }, (_, column) => ((raw >> column) & 1) as Bit);

const complete = (cells: (Bit | null)[]) => cells.every((bit) => bit !== null);

const rawOf = (cells: (Bit | null)[]) =>
  cells.reduce<number>((sum, bit, column) => sum + (bit ?? 0) * 2 ** column, 0);

function Carry({ bit }: { bit: Bit | null }) {
  if (bit === null) return null;
  return (
    <span className={styles.carryDigit} data-on={bit === 1}>
      {bit}
    </span>
  );
}

/** A number's stepping keys. They walk the patterns in order, the way a counter does. */
function Nudge({ name, onStep }: { name: string; onStep: (by: number) => void }) {
  return (
    <div className={styles.nudge}>
      <b>{name}</b>
      <button
        type="button"
        className={clsx(panel.bitButton, styles.nudgeKey)}
        aria-label={`${name} minus 1`}
        onClick={() => onStep(-1)}
      >
        −1
      </button>
      <button
        type="button"
        className={clsx(panel.bitButton, styles.nudgeKey)}
        aria-label={`${name} plus 1`}
        onClick={() => onStep(1)}
      >
        +1
      </button>
    </div>
  );
}

export function SignedArithmetic() {
  const [a, setA] = useState(0b0010);
  const [b, setB] = useState(0b1011);
  const [width, setWidth] = useState<SignedWidth>(4);
  const [encoding, setEncoding] = useState<ArithmeticEncoding>("twos-complement");
  const [operation, setOperation] = useState<ArithmeticOperation>("add");
  const [position, setPosition] = useState(0);
  const { soundEnabled, toggleSound, playButton, playSwitch, playToggle } = usePanelSound();

  const subtract = operation === "subtract";
  const work = workColumns(a, b, width, encoding, operation);
  const sheet = sheetAt(work, position);
  const { step, done } = sheet;
  const total = work.steps.length;
  const lines = stepReadout(work, step);
  const read = (raw: number) => displayInteger(decodeInteger(raw, width, encoding));
  const wrapped = sheet.fate === "wrapped";
  const alarm = done && work.overflow;

  /** Keep the sum the reader chose: the numbers stay, their patterns follow the encoding. */
  const reencode = (nextWidth: SignedWidth, nextEncoding: ArithmeticEncoding) => {
    setA(encodeInteger(decodeInteger(a, width, encoding), nextWidth, nextEncoding));
    setB(encodeInteger(decodeInteger(b, width, encoding), nextWidth, nextEncoding));
    setWidth(nextWidth);
    setEncoding(nextEncoding);
    setPosition(0);
    playSwitch();
  };
  const flip = (name: "A" | "B", column: number) => {
    const raw = name === "A" ? a : b;
    (name === "A" ? setA : setB)(raw ^ (1 << column));
    setPosition(0);
    playToggle(!(raw & (1 << column)));
  };
  const nudge = (name: "A" | "B", by: number) => {
    const raw = name === "A" ? a : b;
    (name === "A" ? setA : setB)((raw + by) & bitMask(width));
    setPosition(0);
    playButton();
  };
  const walkTo = (next: number) => {
    setPosition(Math.max(0, Math.min(total, next)));
    playButton();
  };

  const inputCells = (name: "A" | "B", raw: number) =>
    bitsOf(raw, width).map((bit, column) => (
      <button
        type="button"
        role="switch"
        aria-checked={bit === 1}
        aria-label={`${name} bit ${column}`}
        className={styles.bit}
        key={column}
        onClick={() => flip(name, column)}
      >
        {bit}
      </button>
    ));

  return (
    <DemoMachine
      title="SIGNED ARITHMETIC"
      label="Signed arithmetic"
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
      className={signed.explorer}
    >
      <div className={clsx(signed.plate, styles.plate)}>
        <div className={signed.selectors}>
          <fieldset className={signed.selector}>
            <legend>ENCODING</legend>
            <div className={clsx(panel.presetRow, signed.modes)}>
              {ARITHMETIC_ENCODINGS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={item.id === encoding}
                  onClick={() => reencode(width, item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className={signed.selector}>
            <legend>OPERATION</legend>
            <div className={clsx(panel.presetRow, signed.modes)}>
              {(
                [
                  ["add", "A + B"],
                  ["subtract", "A − B"],
                ] as const
              ).map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  aria-pressed={id === operation}
                  onClick={() => {
                    setOperation(id);
                    setPosition(0);
                    playSwitch();
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className={signed.selector}>
            <legend>WIDTH</legend>
            <div className={clsx(panel.presetRow, signed.modes)}>
              {([4, 8] as const).map((bits) => (
                <button
                  type="button"
                  key={bits}
                  aria-pressed={width === bits}
                  onClick={() => reencode(bits, encoding)}
                >
                  {bits} BITS
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <fieldset className={signed.selector}>
          <legend>SUMS</legend>
          <div className={clsx(panel.presetRow, signed.modes)}>
            {arithmeticPresets(width, encoding).map((preset) => (
              <button
                type="button"
                key={preset.label}
                aria-pressed={preset.a === a && preset.b === b && preset.operation === operation}
                onClick={() => {
                  setA(preset.a);
                  setB(preset.b);
                  setOperation(preset.operation);
                  setPosition(0);
                  playButton();
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className={styles.nudges}>
          <Nudge name="A" onStep={(by) => nudge("A", by)} />
          <Nudge name="B" onStep={(by) => nudge("B", by)} />
        </div>

        <div className={styles.paper}>
          <table
            className={styles.sheet}
            data-bits={width}
            data-wrapped={wrapped}
            style={{ "--columns": width + 1 } as CSSProperties}
            aria-label="Long-form working"
          >
            <thead>
              <tr className={styles.row}>
                <th className={styles.label} />
                <th className={styles.place} />
                {bitsOf(0, width)
                  .map((_, column) => (
                    <th key={column} className={styles.place}>
                      {column}
                    </th>
                  ))
                  .reverse()}
                <th className={styles.value} />
              </tr>
            </thead>
            <tbody>
              <SheetRow
                row="carry"
                label="carry"
                className={styles.carryRow}
                width={width}
                subtract={subtract}
                step={step}
                cells={sheet.carries.slice(0, width).map((bit, column) => (
                  <span
                    key={column}
                    className={clsx(alarm && column === width - 1 && styles.clash)}
                  >
                    <Carry bit={bit} />
                  </span>
                ))}
                carryOut={
                  <span
                    className={clsx(
                      sheet.fate === "dropped" && styles.dropped,
                      wrapped && styles.wrappedDigit,
                      alarm && styles.clash,
                    )}
                  >
                    <Carry bit={sheet.carries[width] ?? null} />
                  </span>
                }
              />
              <SheetRow
                row="a"
                label="A"
                width={width}
                subtract={subtract}
                step={step}
                cells={inputCells("A", a)}
                carryOutClass={clsx(wrapped && styles.wrapDown)}
                value={read(a)}
              />
              <SheetRow
                row="b"
                label={subtract ? "−B" : "+B"}
                className={clsx(subtract && complete(sheet.addend) && styles.spent)}
                width={width}
                subtract={subtract}
                step={step}
                cells={inputCells("B", b)}
                carryOutClass={clsx(wrapped && styles.wrapDown)}
                value={read(b)}
              />
              {subtract && (
                <SheetRow
                  row="addend"
                  label="+NOT B"
                  width={width}
                  subtract={subtract}
                  step={step}
                  cells={sheet.addend}
                  carryOutClass={clsx(wrapped && styles.wrapDown)}
                  value={complete(sheet.addend) ? read(work.addend) : null}
                />
              )}
              <SheetRow
                row="sum"
                label="sum"
                className={clsx(styles.ruled, styles.answer)}
                width={width}
                subtract={subtract}
                step={step}
                cells={sheet.sum}
                carryOutClass={clsx(wrapped && styles.wrapDown)}
                value={complete(sheet.sum) ? read(rawOf(sheet.sum)) : null}
                valueClass={clsx(alarm && !work.endAround && styles.valueAlarm)}
              />
              {work.endAround && (
                <>
                  <tr className={styles.wrapRow}>
                    <td />
                    <td className={clsx(wrapped && styles.wrapCorner)} />
                    {bitsOf(0, width)
                      .map((_, column) => (
                        <td
                          key={column}
                          className={clsx(
                            wrapped && (column === 0 ? styles.wrapEnd : styles.wrapRun),
                          )}
                        />
                      ))
                      .reverse()}
                    <td />
                  </tr>
                  <SheetRow
                    row="second"
                    label={wrapped ? "carry" : ""}
                    className={styles.carryRow}
                    width={width}
                    subtract={subtract}
                    step={step}
                    cells={sheet.secondCarries.map((bit, column) => (
                      <Carry key={column} bit={bit} />
                    ))}
                  />
                  <SheetRow
                    row="final"
                    label={wrapped ? "final" : ""}
                    className={clsx(wrapped && styles.ruled, styles.answer)}
                    width={width}
                    subtract={subtract}
                    step={step}
                    cells={sheet.final}
                    value={complete(sheet.final) ? read(rawOf(sheet.final)) : null}
                    valueClass={clsx(alarm && styles.valueAlarm)}
                  />
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className={clsx(panel.presetRow, signed.modes, styles.walk)}>
          <button
            type="button"
            aria-disabled={position === 0 || undefined}
            onClick={() => position > 0 && walkTo(position - 1)}
          >
            BACK
          </button>
          <button
            type="button"
            className={styles.stepKey}
            aria-disabled={done || undefined}
            onClick={() => !done && walkTo(position + 1)}
          >
            STEP
          </button>
          <button
            type="button"
            aria-disabled={done || undefined}
            onClick={() => !done && walkTo(total)}
          >
            SHOW ALL
          </button>
          <button
            type="button"
            aria-disabled={position === 0 || undefined}
            onClick={() => position > 0 && walkTo(0)}
          >
            RESTART
          </button>
        </div>

        <div
          className={clsx(panel.screen, codebook.lcd, styles.readout, alarm && codebook.lcdAlert)}
          aria-live="polite"
        >
          <div className={panel.screenTop}>
            <span>{stepHeading(step)}</span>
            <span>
              {position}/{total}
            </span>
          </div>
          <output aria-label="What this step did" className={styles.lines}>
            {lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </output>
        </div>
      </div>
    </DemoMachine>
  );
}
