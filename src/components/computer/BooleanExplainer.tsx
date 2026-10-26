import type { ReactNode } from "react";
import { useId, useState } from "react";
import {
  BOOLEAN_EXPLANATIONS,
  BOOLEAN_OPERATION_IDS,
  BOOLEAN_OPERATIONS,
  type BooleanExplanationTopic,
  type BooleanOperation,
  booleanResult,
  MAX_BOOLEAN_INPUTS,
  truthTablePreview,
  truthTableSize,
} from "src/lib/computer/booleanExplanations";
import { inputRows } from "src/lib/computer/gateLogic";
import { Callout } from "../Callouts";
import styles from "./BooleanExplainer.module.css";
import { CircuitPreview } from "./CircuitPreview";
import { LazyMount } from "./LazyMount";

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

export function BooleanNotation() {
  const operationId = useId();
  const [operation, setOperation] = useState<BooleanOperation>("and");
  const [notation, setNotation] = useState(0);
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const definition = BOOLEAN_OPERATIONS[operation];
  const selected = definition.notations[notation];
  const output = booleanResult(operation, a, b);
  const inputs = definition.inputs === 1 ? [a] : [a, b];

  return (
    <section className={`${styles.root} ${styles.section}`} aria-label="Boolean notation explorer">
      <span className={styles.eyebrow}>One rule, several spellings</span>
      <h2>Read the expression</h2>
      <label className={styles.selectLabel} htmlFor={operationId}>
        Operation
        <select
          id={operationId}
          value={operation}
          onChange={(event) => {
            setOperation(event.target.value as BooleanOperation);
            setNotation(0);
          }}
        >
          {BOOLEAN_OPERATION_IDS.map((id) => (
            <option key={id} value={id}>
              {BOOLEAN_OPERATIONS[id].name}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.formula} role="math" aria-label={`C equals ${selected.reading}`}>
        <span aria-hidden="true">C = {selected.expression}</span>
      </div>
      <p className={styles.reading} aria-live="polite">
        Read it as “{selected.reading}”.
      </p>
      <fieldset className={styles.aliases}>
        <legend>Equivalent spellings. Choose one.</legend>
        {definition.notations.map((alias, index) => (
          <button
            type="button"
            key={alias.expression}
            aria-pressed={notation === index}
            aria-label={`Use ${alias.expression}, read as ${alias.reading}`}
            onClick={() => setNotation(index)}
          >
            {alias.expression}
          </button>
        ))}
      </fieldset>
      <BooleanExplanation topic="notation" />
      <div className={styles.comparison}>
        <div>
          <span className={styles.eyebrow}>Try the inputs</span>
          <div className={styles.inputButtons}>
            <button
              type="button"
              aria-pressed={a}
              aria-label={`Input A: ${Number(a)}. Flip.`}
              onClick={() => setA(!a)}
            >
              A = {Number(a)}
            </button>
            {definition.inputs === 2 && (
              <button
                type="button"
                aria-pressed={b}
                aria-label={`Input B: ${Number(b)}. Flip.`}
                onClick={() => setB(!b)}
              >
                B = {Number(b)}
              </button>
            )}
          </div>
          <output className={styles.result} aria-label="Boolean output" aria-live="polite">
            C = <strong>{Number(output)}</strong>
          </output>
          <p>{definition.rule}</p>
        </div>
        <table className={styles.table}>
          <caption>Select an output to set the inputs to that row.</caption>
          <thead>
            <tr>
              <th scope="col">A</th>
              {definition.inputs === 2 && <th scope="col">B</th>}
              <th scope="col">C</th>
            </tr>
          </thead>
          <tbody>
            {inputRows(definition.inputs).map((row) => {
              const result = booleanResult(operation, row[0], row[1] ?? false);
              const current = row.every((value, index) => value === inputs[index]);
              const description = row
                .map((value, index) => `${index === 0 ? "A" : "B"} ${Number(value)}`)
                .join(", ");
              return (
                <tr key={row.map(Number).join("")} data-current={current}>
                  {row.map((value, index) => (
                    <td key={index === 0 ? "a" : "b"}>{Number(value)}</td>
                  ))}
                  <td>
                    <button
                      type="button"
                      className={styles.rowButton}
                      data-on={result}
                      aria-current={current ? "true" : undefined}
                      aria-label={`${description} gives C ${Number(result)}. Select inputs.`}
                      onClick={() => {
                        setA(row[0]);
                        setB(row[1] ?? false);
                      }}
                    >
                      {Number(result)}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {definition.gate ? (
        <div className={styles.preview}>
          <span className={styles.previewLabel}>
            The same inputs, through the circuit. Open the gate to see its wiring.
          </span>
          <LazyMount
            height="320px"
            label="Boolean gate circuit"
            placeholder={<p className={styles.small}>The gate loads when you scroll here.</p>}
          >
            <CircuitPreview gate={definition.gate} a={a} b={b} />
          </LazyMount>
        </div>
      ) : (
        <p className={styles.scopeNote}>
          This view shows the logical relationship through its table. Each row follows the selected
          expression.
        </p>
      )}
    </section>
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
      <p>
        Flip any output below. Each different complete output column is another Boolean function.
      </p>
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
      {inputs === 0 && <p>One empty input case, two constant functions: always 0 and always 1.</p>}
      <BooleanExplanation topic="rows-and-functions">
        <BooleanExplanation topic="constants" />
      </BooleanExplanation>
      <BooleanExplanation topic="computer-state">
        <BooleanExplanation topic="rows-and-functions" />
      </BooleanExplanation>
    </section>
  );
}

/** Chapter-sized review of notation and gate truth tables. */
export function BooleanExplainer() {
  return (
    <div className={`not-prose ${styles.root}`}>
      <BooleanNotation />
    </div>
  );
}
