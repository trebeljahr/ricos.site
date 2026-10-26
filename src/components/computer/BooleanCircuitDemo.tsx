import { useCallback, useMemo, useRef, useState } from "react";
import { booleanSelectorDemo } from "src/lib/computer/demoCircuits";
import styles from "./BooleanCircuitDemo.module.css";
import { CircuitDemo } from "./CircuitDemo";
import { type LockedClock, type LockedView, LogicBuilder } from "./LogicBuilder";
import { InputKey } from "./TruthTables";

type Reading = { s: boolean; a: boolean; b: boolean; y: boolean };

/** The expression is the specification; circuit readings come from the builder's timeline. */
export function BooleanCircuitDemo() {
  const [editing, setEditing] = useState(false);
  const circuit = useMemo(booleanSelectorDemo, []);
  const focus = useMemo(() => circuit.nodes.map((node) => node.id), [circuit]);
  const clock = useRef<LockedClock | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const onFrame = useCallback(({ frame }: LockedView) => {
    const values = frame.snapshot.values;
    if (!["sel", "a", "b", "out"].every((id) => Object.hasOwn(values, id))) {
      setReading(null);
      return;
    }
    const next = { s: values.sel, a: values.a, b: values.b, y: values.out };
    setReading((current) =>
      current &&
      current.s === next.s &&
      current.a === next.a &&
      current.b === next.b &&
      current.y === next.y
        ? current
        : next,
    );
  }, []);
  const expected = reading ? (reading.s ? reading.b : reading.a) : false;

  return (
    <section className="not-prose my-6" aria-label="Boolean expression and matching circuit">
      <div className={styles.lesson}>
        <h2>Choose one of two values</h2>
        <p>
          A CPU uses multiplexers to choose which value reaches its arithmetic unit. This circuit
          makes that choice for one bit: S = 0 selects A; S = 1 selects B.
        </p>
        <div className={styles.formula} role="math" aria-label="Y equals not S and A, or S and B">
          <span aria-hidden="true">
            Y ={" "}
            <span className={styles.term} data-active={reading ? !reading.s : undefined}>
              <span className={styles.overline}>S</span> · A
            </span>{" "}
            +{" "}
            <span className={styles.term} data-active={reading?.s}>
              S · B
            </span>
          </span>
        </div>
        <div className={styles.paths}>
          <p>
            <strong>
              <span className={styles.overline}>S</span> · A
            </strong>{" "}
            passes A when S is 0.
          </p>
          <p>
            <strong>S · B</strong> passes B when S is 1.
          </p>
        </div>
        {reading ? (
          <div className={styles.reading} aria-live="polite">
            <div role="math" aria-label="Expression with current inputs">
              {Number(!reading.s)} · {Number(reading.a)} + {Number(reading.s)} · {Number(reading.b)}{" "}
              = <strong>{Number(expected)}</strong>
            </div>
            <output
              aria-label="Expression and circuit comparison"
              data-match={reading.y === expected}
            >
              Circuit Y = <strong>{Number(reading.y)}</strong>.{" "}
              {reading.y === expected
                ? "Same output for these inputs."
                : "Outputs differ for these inputs."}
            </output>
          </div>
        ) : (
          <p className={styles.hint}>The comparison needs the circuit’s S, A, B and Y terminals.</p>
        )}
        {!editing && (
          <fieldset className={styles.controls} aria-label="Selector inputs">
            {[
              { id: "sel", name: "S", value: reading?.s },
              { id: "a", name: "A", value: reading?.a },
              { id: "b", name: "B", value: reading?.b },
            ].map(({ id, name, value }) => (
              <InputKey
                key={id}
                name={name}
                on={Boolean(value)}
                onFlip={() => clock.current?.input({ [id]: !value })}
              />
            ))}
          </fieldset>
        )}
        <p className={styles.hint}>
          {editing
            ? "Change the wiring, then compare Y with the expression."
            : "Flip S to choose A or B. Open a gate to see its wiring."}
        </p>
        <button
          className={styles.edit}
          type="button"
          aria-pressed={editing}
          onClick={() => setEditing(!editing)}
        >
          {editing ? "Show the reference circuit" : "Edit a copy"}
        </button>
      </div>
      {editing ? (
        <CircuitDemo
          makeCircuit={booleanSelectorDemo}
          label="Editable Boolean selector"
          onFrame={onFrame}
        />
      ) : (
        <div className={styles.preview}>
          <LogicBuilder
            autoFit
            embedded
            storageKey={null}
            initialFocus={focus}
            locked={{ circuit, clockRef: clock, interactiveInputs: true, onFrame }}
          />
        </div>
      )}
    </section>
  );
}
