import clsx from "clsx";
import { type ReactNode, useState } from "react";
import { type Grade, truthRows } from "../../../lib/computer/tutorial/grade";
import type { LevelSpec, SequenceSpec, TruthSpec } from "../../../lib/computer/tutorial/types";
import styles from "./Tutorial.module.css";

const bit = (value: boolean | undefined) => (value === undefined ? "·" : value ? "1" : "0");

/** Rows shown in full; longer tables show the failing row and a toggle. */
const SHORT_TABLE = 16;

export function TruthTable({
  spec,
  grade,
  current,
  onPick,
  extra,
  label = "Truth table",
}: {
  spec: TruthSpec;
  grade?: Grade;
  current?: readonly boolean[];
  onPick?: (inputs: boolean[]) => void;
  extra?: { name: string; cell: (inputs: boolean[]) => ReactNode };
  label?: string;
}) {
  const [all, setAll] = useState(false);
  const rows = truthRows(spec);
  const results = grade?.kind === "truth" ? grade.rows : undefined;
  const unwired = grade?.kind === "truth" ? grade.unwired : undefined;
  const first = grade?.kind === "truth" ? grade.first : -1;
  const columns = spec.columns
    ? spec.columns.map((id) => spec.inputs.findIndex((port) => port.id === id))
    : spec.inputs.map((_, column) => column);
  // Rows count up in binary as the columns read, left to right.
  const ordered = rows.map((_, index) => index);
  if (spec.columns) {
    const value = (index: number) =>
      columns.reduce((sum, column) => sum * 2 + (rows[index][column] ? 1 : 0), 0);
    ordered.sort((a, b) => value(a) - value(b));
  }
  const shown =
    rows.length <= SHORT_TABLE || all ? ordered : first >= 0 ? [first] : ordered.slice(0, 4);
  const yours = (actual: readonly boolean[]) =>
    actual.map((value, column) => (unwired?.[column] ? "·" : bit(value))).join(" ");
  return (
    <div className={styles.spec}>
      <div className={styles.tableScroll}>
        <table
          className={styles.truth}
          aria-label={label}
          data-interactive={Boolean(onPick) || undefined}
        >
          <thead>
            <tr>
              {columns.map((column) => {
                const port = spec.inputs[column];
                return (
                  <th key={port.id} scope="col">
                    {port.short ?? port.label}
                  </th>
                );
              })}
              {spec.outputs.map((port) => (
                <th key={port.id} scope="col" className={styles.outputHead}>
                  {port.short ?? port.label}
                </th>
              ))}
              {extra && (
                <th scope="col" className={styles.outputHead}>
                  {extra.name}
                </th>
              )}
              {results && <th scope="col">Yours</th>}
            </tr>
          </thead>
          <tbody>
            {shown.map((index) => {
              const inputs = rows[index];
              const expected = spec.fn(inputs);
              const result = results?.[index];
              const selected =
                current !== undefined && inputs.every((value, column) => value === current[column]);
              const description = `${columns.map((column) => `${spec.inputs[column].short ?? spec.inputs[column].label} ${bit(inputs[column])}`).join(", ")} gives ${spec.outputs.map((port, column) => `${port.short ?? port.label} ${bit(expected[column])}`).join(", ")}. Set the inputs to this row.`;
              return (
                <tr
                  key={index}
                  data-current={selected || undefined}
                  className={clsx(
                    result && !result.pending && (result.pass ? styles.rowPass : styles.rowFail),
                    index === first && styles.rowFirst,
                  )}
                >
                  {columns.map((column, place) => (
                    <td key={spec.inputs[column].id}>
                      {place === 0 && onPick ? (
                        <button
                          type="button"
                          className={styles.rowButton}
                          aria-label={description}
                          aria-current={selected ? "true" : undefined}
                          onClick={() => onPick(inputs)}
                        >
                          {bit(inputs[column])}
                        </button>
                      ) : (
                        bit(inputs[column])
                      )}
                    </td>
                  ))}
                  {expected.map((value, column) => (
                    <td key={spec.outputs[column].id} className={styles.outputCell}>
                      {bit(value)}
                    </td>
                  ))}
                  {extra && <td className={styles.outputCell}>{extra.cell(inputs)}</td>}
                  {result && (
                    <td className={styles.yours}>
                      {result.unstable ? "≈" : yours(result.actual)}{" "}
                      {!result.pending && (
                        <span title={result.pass ? "passes" : "fails"}>
                          {result.pass ? "✓" : "✗"}
                        </span>
                      )}
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

/** The level's spec: its truth table or tick list, with live results. */
export function SpecView({ spec, grade }: { spec: LevelSpec; grade?: Grade }) {
  if (spec.kind === "truth") return <TruthTable spec={spec} grade={grade} />;
  if (spec.kind === "sequence") return <TickList spec={spec} grade={grade} />;
  return <p className={styles.muted}>{spec.describe}</p>;
}
