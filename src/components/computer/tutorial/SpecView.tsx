import clsx from "clsx";
import { useState } from "react";
import {
  describeInputs,
  describeMiss,
  describeTick,
  type Grade,
  truthRows,
} from "../../../lib/computer/tutorial/grade";
import type { LevelSpec, SequenceSpec, TruthSpec } from "../../../lib/computer/tutorial/types";
import styles from "./Tutorial.module.css";

const bit = (value: boolean | undefined) => (value === undefined ? "·" : value ? "1" : "0");

/** Rows shown in full; longer tables show the failing row and a toggle. */
const SHORT_TABLE = 16;

function TruthTable({ spec, grade }: { spec: TruthSpec; grade?: Grade }) {
  const [all, setAll] = useState(false);
  const rows = truthRows(spec);
  const results = grade?.kind === "truth" ? grade.rows : undefined;
  const first = grade?.kind === "truth" ? grade.first : -1;
  const shown =
    rows.length <= SHORT_TABLE || all
      ? rows.map((_, index) => index)
      : first >= 0
        ? [first]
        : rows.slice(0, 4).map((_, index) => index);
  return (
    <div className={styles.spec}>
      <div className={styles.tableScroll}>
        <table className={styles.truth}>
          <thead>
            <tr>
              {spec.inputs.map((port) => (
                <th key={port.id} scope="col">
                  {port.short ?? port.label}
                </th>
              ))}
              {spec.outputs.map((port) => (
                <th key={port.id} scope="col" className={styles.outputHead}>
                  {port.short ?? port.label}
                </th>
              ))}
              {results && <th scope="col">Yours</th>}
            </tr>
          </thead>
          <tbody>
            {shown.map((index) => {
              const inputs = rows[index];
              const expected = spec.fn(inputs);
              const result = results?.[index];
              return (
                <tr
                  key={index}
                  className={clsx(
                    result && (result.pass ? styles.rowPass : styles.rowFail),
                    index === first && styles.rowFirst,
                  )}
                >
                  {inputs.map((value, column) => (
                    <td key={spec.inputs[column].id}>{bit(value)}</td>
                  ))}
                  {expected.map((value, column) => (
                    <td key={spec.outputs[column].id} className={styles.outputCell}>
                      {bit(value)}
                    </td>
                  ))}
                  {result && (
                    <td className={styles.yours}>
                      {result.unstable ? "≈" : result.actual.map(bit).join(" ")}{" "}
                      <span title={result.pass ? "passes" : "fails"}>
                        {result.pass ? "✓" : "✗"}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > SHORT_TABLE && (
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => setAll((value) => !value)}
        >
          {all ? "Show fewer rows" : `Show all ${rows.length} rows`}
        </button>
      )}
    </div>
  );
}

function TickList({ spec, grade }: { spec: SequenceSpec; grade?: Grade }) {
  const [all, setAll] = useState(false);
  const results = grade?.kind === "sequence" ? grade.ticks : undefined;
  const first = grade?.kind === "sequence" ? grade.first : -1;
  const indices =
    all || spec.ticks.length <= 24
      ? spec.ticks.map((_, i) => i)
      : [
          ...new Set([
            0,
            1,
            2,
            ...(first >= 0 ? [Math.max(0, first - 1), first] : []),
            spec.ticks.length - 1,
          ]),
        ];
  return (
    <div>
      {spec.ticks.length > 24 && (
        <button
          type="button"
          className={styles.linkButton}
          onClick={() => setAll((value) => !value)}
        >
          {all ? "Show fewer ticks" : `Show all ${spec.ticks.length} test ticks`}
        </button>
      )}
      <ol className={styles.ticks}>
        {indices.map((index) => {
          const tick = spec.ticks[index];
          const result = results?.[index];
          const expect = Object.entries(tick.expect ?? {});
          return (
            <li
              key={index}
              className={clsx(
                result && expect.length && (result.pass ? styles.rowPass : styles.rowFail),
                index === first && styles.rowFirst,
              )}
            >
              <span>{tick.note}</span>
              {expect.length > 0 && (
                <small>
                  {expect
                    .map(([id, value]) => {
                      const port = spec.outputs.find((item) => item.id === id);
                      return `${port?.short ?? port?.label ?? id}=${bit(value)}`;
                    })
                    .join(" ")}
                  {result && (result.pass ? " ✓" : " ✗")}
                </small>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The level's spec: its truth table or tick list, with results once checked. */
export function SpecView({ spec, grade }: { spec: LevelSpec; grade?: Grade }) {
  if (spec.kind === "truth") return <TruthTable spec={spec} grade={grade} />;
  if (spec.kind === "sequence") return <TickList spec={spec} grade={grade} />;
  return <p className={styles.muted}>{spec.describe}</p>;
}

/** One sentence on a failed check: the first wrong row or tick. */
export function failureSentence(spec: LevelSpec, grade: Grade): string | undefined {
  if (grade.kind === "truth" && spec.kind === "truth" && grade.first >= 0) {
    const row = grade.rows[grade.first];
    return `Row ${grade.first + 1} fails (${describeInputs(spec.inputs, row.inputs)}): ${describeMiss(spec.outputs, row)}`;
  }
  if (grade.kind === "sequence" && spec.kind === "sequence" && grade.first >= 0) {
    const tick = grade.ticks[grade.first];
    return `Tick ${grade.first + 1} fails (${tick.note}) ${describeTick(spec.outputs, tick)}`;
  }
  return undefined;
}
