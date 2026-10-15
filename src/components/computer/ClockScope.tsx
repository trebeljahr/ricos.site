import {
  type CSSProperties,
  type RefObject,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import {
  CLOCK_PRESETS,
  clockFacts,
  DIVISIONS,
  formatElapsed,
  formatHertz,
  formatSeconds,
  formatTicks,
  groupDigits,
  hzToFraction,
  hzToSlider,
  JET_CORE_RPM,
  levelAtPhase,
  numberName,
  SLIDER_STEPS,
  type SquareWave,
  scopeTimebase,
  sliderToHz,
  squareWave,
  ticksSince,
  triggeredWave,
} from "src/lib/computer/clock";
import panel from "./ByteExplorer.module.css";
import styles from "./ClockScope.module.css";
import shared from "./Codebook.module.css";
import { DemoMachine } from "./CodebookParts";

const WIDTH = 1000;
const HEIGHT = 500;
const ROWS = 5;
const HIGH_Y = 125;
const LOW_Y = 375;
/** One sweep of the beam across a stretched-time screen. */
const SWEEP_MS = 1400;
const REDUCED_MOTION_UPDATE_MS = 500;
const SCALE_MARKS = [1, 1e3, 1e6, 1e9];

/** The graticule: ten by five divisions, with fine ticks on the centre lines. */
const GRID = (() => {
  let lines = "";
  for (let column = 1; column < DIVISIONS; column++)
    lines += `M${(column * WIDTH) / DIVISIONS} 0V${HEIGHT}`;
  for (let row = 1; row < ROWS; row++) lines += `M0 ${(row * HEIGHT) / ROWS}H${WIDTH}`;
  let ticks = "";
  const middleY = HEIGHT / 2;
  for (let x = 20; x < WIDTH; x += 20) ticks += `M${x} ${middleY - 7}V${middleY + 7}`;
  for (let y = 20; y < HEIGHT; y += 20) ticks += `M${WIDTH / 2 - 7} ${y}H${WIDTH / 2 + 7}`;
  return { lines, ticks };
})();

function wavePaths(wave: SquareWave) {
  const y = (level: 0 | 1) => (level ? HIGH_Y : LOW_Y);
  const flats = wave.flats
    .map(
      ([from, to, level]) => `M${(from * WIDTH).toFixed(1)} ${y(level)}H${(to * WIDTH).toFixed(1)}`,
    )
    .join("");
  const edges = wave.edges.map((x) => `M${(x * WIDTH).toFixed(1)} ${LOW_Y}V${HIGH_Y}`).join("");
  return { flats, edges };
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
 * A clock on an oscilloscope, from one tick a second to 5 GHz, and what its
 * speed comes to in numbers. Usable in MDX articles.
 */
export function ClockScope() {
  const [hz, setHz] = useState(1);
  const { soundEnabled, toggleSound, playButton } = usePanelSound();
  const timebase = scopeTimebase(hz);
  const facts = clockFacts(hz);
  const still = useMemo(() => wavePaths(triggeredWave(scopeTimebase(hz))), [hz]);

  const rootRef = useRef<HTMLDivElement>(null);
  const sliderId = useId();
  const visible = useVisible(rootRef);
  const reducedMotion = useReducedMotion();

  const flatGlow = useRef<SVGPathElement>(null);
  const flatCore = useRef<SVGPathElement>(null);
  const edgeGlow = useRef<SVGPathElement>(null);
  const edgeCore = useRef<SVGPathElement>(null);
  const beam = useRef<HTMLElement>(null);
  const lamp = useRef<HTMLElement>(null);
  const counter = useRef<HTMLElement>(null);
  const counterLine = useRef<HTMLElement>(null);

  const hzRef = useRef(hz);
  const openedAt = useRef(0);
  const phase = useRef(0);
  // Ticks only sound once the reader has touched the demo.
  const armed = useRef(false);
  const tick = useRef(playButton);
  useEffect(() => {
    hzRef.current = hz;
    tick.current = playButton;
  });

  useEffect(() => {
    openedAt.current = performance.now();
  }, []);

  // The live counter: ticks since the page opened, at the chosen speed.
  useEffect(() => {
    let shown = "";
    const write = (now: number) => {
      const elapsed = now - openedAt.current;
      const ticks = ticksSince(elapsed, hzRef.current);
      const text = formatTicks(ticks);
      if (counter.current && text !== shown) counter.current.textContent = text;
      shown = text;
      if (counterLine.current) {
        const name = numberName(Number(ticks));
        counterLine.current.textContent = `${name ? `${name.toUpperCase()} · ` : ""}IN ${formatElapsed(elapsed)}`;
      }
    };
    write(performance.now());
    if (!visible) return;

    if (reducedMotion || typeof requestAnimationFrame === "undefined") {
      const timer = setInterval(() => write(performance.now()), REDUCED_MOTION_UPDATE_MS);
      return () => clearInterval(timer);
    }

    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      const seconds = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      const f = hzRef.current;
      const base = scopeTimebase(f);
      if (base.realTime) {
        const before = phase.current;
        phase.current = (before + f * seconds) % 1e6;
        if (Math.floor(phase.current) !== Math.floor(before) && armed.current) tick.current();
        const level = levelAtPhase(phase.current);
        const paths = wavePaths(squareWave(phase.current - base.cycles, base.cycles));
        flatGlow.current?.setAttribute("d", paths.flats);
        flatCore.current?.setAttribute("d", paths.flats);
        edgeGlow.current?.setAttribute("d", paths.edges);
        edgeCore.current?.setAttribute("d", paths.edges);
        if (lamp.current) lamp.current.dataset.state = level ? "on" : "off";
        if (beam.current) {
          beam.current.style.left = "100%";
          beam.current.style.top = `${((level ? HIGH_Y : LOW_Y) / HEIGHT) * 100}%`;
        }
      } else if (beam.current) {
        const x = ((now - openedAt.current) % SWEEP_MS) / SWEEP_MS;
        const level = levelAtPhase(-base.cycles / DIVISIONS + x * base.cycles);
        beam.current.style.left = `${x * 100}%`;
        beam.current.style.top = `${((level ? HIGH_Y : LOW_Y) / HEIGHT) * 100}%`;
      }
      write(now);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [visible, reducedMotion]);

  function choose(next: number) {
    armed.current = true;
    setHz(next);
  }

  const lampState = timebase.realTime ? (reducedMotion ? "still" : "off") : "blur";
  const spokenTick = formatSeconds(1 / hz, true);
  const summary = useSettled(
    `${formatHertz(hz, true)}: ${facts.perSecond} ${hz === 1 ? "tick" : "ticks"} every second. One tick lasts ${spokenTick}.`,
    700,
  );
  // A no-break space keeps "1 ns" on one line in the note.
  const screenSpan = formatSeconds(timebase.secondsPerDivision * DIVISIONS).replace(" ", "\u00a0");

  return (
    <DemoMachine
      title="CLOCK"
      label="A clock signal on an oscilloscope"
      soundEnabled={soundEnabled}
      onToggleSound={() => {
        armed.current = true;
        toggleSound();
      }}
    >
      <div className={styles.bench} ref={rootRef}>
        <div className={shared.plate}>
          <div className={panel.sectionHead}>
            <span>SCOPE</span>
            <span className={styles.lampLabel}>
              <i ref={lamp} className={styles.lamp} data-state={lampState} aria-hidden="true" />
              {timebase.realTime ? "TICK LAMP" : "TOO FAST TO SEE"}
            </span>
          </div>

          <div className={styles.scope} data-motion={reducedMotion ? "off" : "on"}>
            <div className={styles.scopeLine} aria-hidden="true">
              <span>CH1 CLOCK</span>
              <span>{formatSeconds(timebase.secondsPerDivision)}/DIV</span>
            </div>
            <div
              className={styles.plot}
              role="img"
              aria-label={`Square wave of the clock at ${formatHertz(hz, true)}. The screen spans ${formatSeconds(
                timebase.secondsPerDivision * DIVISIONS,
                true,
              )} and shows ${Math.round(timebase.cycles * 10) / 10} ticks.`}
            >
              <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
                <path className={styles.grid} d={GRID.lines} />
                <path className={styles.gridTicks} d={GRID.ticks} />
                <path ref={edgeGlow} className={styles.edgeGlow} d={still.edges} />
                <path ref={edgeCore} className={styles.edge} d={still.edges} />
                <path ref={flatGlow} className={styles.glow} d={still.flats} />
                <path ref={flatCore} className={styles.trace} d={still.flats} />
              </svg>
              <i
                ref={beam}
                className={styles.beam}
                data-hidden={reducedMotion || undefined}
                aria-hidden="true"
              />
            </div>
            <div className={styles.scopeLine} aria-hidden="true">
              <span>{timebase.realTime ? "REAL TIME" : "TIME STRETCHED"}</span>
              <span>SCREEN = {screenSpan}</span>
            </div>
          </div>

          <p className={styles.note}>
            {timebase.realTime
              ? "Real time. The lamp lights once per tick. The trace scrolls as it happens."
              : `Too fast for the eye. The scope stretches time, so the whole screen shows ${screenSpan}.`}
            {reducedMotion ? " Motion is off, so the trace stands still." : ""}
          </p>

          <div className={styles.frequencyHead}>
            <label htmlFor={sliderId}>CLOCK SPEED</label>
            <strong>{formatHertz(hz)}</strong>
          </div>
          <input
            id={sliderId}
            type="range"
            min={0}
            max={SLIDER_STEPS}
            step={1}
            value={hzToSlider(hz)}
            onChange={(event) => choose(sliderToHz(Number(event.target.value)))}
            className={styles.slider}
            aria-valuetext={formatHertz(hz, true)}
          />
          <div className={styles.scale} aria-hidden="true">
            {SCALE_MARKS.map((mark) => (
              <span key={mark} style={{ "--at": hzToFraction(mark) } as CSSProperties}>
                {formatHertz(mark)}
              </span>
            ))}
          </div>
          <fieldset className={styles.presets}>
            <legend className="sr-only">Clock speeds of real machines</legend>
            {CLOCK_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={styles.preset}
                aria-pressed={hz === preset.hz}
                aria-label={`${preset.name}${preset.year ? `, ${preset.year}` : ""}: ${formatHertz(preset.hz, true)}`}
                onClick={() => {
                  choose(preset.hz);
                  playButton();
                }}
              >
                <span>{preset.name}</span>
                <small className={styles.presetDetail}>
                  {preset.year && (
                    <>
                      <span>{preset.year}</span>
                      <span className={styles.presetDot}>·</span>
                    </>
                  )}
                  <span>{formatHertz(preset.hz)}</span>
                </small>
              </button>
            ))}
          </fieldset>
        </div>

        <div className={shared.plate}>
          <div className={panel.sectionHead}>
            <span>IN NUMBERS</span>
            <span>AT {formatHertz(hz)}</span>
          </div>
          <div className={`${panel.screen} ${styles.lcd}`}>
            <div className={panel.screenTop}>
              <span>TICKS EVERY SECOND</span>
            </div>
            <div className={styles.bigNumber}>{facts.perSecond}</div>
            <div className={styles.lcdLine}>
              {facts.perSecondName
                ? facts.perSecondName.toUpperCase()
                : timebase.realTime
                  ? "SLOW ENOUGH TO COUNT ALONG"
                  : "\u00a0"}
            </div>
          </div>
          <div className={`${panel.screen} ${styles.lcd}`}>
            <div className={panel.screenTop}>
              <span>TICKS SINCE YOU OPENED THIS PAGE</span>
            </div>
            <div
              className={styles.counter}
              role="timer"
              aria-label="Ticks since you opened this page"
            >
              <span ref={counter}>0</span>
            </div>
            <div className={styles.lcdLine}>
              <span ref={counterLine}>IN 0 s</span>
            </div>
          </div>
          <dl className={styles.meters}>
            <div className={styles.meter}>
              <dt>ONE TICK LASTS</dt>
              <dd>{facts.tick}</dd>
              <dd className={styles.meterDetail}>HALF ON, HALF OFF</dd>
            </div>
            <div className={styles.meter}>
              <dt>LIGHT IN ONE TICK</dt>
              <dd>{facts.light}</dd>
              <dd className={styles.meterDetail}>AT 299,792 km/s</dd>
            </div>
            <div className={styles.meter}>
              <dt>ONE JET ENGINE TURN</dt>
              <dd>{facts.jetTicks}</dd>
              <dd className={styles.meterDetail}>
                TICKS · CORE AT {groupDigits(String(JET_CORE_RPM))} RPM
              </dd>
            </div>
            <div className={styles.meter}>
              <dt>IF EACH TICK TOOK 1{"\u00a0"}s</dt>
              <dd>{facts.slowed}</dd>
              <dd className={styles.meterDetail}>TO PLAY BACK ONE SECOND</dd>
            </div>
          </dl>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {summary}
      </p>
    </DemoMachine>
  );
}
