import clsx from "clsx";
import Link from "next/link";
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FIFO_LIMIT,
  ghostMatrixCircuit,
  initialScanner,
  MatrixMachine,
  type MatrixSize,
  matrixKeys,
  matrixRowCircuit,
  SCANNER_SOURCE,
  scanRow,
  senseMatrix,
} from "../../lib/computer/keyboardMatrix";
import {
  builderClass,
  buttonClass,
  captionClass,
  controlsClass,
  noteClass,
  Readings,
  summaryClass,
} from "./DeviceDemoParts";
import { LogicBuilder } from "./LogicBuilder";

const CircuitView = memo(LogicBuilder);
const labelClass = clsx("flex items-center gap-tight", captionClass);

export function KeyboardMatrixDemo() {
  const [size, setSize] = useState<MatrixSize>({ rows: 2, columns: 2 });
  const [ansi, setAnsi] = useState(false);
  const [diodes, setDiodes] = useState(true);
  const [latch, setLatch] = useState(true);
  const [debounce, setDebounce] = useState(2);
  const [running, setRunning] = useState(false);
  const [held, setHeld] = useState<boolean[]>(Array(4).fill(false));
  const [scanner, setScanner] = useState(() => initialScanner(size));
  const current = useRef(scanner);
  const heldRef = useRef(held);
  const keys = useMemo(() => matrixKeys(size, ansi), [size, ansi]);
  const machine = useMemo(() => new MatrixMachine(size), [size]);
  const replaceHeld = useCallback((next: boolean[]) => {
    heldRef.current = next;
    setHeld(next);
  }, []);
  const change = (index: number, on: boolean) => {
    if (heldRef.current[index] === on) return;
    const next = [...heldRef.current];
    next[index] = on;
    replaceHeld(next);
  };
  const reset = (nextSize = size) => {
    const next = initialScanner(nextSize);
    current.current = next;
    setScanner(next);
    setRunning(false);
    replaceHeld(Array(nextSize.rows * nextSize.columns).fill(false));
  };
  const configure = (next: MatrixSize, keyboard = false) => {
    setSize(next);
    setAnsi(keyboard);
    reset(next);
  };
  const tick = useCallback(() => {
    const columns = machine.sense(heldRef.current, current.current.row, diodes);
    const next = scanRow(current.current, size, columns, keys, debounce);
    current.current = next;
    setScanner(next);
  }, [machine, size, diodes, keys, debounce]);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(tick, 160);
    return () => clearInterval(timer);
  }, [running, tick]);
  useEffect(() => {
    if (latch) return;
    const release = () => replaceHeld(Array(size.rows * size.columns).fill(false));
    const hidden = () => {
      if (document.hidden) release();
    };
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [latch, size, replaceHeld]);
  const sensed = senseMatrix(size, held, scanner.row, diodes);
  const shift = keys.some((key, i) => key.modifier && scanner.stable[i]);
  const inspect = useMemo(() => matrixRowCircuit(size.columns), [size.columns]);
  const chord = (ghost: boolean) => {
    const next = Array<boolean>(held.length).fill(false);
    for (const i of ghost ? [0, 1, size.columns + 1] : [0, size.columns]) next[i] = true;
    replaceHeld(next);
  };
  return (
    <div className="flex flex-col gap-section">
      <section className="flow-para">
        <h2>A switch connects two wires</h2>
        <p>
          Start with four keys, then expand the grid. Select one row at a time: it drives 0; every
          other row is high impedance (Z). Column pull-ups produce 1 until a closed switch pulls a
          column low. SENSE LOW in the circuit is the inverted electrical reading.
        </p>
        <div className={controlsClass}>
          <label className={labelClass}>
            Rows
            <select
              className={buttonClass}
              aria-label="Matrix rows"
              value={size.rows}
              onChange={(e) => configure({ ...size, rows: Number(e.target.value) })}
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Columns
            <select
              className={buttonClass}
              aria-label="Matrix columns"
              value={size.columns}
              onChange={(e) => configure({ ...size, columns: Number(e.target.value) })}
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
        <p>
          {ansi
            ? "US ANSI key legends occupy a 6 × 15 electrical grid; this is not the physical staggered plate layout. Blank slots have no switch. Letters, number-row punctuation and Space map to characters; other controls report position codes only. Caps Lock and host protocols are outside this controller."
            : "Generic matrix: row 1, column 0 is Shift. All other positions are letter keys."}
        </p>
        <div className={controlsClass}>
          <label className={labelClass}>
            <input
              type="checkbox"
              checked={diodes}
              onChange={(e) => {
                setDiodes(e.target.checked);
                const next = initialScanner(size);
                current.current = next;
                setScanner(next);
              }}
            />
            Per-key COL→ROW diodes
          </label>
          <label className={labelClass}>
            <input
              type="checkbox"
              checked={latch}
              onChange={(e) => {
                setLatch(e.target.checked);
                replaceHeld(Array(held.length).fill(false));
              }}
            />
            Latch keys for accessible chords
          </label>
          <button
            type="button"
            className={buttonClass}
            onClick={() => replaceHeld(Array(held.length).fill(false))}
          >
            Release all keys
          </button>
          {!ansi && (
            <>
              <button type="button" className={buttonClass} onClick={() => chord(false)}>
                Hold Shift + A
              </button>
              <button type="button" className={buttonClass} onClick={() => chord(true)}>
                Hold three ghosting corners
              </button>
            </>
          )}
        </div>
        <p className={noteClass}>
          {latch
            ? "Activate a key to hold its contact closed; activate it again to release. This lets keyboard and single-pointer users create simultaneous chords."
            : "Hold with pointer, Space or Enter; release, cancel or blur opens the contact. Multiple pointers can hold multiple contacts."}{" "}
          Contact controls are ideal, with no simulated bounce waveform.
        </p>
        <div className="not-prose overflow-x-auto p-hair">
          <div
            className="grid min-w-min gap-tight"
            style={{
              gridTemplateColumns: `5rem repeat(${size.columns}, minmax(3.7rem, 1fr))`,
              width: size.columns >= 8 ? "100%" : `${5 + size.columns * 4.4}rem`,
            }}
            role="group"
            aria-label="Switch matrix"
          >
            {Array.from({ length: size.rows }, (_, r) => (
              <Fragment key={r}>
                <span className="min-w-16 self-center font-mono text-xs">
                  R{r} {scanner.row === r ? "0 ← scan" : "Z"}
                </span>
                {keys.slice(r * size.columns, (r + 1) * size.columns).map((key, c) => {
                  const index = r * size.columns + c;
                  return (
                    <button
                      type="button"
                      key={index}
                      className={clsx(
                        buttonClass,
                        "min-h-12 min-w-[3.7rem] touch-none font-mono data-[ghost=true]:border-2 data-[ghost=true]:border-dashed data-[ghost=true]:border-red-500",
                      )}
                      disabled={!key.label}
                      aria-label={`${key.label || "No switch"} R${r} C${c}`}
                      aria-pressed={Boolean(held[index])}
                      data-ghost={(scanner.sampled[index] && !held[index]) || undefined}
                      onClick={() => {
                        if (latch) change(index, !heldRef.current[index]);
                      }}
                      onPointerDown={(e) => {
                        if (!latch && e.button === 0) {
                          e.currentTarget.setPointerCapture?.(e.pointerId);
                          change(index, true);
                        }
                      }}
                      onPointerUp={() => {
                        if (!latch) change(index, false);
                      }}
                      onPointerCancel={() => {
                        if (!latch) change(index, false);
                      }}
                      onLostPointerCapture={() => {
                        if (!latch) change(index, false);
                      }}
                      onBlur={() => {
                        if (!latch) change(index, false);
                      }}
                      onKeyDown={(e) => {
                        if (e.repeat) e.preventDefault();
                        if (!latch && [" ", "Enter"].includes(e.key)) {
                          e.preventDefault();
                          if (!e.repeat) change(index, true);
                        }
                      }}
                      onKeyUp={(e) => {
                        if (!latch && [" ", "Enter"].includes(e.key)) {
                          e.preventDefault();
                          change(index, false);
                        }
                      }}
                      title={`Position code ${index + 1}; stable ${Number(scanner.stable[index])}`}
                    >
                      {key.label === "Backspace" ? "Bksp" : key.label || "—"}
                    </button>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
        <div
          role="group"
          className="not-prose flex flex-wrap gap-tight font-mono text-sm"
          aria-label="Column electrical levels"
        >
          {sensed.map((low, c) => (
            <span
              key={c}
              data-low={low}
              className="border-b-2 border-gray-400 p-hair data-[low=true]:border-cyan-600 data-[low=true]:font-bold dark:border-gray-600"
            >
              C{c} = {low ? "0 (closed path)" : "1 (pull-up)"}
            </span>
          ))}
        </div>
        <p>
          With diodes, conventional current runs from a pulled-up column toward the low row; each
          diode’s cathode stripe faces its row. Removing diodes allows reverse paths through other
          held keys. Three rectangle corners can therefore report a fourth key. Dashed keys mark
          sampled phantom contacts. Two diagonal keys alone do not ghost under this
          one-row-at-a-time scan.
        </p>
      </section>
      <section className="flow-para">
        <h2>Scan, remember, then interpret</h2>
        <div className={controlsClass}>
          <button type="button" className={buttonClass} onClick={tick}>
            Scan next row
          </button>
          <button
            type="button"
            className={buttonClass}
            onClick={() => {
              for (let i = 0; i < size.rows; i++) tick();
            }}
          >
            Scan one frame
          </button>
          <button
            type="button"
            className={buttonClass}
            aria-pressed={running}
            onClick={() => setRunning((on) => !on)}
          >
            {running ? "Pause scanning" : "Run scanner"}
          </button>
          <label className={labelClass}>
            Stable frames
            <select
              className={buttonClass}
              aria-label="Debounce frames"
              value={debounce}
              onChange={(e) => {
                setDebounce(Number(e.target.value));
                reset();
              }}
            >
              {[1, 2, 3].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <button type="button" className={buttonClass} onClick={() => reset()}>
            Reset scanner
          </button>
        </div>
        <Readings
          label="Scanner state"
          items={[
            ["NEXT ROW", scanner.row],
            ["FRAMES", scanner.frames],
            ["HELD CONTACTS", held.filter(Boolean).length],
            ["SAMPLED", scanner.sampled.filter(Boolean).length],
            ["STABLE KEYS", scanner.stable.filter(Boolean).length],
            ["SHIFT STATE", Number(shift)],
          ]}
        />
        <p>
          Each frame samples every row once. The controller accepts a key change after {debounce}{" "}
          equal complete-frame samples. This is sample-count debounce, not a physical time
          guarantee. Pulses shorter than a scan can be missed by a matrix; the single-button capture
          lesson shows how a dedicated interrupt input avoids that loss.
        </p>
        <p>
          Position codes are row × columns + column + 1, not ASCII or USB codes. The controller
          commits all modifier states before mapping the frame’s presses. Shift + A maps to A; A
          alone maps to a. Shift alone emits no character. A held key creates no repeat characters.
        </p>
        <output
          aria-label="Mapped text"
          className="block min-h-12 whitespace-pre-wrap rounded bg-gray-900 p-label font-mono text-xl text-lime-300"
        >
          {scanner.text || "(no characters yet)"}
        </output>
        <p aria-live="polite">
          Event log: {scanner.events.length}/{FIFO_LIMIT}; dropped newest: {scanner.dropped}. Each
          transition records press or release and the sampled Shift state. The log is bounded;
          character mapping consumes transitions directly, independently of this optional log.
        </p>
        <div className={controlsClass}>
          <button
            type="button"
            className={buttonClass}
            onClick={() => {
              const next = { ...current.current, events: [] };
              current.current = next;
              setScanner(next);
            }}
          >
            Acknowledge event log
          </button>
        </div>
        <ol
          className="not-prose max-h-48 list-decimal overflow-auto pl-para font-mono text-sm leading-relaxed"
          aria-label="Key transitions"
        >
          {scanner.events.map((event, i) => (
            <li key={i}>
              code {event.code} · {event.down ? "press" : "release"} · Shift {Number(event.shift)}
              {event.character !== null ? ` · character ${JSON.stringify(event.character)}` : ""}
            </li>
          ))}
        </ol>
        <details>
          <summary className={summaryClass}>Inspect the scanning and mapping controller</summary>
          <pre>{SCANNER_SOURCE}</pre>
          <p>
            The controller above is the explicit software layer over the circuit’s column signals.
            It is not a USB keyboard implementation. The diode-free large grid uses ideal graph
            connectivity; the 2 × 2 comparison exposes the same paths as Boolean gates.
          </p>
        </details>
        <details>
          <summary className={summaryClass}>Inspect and edit one reusable isolated row</summary>
          <div className={builderClass}>
            <CircuitView key={size.columns} storageKey={null} initialCircuit={inspect} />
          </div>
        </details>
        <details>
          <summary className={summaryClass}>
            Inspect the 2 × 2 ghosting paths without diodes
          </summary>
          <div className={builderClass}>
            <CircuitView storageKey={null} initialCircuit={ghostMatrixCircuit()} />
          </div>
        </details>
        <p>
          <Link href="/computer/build-from-nand?level=matrix-row-2">
            Construct matrix sensing, sampled events and Shift mapping →
          </Link>
        </p>
        <p className={noteClass}>
          Primary references:{" "}
          <a href="https://github.com/qmk/qmk_firmware/blob/master/quantum/matrix.c">
            QMK active-low scanner
          </a>
          , <a href="https://docs.qmk.fm/how_a_matrix_works">QMK matrix and diodes</a>,{" "}
          <a href="https://www.microchip.com/en-us/application-notes/an3407">
            Microchip AN3407 keypad scanning
          </a>
          , <a href="https://www.ti.com/document-viewer/lit/html/scea094">TI switch bounce</a>,{" "}
          <a href="https://docs.qmk.fm/keycodes_basic">QMK key codes and US legends</a>.
        </p>
      </section>
    </div>
  );
}
