import { type RefObject, useEffect, useId, useRef, useState } from "react";
import {
  type BitRun,
  bitRuns,
  clockVolts,
  HIGH_MIN_VOLTS,
  LOW_MAX_VOLTS,
  readBit,
  SCREEN_SECONDS,
  SIGNAL_HZ,
  SUPPLY_VOLTS,
  signalTrace,
  type TracePoint,
} from "src/lib/computer/clock";
import shared from "./Codebook.module.css";
import { DemoMachine } from "./CodebookParts";
import styles from "./SignalEdges.module.css";

// The screen runs a little past both rails, so the noise stays in view.
const TOP_VOLTS = SUPPLY_VOLTS + 1;
const BOTTOM_VOLTS = -1;
const WIDTH = 1000;
const HEIGHT = 400;
/** Three ticks on screen make at most 13 stretches of the same bit; the rest is headroom. */
const RUN_SLOTS = 16;
const VOLTS_UPDATE_SECONDS = 0.1;
/** In percent of the screen. */
const MIN_LABEL_WIDTH = 4;

const toY = (volts: number) => ((TOP_VOLTS - volts) / (TOP_VOLTS - BOTTOM_VOLTS)) * HEIGHT;
const toPercent = (volts: number) => (toY(volts) / HEIGHT) * 100;

const AXIS = [SUPPLY_VOLTS, HIGH_MIN_VOLTS, LOW_MAX_VOLTS, 0];

const ZONES = [
  { label: "HIGH = 1", at: (SUPPLY_VOLTS + HIGH_MIN_VOLTS) / 2 - 0.25, kind: "level" },
  { label: "? UNDEFINED REGION", at: (HIGH_MIN_VOLTS + LOW_MAX_VOLTS) / 2, kind: "undefined" },
  { label: "LOW = 0", at: LOW_MAX_VOLTS / 2 + 0.25, kind: "level" },
] as const;

const formatAxis = (volts: number) => `${volts} V`;

/** "4.8 V", with a real minus sign and without "-0.0". */
function formatVolts(volts: number) {
  const text = Math.abs(volts).toFixed(1);
  return `${volts < 0 && text !== "0.0" ? "−" : ""}${text} V`;
}

/** The trace as a path, and the stretches of it inside the undefined region. */
function tracePaths(trace: TracePoint[], end: number) {
  const start = end - SCREEN_SECONDS;
  const point = ({ t, volts }: TracePoint) =>
    `${(((t - start) / SCREEN_SECONDS) * WIDTH).toFixed(1)} ${toY(volts).toFixed(1)}`;
  let all = "";
  let undefinedPart = "";
  for (let index = 0; index < trace.length; index++) {
    all += `${index ? "L" : "M"}${point(trace[index])}`;
    if (index === trace.length - 1) continue;
    if (readBit(trace[index].volts) !== "?" && readBit(trace[index + 1].volts) !== "?") continue;
    undefinedPart += `M${point(trace[index])}L${point(trace[index + 1])}`;
  }
  return { all, undefinedPart };
}

function runBox(run: BitRun, end: number) {
  const start = end - SCREEN_SECONDS;
  const left = Math.max(0, (run.from - start) / SCREEN_SECONDS);
  const right = Math.min(1, (run.to - start) / SCREEN_SECONDS);
  return { left: left * 100, width: Math.max(0, right - left) * 100 };
}

/** A stretch too narrow to hold its digit, cut off at the screen edge, stays blank. */
function runLabel(run: BitRun, width: number) {
  return run.bit === "?" || width < MIN_LABEL_WIDTH ? "" : run.bit;
}

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

// The first frame, shared by the server and the client, and the still picture
// for readers who ask for less motion. It ends a quarter into a tick, on a high.
const FIRST_END = SCREEN_SECONDS + 0.25 / SIGNAL_HZ;
const FIRST_TRACE = signalTrace(FIRST_END);
const FIRST_PATHS = tracePaths(FIRST_TRACE, FIRST_END);
const FIRST_RUNS = bitRuns(FIRST_TRACE);
const FIRST_VOLTS = clockVolts(FIRST_END);

/**
 * A running clock signal on a scope, in volts, with the bit each stretch of it
 * stands for right below. Usable in MDX articles.
 */
export function SignalEdges() {
  const hatch = `signal-hatch-${useId().replace(/:/g, "")}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const visible = useVisible(rootRef);
  const reducedMotion = useReducedMotion();

  const glow = useRef<SVGPathElement>(null);
  const trace = useRef<SVGPathElement>(null);
  const traceUndefined = useRef<SVGPathElement>(null);
  const dot = useRef<HTMLElement>(null);
  const runs = useRef<(HTMLElement | null)[]>([]);
  const voltsCell = useRef<HTMLElement>(null);
  const bitCell = useRef<HTMLElement>(null);
  const bitMeter = useRef<HTMLDivElement>(null);
  const lamp = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!visible || reducedMotion || typeof requestAnimationFrame === "undefined") return;
    let frame = 0;
    let last = performance.now();
    let end = FIRST_END;
    let voltsAge = VOLTS_UPDATE_SECONDS;

    const step = (now: number) => {
      const seconds = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      end += seconds;

      const points = signalTrace(end);
      const paths = tracePaths(points, end);
      glow.current?.setAttribute("d", paths.all);
      trace.current?.setAttribute("d", paths.all);
      traceUndefined.current?.setAttribute("d", paths.undefinedPart);

      const stretches = bitRuns(points);
      runs.current.forEach((node, index) => {
        if (!node) return;
        const run = stretches[index];
        node.hidden = !run;
        if (!run) return;
        const box = runBox(run, end);
        node.style.left = `${box.left}%`;
        node.style.width = `${box.width}%`;
        node.dataset.bit = run.bit;
        node.textContent = runLabel(run, box.width);
      });

      const volts = clockVolts(end);
      const bit = readBit(volts);
      if (dot.current) {
        dot.current.style.top = `${toPercent(volts)}%`;
        dot.current.dataset.bit = bit;
      }
      if (bitCell.current) bitCell.current.textContent = bit;
      if (bitMeter.current) bitMeter.current.dataset.alert = String(bit === "?");
      if (lamp.current) lamp.current.dataset.on = String(bit === "1");
      voltsAge += seconds;
      if (voltsAge >= VOLTS_UPDATE_SECONDS && voltsCell.current) {
        voltsAge = 0;
        voltsCell.current.textContent = formatVolts(volts);
      }

      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [visible, reducedMotion]);

  const bandTop = toY(HIGH_MIN_VOLTS);
  const bandBottom = toY(LOW_MAX_VOLTS);
  const firstBit = readBit(FIRST_VOLTS);

  return (
    <DemoMachine title="SIGNAL EDGES" label="A clock signal in volts">
      <div className={styles.bench} ref={rootRef}>
        <div className={shared.plate}>
          <div className={styles.scope}>
            <div className={styles.field}>
              <div className={styles.axis} aria-hidden="true">
                {AXIS.map((volts) => (
                  <span key={volts} style={{ top: `${toPercent(volts)}%` }}>
                    {formatAxis(volts)}
                  </span>
                ))}
              </div>
              <div
                className={styles.plot}
                role="img"
                aria-label={`A clock signal ticking ${SIGNAL_HZ} time per second. It switches between 0 and ${SUPPLY_VOLTS} volts with some noise. Up to ${LOW_MAX_VOLTS} volts counts as 0, from ${HIGH_MIN_VOLTS} volts counts as 1, and the region in between is undefined. The signal only passes through that region on its edges.`}
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
                  />
                  <path
                    className={styles.grid}
                    d={Array.from(
                      { length: SCREEN_SECONDS - 1 },
                      (_, index) => `M${((index + 1) * WIDTH) / SCREEN_SECONDS} 0V${HEIGHT}`,
                    ).join("")}
                  />
                  <path
                    className={styles.threshold}
                    d={`M0 ${bandTop}H${WIDTH}M0 ${bandBottom}H${WIDTH}`}
                  />
                  <path ref={glow} className={styles.glow} d={FIRST_PATHS.all} />
                  <path ref={trace} className={styles.trace} d={FIRST_PATHS.all} />
                  <path
                    ref={traceUndefined}
                    className={styles.traceUndefined}
                    d={FIRST_PATHS.undefinedPart}
                  />
                </svg>
                {ZONES.map((zone) => (
                  <span
                    key={zone.label}
                    className={styles.zone}
                    data-kind={zone.kind}
                    style={{ top: `${toPercent(zone.at)}%` }}
                    aria-hidden="true"
                  >
                    {zone.label}
                  </span>
                ))}
                <i
                  ref={dot}
                  className={styles.dot}
                  data-bit={firstBit}
                  style={{ top: `${toPercent(FIRST_VOLTS)}%` }}
                  aria-hidden="true"
                />
              </div>

              <span className={styles.rowLabel} aria-hidden="true">
                BIT
              </span>
              <div className={styles.bits} aria-hidden="true">
                {Array.from({ length: RUN_SLOTS }, (_, index) => {
                  const run = FIRST_RUNS[index];
                  const box = run ? runBox(run, FIRST_END) : { left: 0, width: 0 };
                  return (
                    <span
                      // The slots are a fixed pool; the loop fills them in order.
                      // biome-ignore lint/suspicious/noArrayIndexKey: fixed pool of slots
                      key={index}
                      ref={(node) => {
                        runs.current[index] = node;
                      }}
                      hidden={!run}
                      data-bit={run?.bit}
                      style={{ left: `${box.left}%`, width: `${box.width}%` }}
                    >
                      {run ? runLabel(run, box.width) : ""}
                    </span>
                  );
                })}
              </div>

              <span aria-hidden="true" />
              <div className={styles.scale} aria-hidden="true">
                <span style={{ width: `${100 / (SCREEN_SECONDS * SIGNAL_HZ)}%` }}>
                  1 TICK = 1 s
                </span>
              </div>
            </div>
          </div>

          <dl className={styles.meters}>
            <div className={styles.meter}>
              <dt>CLOCK</dt>
              <dd>
                {SIGNAL_HZ} Hz
                <i
                  ref={lamp}
                  className={shared.lamp}
                  data-on={firstBit === "1"}
                  aria-hidden="true"
                />
              </dd>
            </div>
            <div className={styles.meter}>
              <dt>VOLTAGE NOW</dt>
              <dd ref={voltsCell}>{formatVolts(FIRST_VOLTS)}</dd>
            </div>
            <div className={styles.meter} ref={bitMeter} data-alert={firstBit === "?"}>
              <dt>BIT NOW</dt>
              <dd ref={bitCell}>{firstBit}</dd>
            </div>
          </dl>
        </div>
      </div>
    </DemoMachine>
  );
}
