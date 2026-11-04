import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ghostMatrixCircuit, keyId, type MatrixSize } from "../../lib/computer/keyboardMatrix";
import { keyboardScannerCircuit } from "../../lib/computer/keyboardScanner";
import { CircuitDemo } from "./CircuitDemo";
import { buttonClass, controlsClass, summaryClass } from "./DeviceDemoParts";
import { LazyLogicTutorial } from "./tutorial/LazyLogicTutorial";
import { WiredKeyboard } from "./WiredKeyboard";

const matrixLessons = [
  "matrix-row-2",
  "matrix-row-select",
  "sampled-key-events",
  "shift-character-map",
] as const;

function ScannerCircuit() {
  const [size, setSize] = useState<MatrixSize>({ rows: 2, columns: 2 });
  const [ansi, setAnsi] = useState(false);
  const makeCircuit = useCallback(() => keyboardScannerCircuit(size, ansi), [size, ansi]);
  const focus = useMemo(
    () =>
      Array.from({ length: size.rows }, (_, row) => [
        `active${row}`,
        ...Array.from({ length: size.columns }, (_, col) => keyId(row, col)),
      ]).flat(),
    [size],
  );
  const configure = (next: MatrixSize, keyboard = false) => {
    setSize(next);
    setAnsi(keyboard);
  };
  return (
    <>
      <div className={controlsClass}>
        <label>
          Rows{" "}
          <select
            className={buttonClass}
            aria-label="Matrix rows"
            value={size.rows}
            onChange={(event) => configure({ ...size, rows: Number(event.target.value) })}
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Columns{" "}
          <select
            className={buttonClass}
            aria-label="Matrix columns"
            value={size.columns}
            onChange={(event) => configure({ ...size, columns: Number(event.target.value) })}
          >
            {Array.from({ length: 14 }, (_, i) => i + 2).map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={buttonClass}
          onClick={() => configure({ rows: 2, columns: 2 })}
        >
          2 × 2 experiment
        </button>
        <button
          type="button"
          className={buttonClass}
          onClick={() => configure({ rows: 6, columns: 15 }, true)}
        >
          US QWERTY preset
        </button>
      </div>
      <CircuitDemo
        makeCircuit={makeCircuit}
        label="Keyboard scanner circuit"
        initialFocus={focus}
      />
    </>
  );
}

export function KeyboardMatrixDemo() {
  const [circuitOpen, setCircuitOpen] = useState(false);
  return (
    <div className="flex flex-col gap-section">
      <WiredKeyboard />
      <details className="flow-para" open={circuitOpen}>
        <summary
          className={summaryClass}
          onClick={(event) => {
            event.preventDefault();
            setCircuitOpen((open) => !open);
          }}
        >
          The scanner as gates
        </summary>
        {circuitOpen && <ScannerCircuit />}
      </details>
      <section className="flow-para">
        <h2>Follow the ghosting path</h2>
        <CircuitDemo makeCircuit={ghostMatrixCircuit} label="Matrix ghosting circuit" />
      </section>
      <section className="flow-para" aria-label="Build the keyboard controller">
        <h2>Build this out</h2>
        <LazyLogicTutorial
          title="Build the keyboard controller"
          level="matrix-row-2"
          levels={matrixLessons}
        />
        <p>
          <Link href="/computer/button-interrupts">
            Connect an input request to the CPU interrupt handler →
          </Link>
        </p>
      </section>
    </div>
  );
}
