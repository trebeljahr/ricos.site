import { type CSSProperties, type RefObject, useEffect, useRef, useState } from "react";
import {
  barFraction,
  CLOCK_PRESETS,
  type ClockScale,
  compareTo,
  formatElapsed,
  formatHertz,
  formatTicks,
  LINEAR_MAX_HZ,
  LOG_DECADES,
  ticksSince,
} from "src/lib/computer/clock";
import panel from "./ByteExplorer.module.css";
import styles from "./ClockScope.module.css";
import shared from "./Codebook.module.css";
import { DemoMachine } from "./CodebookParts";

const REDUCED_MOTION_UPDATE_MS = 500;
const DEFAULT_BASE = "4004";

const SCALES: Record<ClockScale, { steps: number; marks: { hz: number; label: string }[] }> = {
  log: {
    steps: LOG_DECADES,
    marks: [
      { hz: 1, label: "1 Hz" },
      { hz: 1e3, label: "1 kHz" },
      { hz: 1e6, label: "1 MHz" },
      { hz: 1e9, label: "1 GHz" },
    ],
  },
  linear: {
    steps: LINEAR_MAX_HZ / 1e9,
    marks: [0, 1e9, 2e9, 3e9, 4e9, 5e9].map((hz) => ({
      hz,
      label: hz ? formatHertz(hz) : "0",
    })),
  },
};

function useVisible(ref: RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: "80px",
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return visible;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

const percent = (fraction: number) => `${Number((fraction * 100).toPrecision(4))}%`;

/**
 * Six clocks side by side, from one tick a second to a desktop CPU: bars on a
 * log or linear scale and a counter for each, ticking at its true rate. Usable
 * in MDX articles.
 */
export function ClockScope() {
  const [scale, setScale] = useState<ClockScale>("log");
  const [baseId, setBaseId] = useState(DEFAULT_BASE);
  const base = CLOCK_PRESETS.find((preset) => preset.id === baseId) ?? CLOCK_PRESETS[0];

  const rootRef = useRef<HTMLDivElement>(null);
  const visible = useVisible(rootRef);
  const reducedMotion = useReducedMotion();
  const counters = useRef<(HTMLElement | null)[]>([]);
  const elapsedLine = useRef<HTMLElement>(null);
  const openedAt = useRef(0);

  useEffect(() => {
    openedAt.current = performance.now();
  }, []);

  // The live counters: ticks of every clock since the page opened.
  useEffect(() => {
    const shown: string[] = [];
    const write = (now: number) => {
      const elapsed = now - openedAt.current;
      CLOCK_PRESETS.forEach((preset, index) => {
        const text = formatTicks(ticksSince(elapsed, preset.hz));
        const node = counters.current[index];
        if (node && text !== shown[index]) node.textContent = text;
        shown[index] = text;
      });
      if (elapsedLine.current) elapsedLine.current.textContent = `IN ${formatElapsed(elapsed)}`;
    };
    write(performance.now());
    if (!visible) return;

    if (reducedMotion || typeof requestAnimationFrame === "undefined") {
      const timer = setInterval(() => write(performance.now()), REDUCED_MOTION_UPDATE_MS);
      return () => clearInterval(timer);
    }
    let frame = 0;
    const step = (now: number) => {
      write(now);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [visible, reducedMotion]);

  const { steps, marks } = SCALES[scale];

  return (
    <DemoMachine title="CLOCKS" label="Clock speeds of six machines, side by side">
      <div className={styles.bench} ref={rootRef}>
        <div className={shared.plate}>
          <div className={panel.sectionHead}>
            <span>TICKS SINCE YOU OPENED THIS PAGE</span>
            <span ref={elapsedLine}>IN 0 s</span>
          </div>

          <ol className={styles.rows} style={{ "--steps": steps } as CSSProperties}>
            {CLOCK_PRESETS.map((preset, index) => {
              const isBase = preset.id === base.id;
              return (
                <li key={preset.id} className={styles.row}>
                  <button
                    type="button"
                    className={styles.machine}
                    aria-pressed={isBase}
                    aria-label={`Compare with ${preset.name}${preset.year ? `, ${preset.year}` : ""}: ${formatHertz(preset.hz, true)}`}
                    onClick={() => setBaseId(preset.id)}
                  >
                    <span className={styles.machineName}>{preset.name}</span>
                    <small className={styles.machineDetail}>
                      {preset.year && (
                        <>
                          <span>{preset.year}</span>
                          <span className={styles.dot}>·</span>
                        </>
                      )}
                      <span>{formatHertz(preset.hz)}</span>
                    </small>
                  </button>
                  <div className={styles.lane}>
                    <div className={styles.track} aria-hidden="true">
                      <i
                        className={styles.fill}
                        data-preset={preset.id}
                        style={{ width: percent(barFraction(preset.hz, scale)) }}
                      />
                    </div>
                    <div className={styles.readouts}>
                      <span
                        ref={(node) => {
                          counters.current[index] = node;
                        }}
                        className={styles.counter}
                        role="timer"
                        aria-label={`Ticks of the ${preset.name.toLowerCase()} clock since you opened this page`}
                      >
                        0
                      </span>
                      <span className={styles.factor} data-base={isBase || undefined}>
                        {isBase ? "BASE" : compareTo(preset.hz, base.hz)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className={styles.axisRow} aria-hidden="true">
            <div className={styles.axis}>
              {marks.map((mark) => {
                const at = barFraction(mark.hz, scale);
                return (
                  <span
                    key={mark.hz}
                    data-edge={at === 0 ? "start" : at === 1 ? "end" : undefined}
                    style={{ "--at": at } as CSSProperties}
                  >
                    {mark.label}
                  </span>
                );
              })}
            </div>
          </div>

          <fieldset className={styles.scales}>
            <legend className="sr-only">Scale</legend>
            <span className={styles.scalesLabel} aria-hidden="true">
              SCALE
            </span>
            {(["log", "linear"] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={styles.scaleButton}
                aria-pressed={scale === option}
                onClick={() => setScale(option)}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </fieldset>
        </div>
      </div>
    </DemoMachine>
  );
}
