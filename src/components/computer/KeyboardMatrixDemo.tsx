import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ghostMatrixCircuit, keyId, type MatrixSize } from "../../lib/computer/keyboardMatrix";
import { keyboardScannerCircuit } from "../../lib/computer/keyboardScanner";
import { CircuitDemo } from "./CircuitDemo";
import { buttonClass, controlsClass } from "./DeviceDemoParts";
import { LazyLogicTutorial } from "./tutorial/LazyLogicTutorial";

const matrixLessons = [
  "matrix-row-2",
  "matrix-row-select",
  "sampled-key-events",
  "shift-character-map",
] as const;

export function KeyboardMatrixDemo() {
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
    <div className="flex flex-col gap-section">
      <section className="flow-para">
        <h2>Scan keys inside the circuit</h2>
        <p>
          Toggle the key contacts on the canvas to hold a chord. Run the builder’s clock or step
          through its half cycles. The row sequencer selects one row at a time. Column lamps show
          which contacts pull a column low. Pan right to follow the samples and character map. Fit
          shows the whole circuit.
        </p>
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
        <p>
          Each contact stores its column reading on the falling clock edge. After a complete scan,
          the shared frame clock updates every key’s two-sample filter together. STABLE remembers
          the accepted state. PRESS and RELEASE mark one frame each. Holding a key produces no
          repeat presses.
        </p>
        <p>
          Shift commits with the letters. FRAME CHARACTER shows the ASCII code of the first
          character pressed in that frame: a = 97, A = 65. Simultaneous character presses use
          position priority. Every key still exposes its own transition signals. Unfold the filter
          modules to edit their flip-flops and gates.
        </p>
        <p>
          {ansi
            ? "US QWERTY uses a 6 × 15 electrical grid. Empty slots have no switch. Letters, punctuation and Space map to ASCII."
            : "Row 1, column 0 is Shift. Other contacts map to letters."}{" "}
          ROW ACTIVE = 1 represents a row driven to electrical 0. Other rows release to Z. SENSE LOW
          = 1 represents a pulled-up column reading electrical 0.
        </p>
      </section>
      <section className="flow-para">
        <h2>Follow the ghosting path</h2>
        <p>
          This circuit removes the isolation diodes. Turn on R1 ACTIVE and close contacts (0,0),
          (0,1), and (1,1). Both columns read low, although contact (1,0) stays open. Follow the
          indirect path through the other row. Two diagonal contacts alone do not ghost.
        </p>
        <CircuitDemo makeCircuit={ghostMatrixCircuit} label="Matrix ghosting circuit" />
      </section>
      <section className="flow-para" aria-label="Build the keyboard controller">
        <h2>Build this out</h2>
        <p>
          Wire an isolated row, select a scan row, filter sampled contacts, then map a press and
          Shift to a character. Each stage runs in the circuit builder and checks your wiring.
        </p>
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
