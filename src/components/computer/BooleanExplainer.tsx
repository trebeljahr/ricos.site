import type { ReactNode } from "react";
import { useId, useState } from "react";
import {
  BOOLEAN_EXPLANATIONS,
  type BooleanExplanationTopic,
  MAX_BOOLEAN_INPUTS,
  truthTablePreview,
  truthTableSize,
} from "src/lib/computer/booleanExplanations";
import { Callout } from "../Callouts";
import styles from "./BooleanExplainer.module.css";

/** The same explanation can be embedded in several places, including inside another explanation. */
export function BooleanExplanation({
  topic,
  children,
}: {
  topic: BooleanExplanationTopic;
  children?: ReactNode;
}) {
  const explanation = BOOLEAN_EXPLANATIONS[topic];
  return (
    <div className={styles.explanation}>
      <Callout type="aside" isFoldable defaultFolded title={explanation.title}>
        {explanation.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        {children}
      </Callout>
    </div>
  );
}

/** Row counts grow exponentially; function counts choose an output independently for every row. */
export function TruthTableScale() {
  const rangeId = useId();
  const [inputs, setInputs] = useState(2);
  const [outputs, setOutputs] = useState(0);
  const size = truthTableSize(inputs);
  const preview = truthTablePreview(inputs);
  const names = "ABCDEFGH".slice(0, inputs).split("");
  const column = preview.map((_, index) => String((outputs >> index) & 1)).join("");

  return (
    <section className={`${styles.root} ${styles.section}`} aria-label="Truth table size explorer">
      <span className={styles.eyebrow}>Input cases and output choices</span>
      <h2>How large does the table get?</h2>
      <label className={styles.rangeLabel} htmlFor={rangeId}>
        <span className={styles.rangeTitle}>
          <span>Number of input variables</span>
          <strong>n = {inputs}</strong>
        </span>
        <input
          id={rangeId}
          type="range"
          min={0}
          max={MAX_BOOLEAN_INPUTS}
          step={1}
          value={inputs}
          aria-valuetext={`${inputs} input variables`}
          onChange={(event) => {
            setInputs(Number(event.target.value));
            setOutputs(0);
          }}
        />
        <span className={styles.rangeEnds} aria-hidden="true">
          <span>0</span>
          <span>{MAX_BOOLEAN_INPUTS}</span>
        </span>
      </label>
      <dl className={styles.counts}>
        <div>
          <dt>Rows in one truth table</dt>
          <dd>{size.rows.toLocaleString("en-US")}</dd>
          <dd className={styles.countFormula}>
            2<sup>{inputs}</sup> input combinations
          </dd>
        </div>
        <div>
          <dt>Different functions with one output bit</dt>
          <dd>{size.functions.toLocaleString("en-US")}</dd>
          <dd className={styles.countFormula}>
            2<sup>{size.rows}</sup> different output columns
          </dd>
        </div>
      </dl>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <caption>Choose the output for each input case.</caption>
          <thead>
            <tr>
              {inputs === 0 ? (
                <th scope="col">Input</th>
              ) : (
                names.map((name) => (
                  <th scope="col" key={name}>
                    {name}
                  </th>
                ))
              )}
              <th scope="col">Output</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((row, rowIndex) => {
              const on = Boolean((outputs >> rowIndex) & 1);
              const pattern = row.map(Number).join("") || "no inputs";
              return (
                <tr key={pattern}>
                  {inputs === 0 ? (
                    <td>No inputs</td>
                  ) : (
                    row.map((value, index) => <td key={names[index]}>{Number(value)}</td>)
                  )}
                  <td>
                    <button
                      type="button"
                      className={styles.rowButton}
                      data-on={on}
                      aria-pressed={on}
                      aria-label={`Row ${pattern} output: ${Number(on)}. Flip output.`}
                      onClick={() => setOutputs((current) => current ^ (1 << rowIndex))}
                    >
                      {Number(on)}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {size.rows > preview.length && (
        <p className={styles.small}>
          Showing the first {preview.length} of {size.rows} rows. The other outputs stay 0 in this
          example.
        </p>
      )}
      <div className={styles.functionColumn} aria-live="polite">
        <span>
          {size.rows > preview.length ? "Visible output column" : "Complete output column"}
        </span>
        <code>{column}</code>
      </div>
      <BooleanExplanation topic="rows-and-functions">
        <BooleanExplanation topic="constants" />
      </BooleanExplanation>
      <BooleanExplanation topic="computer-state">
        <BooleanExplanation topic="rows-and-functions" />
      </BooleanExplanation>
    </section>
  );
}
