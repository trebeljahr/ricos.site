import { type CSSProperties, useEffect, useId, useMemo, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import {
  HIGH_MIN,
  LOW_MAX,
  SAMPLE_COUNT,
  SIGNAL_PERIODS,
  type SignalKind,
  type SignalReport,
  signalReport,
  TRACE_POINTS,
} from "src/lib/computer/clock";
import panel from "./ByteExplorer.module.css";
import shared from "./Codebook.module.css";
import { DemoMachine } from "./CodebookParts";
import styles from "./SignalEdges.module.css";

// The screen shows -0.4 to 1.6 of the supply, so overshoot stays in view.
const TOP = 1.6;
const BOTTOM = -0.4;
const WIDTH = 1000;
const HEIGHT = 400;
const DEFAULT_NOISE = 20;

const toY = (value: number) => ((TOP - value) / (TOP - BOTTOM)) * HEIGHT;
const toPercent = (value: number) =>
  Math.min(100, Math.max(0, ((TOP - value) / (TOP - BOTTOM)) * 100));
const toX = (index: number) => (index / TRACE_POINTS) * WIDTH;
const inBetween = (value: number) => value > LOW_MAX && value < HIGH_MIN;

// What a gate reads in each band, written beside the middle of the band.
const AXIS = [
  { reading: "1", at: (TOP + HIGH_MIN) / 2 },
  { reading: "?", at: (HIGH_MIN + LOW_MAX) / 2 },
  { reading: "0", at: (LOW_MAX + BOTTOM) / 2 },
] as const;

const KINDS: { kind: SignalKind; name: string; detail: string }[] = [
  { kind: "wanted", name: "WANTED", detail: "Clean levels, edges that jump" },
  { kind: "unwanted", name: "UNWANTED", detail: "Slow, ringing edges and a glitch" },
];

/** The whole trace, and the stretches of it that sit between the thresholds. */
function tracePaths(trace: number[]) {
  const all = trace
    .map((value, index) => `${index ? "L" : "M"}${toX(index).toFixed(1)} ${toY(value).toFixed(1)}`)
    .join("");
  let between = "";
  for (let index = 0; index < trace.length - 1; index++) {
    if (!inBetween(trace[index]) && !inBetween(trace[index + 1])) continue;
    between += `M${toX(index).toFixed(1)} ${toY(trace[index]).toFixed(1)}L${toX(index + 1).toFixed(1)} ${toY(trace[index + 1]).toFixed(1)}`;
  }
  return { all, between };
}

function describe(kind: SignalKind, noise: number, report: SignalReport) {
  const percent = Math.round(report.between * 100);
  return (
    `${kind === "wanted" ? "Wanted" : "Unwanted"} signal, noise ${noise}%. ` +
    `${report.right} of ${SAMPLE_COUNT} samples read right, ${report.undefined} undefined, ` +
    `${report.wrong} wrong. The signal spends ${percent}% of the time between the thresholds.`
  );
}

/** Waits until a value stops changing, so a dragged slider is announced once. */
function useSettled<T>(value: T, delay: number) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

/**
 * A clean clock signal next to a real-world one, on a scope, with what a gate
 * reads at each sample. Usable in MDX articles.
 */
export function SignalEdges() {
  const [kind, setKind] = useState<SignalKind>("wanted");
  const [noise, setNoise] = useState(DEFAULT_NOISE);
  const { soundEnabled, toggleSound, playSwitch } = usePanelSound();
  const hatch = `signal-hatch-${useId().replace(/:/g, "")}`;

  const report = useMemo(() => signalReport(kind, noise / 100), [kind, noise]);
  const paths = useMemo(() => tracePaths(report.trace), [report]);
  const summary = useSettled(describe(kind, noise, report), 600);
  const between = Math.round(report.between * 100);

  const bandTop = toY(HIGH_MIN);
  const bandBottom = toY(LOW_MAX);

  return (
    <DemoMachine
      title="SIGNAL EDGES"
      label="A wanted and an unwanted clock signal"
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
    >
      <div className={styles.bench}>
        <div className={shared.plate}>
          <div className={panel.sectionHead}>
            <span>SCOPE</span>
            <span>
              {SIGNAL_PERIODS} TICKS · {SAMPLE_COUNT} SAMPLES
            </span>
          </div>

          <div className={styles.scope} data-kind={kind}>
            <div className={styles.scopeLine} aria-hidden="true">
              <span>CH1 CLOCK</span>
              <span>? = UNDEFINED</span>
            </div>
            <div className={styles.field}>
              <div className={styles.axis} aria-hidden="true">
                {AXIS.map((mark) => (
                  <span
                    key={mark.reading}
                    data-reading={mark.reading}
                    style={{ top: `${toPercent(mark.at)}%` }}
                  >
                    {mark.reading}
                  </span>
                ))}
              </div>
              <div
                className={styles.plot}
                role="img"
                aria-label={`${kind === "wanted" ? "Wanted" : "Unwanted"} clock signal. ${
                  kind === "wanted"
                    ? "It sits on two flat levels and jumps straight between them."
                    : "Its edges crawl and ring, and one glitch dips low."
                } It spends ${between}% of the time in the middle band.`}
              >
                <svg
                  viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <pattern
                      id={hatch}
                      width="10"
                      height="10"
                      patternUnits="userSpaceOnUse"
                      patternTransform="rotate(45)"
                    >
                      <rect width="4" height="10" className={styles.hatchStripe} />
                    </pattern>
                  </defs>
                  <rect
                    x="0"
                    y={bandTop}
                    width={WIDTH}
                    height={bandBottom - bandTop}
                    fill={`url(#${hatch})`}
                    className={styles.band}
                  />
                  <path
                    className={styles.grid}
                    d={[1, 2, 3, 4, 5, 6, 7]
                      .map((step) => `M${(step * WIDTH) / 8} 0V${HEIGHT}`)
                      .join("")}
                  />
                  <path
                    className={styles.threshold}
                    d={`M0 ${bandTop}H${WIDTH}M0 ${bandBottom}H${WIDTH}`}
                  />
                  <path
                    className={styles.sampleLine}
                    d={report.samples
                      .map((sample) => `M${(sample.t / SIGNAL_PERIODS) * WIDTH} 0V${HEIGHT}`)
                      .join("")}
                  />
                  <path className={styles.glow} d={paths.all} />
                  <path className={styles.trace} d={paths.all} />
                  <path className={styles.traceBetween} d={paths.between} />
                </svg>
                {report.samples.map((sample) => (
                  <i
                    key={sample.t}
                    className={styles.dot}
                    data-verdict={sample.verdict}
                    style={
                      {
                        left: `${(sample.t / SIGNAL_PERIODS) * 100}%`,
                        top: `${toPercent(sample.value)}%`,
                      } as CSSProperties
                    }
                    aria-hidden="true"
                  />
                ))}
              </div>
              <span className={styles.axisFoot} aria-hidden="true">
                ▸
              </span>
              <ol className={styles.reads} aria-label="What a gate reads at each sample">
                {report.samples.map((sample, index) => (
                  <li
                    key={sample.t}
                    data-verdict={sample.verdict}
                    aria-label={`Sample ${index + 1}: ${
                      sample.reading === "?" ? "undefined" : sample.reading
                    }${sample.verdict === "wrong" ? `, should be ${sample.expected}` : ""}`}
                  >
                    {sample.reading}
                  </li>
                ))}
              </ol>
            </div>
            <div className={styles.scopeLine} aria-hidden="true">
              <span>GATE READS</span>
              <span>1 · 0 · ?</span>
            </div>
          </div>

          <div className={styles.controls}>
            <fieldset className={styles.kinds}>
              <legend className="sr-only">Signal</legend>
              {KINDS.map((option) => (
                <button
                  key={option.kind}
                  type="button"
                  className={styles.kindKey}
                  aria-pressed={kind === option.kind}
                  aria-label={`${option.name}: ${option.detail}`}
                  onClick={() => {
                    if (kind === option.kind) return;
                    setKind(option.kind);
                    playSwitch();
                  }}
                >
                  <i className={shared.lamp} data-on={kind === option.kind} aria-hidden="true" />
                  {option.name}
                </button>
              ))}
            </fieldset>
            <label className={styles.noise}>
              <span className={styles.noiseHead}>
                <span>NOISE</span>
                <span>{noise}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={noise}
                onChange={(event) => setNoise(Number(event.target.value))}
                className={styles.slider}
                aria-valuetext={`${noise}% noise`}
              />
            </label>
          </div>

          <dl className={styles.meters}>
            <div className={styles.meter}>
              <dt>READ RIGHT</dt>
              <dd>
                {report.right}
                <small>/{SAMPLE_COUNT}</small>
              </dd>
            </div>
            <div className={styles.meter} data-alert={report.undefined > 0}>
              <dt>UNDEFINED</dt>
              <dd>{report.undefined}</dd>
            </div>
            <div className={styles.meter} data-alert={report.wrong > 0}>
              <dt>WRONG</dt>
              <dd>{report.wrong}</dd>
            </div>
            <div className={styles.meter} data-alert={between > 0}>
              <dt>IN BETWEEN</dt>
              <dd>
                {between}
                <small>% OF THE TIME</small>
              </dd>
            </div>
          </dl>

          <p className={styles.note}>
            {kind === "wanted"
              ? "The edges jump straight across the middle band. Noise stays inside the outer bands, so every sample reads a clean 1 or 0."
              : "The edges crawl and ring. Wherever the trace sits in the middle band, a gate may read 1, 0 or neither."}
          </p>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {summary}
      </p>
    </DemoMachine>
  );
}
