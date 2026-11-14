import clsx from "clsx";
import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  type ActionParts,
  type ActionState,
  GRAND,
  initialAction,
  KEY_DIP_MM,
  keyTime,
  metresPerSecond,
  NO_PARTS,
  pressKey,
  stepAction,
  stringFree,
  UPRIGHT,
} from "src/lib/piano/action";
import type { Scene } from "./actionScene";
import { panelColors, useAnimation } from "./canvas";
import { PianoCheck, PianoSwitch } from "./controls";
import { drawGrand, GRAND_VIEW, STRIKE_AT } from "./grandAction";
import {
  capturePointer,
  formatMs,
  HoldButton,
  LineReadout,
  partUnder,
  type Slow,
  SlowSwitch,
  sceneOn,
  spaceHolds,
  TouchSlider,
  Trace,
  useRingingString,
} from "./mechanism";
import styles from "./piano.module.css";
import { drawUpright, UPRIGHT_STRIKE_AT, UPRIGHT_VIEW } from "./uprightAction";

export type ActionStage =
  | "fixed"
  | "escapement"
  | "check"
  | "damper"
  | "repetition"
  | "grand"
  | "upright";

type StageSetup = {
  parts: ActionParts;
  /** Parts drawn dashed in the accent colour: what this step adds. */
  fresh: string[];
  fixedJack?: boolean;
  pedal?: boolean;
  trill?: boolean;
  /** Offer a switch between a single and a double escapement. */
  escapements?: boolean;
};

const STAGES: Record<ActionStage, StageSetup> = {
  fixed: { parts: NO_PARTS, fresh: ["hammer head", "hammer shank"], fixedJack: true },
  escapement: {
    parts: { ...NO_PARTS, escapement: true },
    fresh: ["jack", "let-off button"],
  },
  check: {
    parts: { ...NO_PARTS, escapement: true, check: true },
    fresh: ["backcheck"],
  },
  damper: {
    parts: { ...NO_PARTS, escapement: true, check: true, damper: true },
    fresh: ["damper", "damper wire", "damper underlever"],
    pedal: true,
  },
  repetition: {
    parts: GRAND,
    fresh: ["repetition lever", "repetition flange"],
    trill: true,
    escapements: true,
  },
  grand: { parts: GRAND, fresh: [], pedal: true, trill: true },
  upright: { parts: UPRIGHT, fresh: [], pedal: true, trill: true },
};

const HOLDER_WORDS: Record<ActionState["holder"], string> = {
  jack: "on the jack",
  repetition: "on the repetition lever",
  check: "caught by the backcheck",
  rest: "on its rest",
  string: "pressed on the string",
  air: "flying",
};

const STRING_HZ = 196; // G3
const STRING_SWING_MM = 6;

type Readouts = {
  key: string;
  hammer: string;
  speed: string;
  string: string;
  count: string;
};

/**
 * One piano action, built up stage by stage: a hammer on a fixed jack, then
 * escapement, backcheck, damper, repetition lever, and the whole grand or
 * upright action. Hold the key (pointer, space bar or button) and watch,
 * slowed down, what each lever does.
 */
export function ActionDemo({ stage }: { stage: ActionStage }) {
  const setup = STAGES[stage];
  const upright = stage === "upright";
  const panel = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const traceCanvas = useRef<HTMLCanvasElement>(null);
  const sim = useRef<ActionState>(initialAction());
  const trace = useRef(new Trace());
  const scene = useRef<Scene | null>(null);
  const last = useRef<number | null>(null);
  const trillClock = useRef(0);
  const pointerHeld = useRef(false);
  const string = useRingingString(STRING_HZ, upright ? UPRIGHT_STRIKE_AT : STRIKE_AT);

  const [slow, setSlow] = useState<Slow>("0.1");
  const [touch, setTouch] = useState(0.6);
  const [pedal, setPedal] = useState(false);
  const [double, setDouble] = useState(true);
  const [trill, setTrill] = useState(false);
  const [rate, setRate] = useState(8);
  const [hovered, setHovered] = useState<string | null>(null);
  const [readouts, setReadouts] = useState<Readouts>({
    key: "up",
    hammer: HOLDER_WORDS.jack,
    speed: "–",
    string: "silent",
    count: "0 of 0",
  });

  const fresh = useMemo(() => new Set(setup.fresh), [setup.fresh]);
  const parts: ActionParts = setup.escapements
    ? { ...setup.parts, repetition: double }
    : setup.parts;
  const partsRef = useRef(parts);
  partsRef.current = parts;

  useEffect(() => {
    sim.current.speed = 1 / keyTime(touch);
  }, [touch]);
  useEffect(() => {
    sim.current.pedal = pedal;
  }, [pedal]);
  useEffect(() => {
    if (!trill) {
      pressKey(sim.current, pointerHeld.current);
      return;
    }
    trillClock.current = 0;
    sim.current.presses = 0;
    sim.current.strikes = 0;
  }, [trill]);

  const hold = (down: boolean) => {
    pointerHeld.current = down;
    if (!trill) pressKey(sim.current, down);
  };

  useAnimation(panel, (time) => {
    const s = sim.current;
    const dtReal = last.current === null ? 0 : Math.min(0.05, time - last.current);
    last.current = time;
    const dt = dtReal * Number(slow);

    if (trill) {
      // The key goes down and lets go `rate` times a second, in mechanism time.
      const before = trillClock.current;
      trillClock.current += dt * rate;
      const was = before % 1 < 0.5;
      const now = trillClock.current % 1 < 0.5;
      if (dt > 0 && (was !== now || before === 0)) pressKey(s, now);
    }

    for (const event of stepAction(s, partsRef.current, dt)) {
      if (event.type === "strike") {
        const mps = metresPerSecond(event.speed);
        string.strike(mps, Math.min(1, mps / 3.5));
      } else string.silence();
    }
    string.advance(dtReal, dt, stringFree(s, partsRef.current));

    const colors = panelColors(panel.current);
    const sc = sceneOn(canvas.current, upright ? UPRIGHT_VIEW : GRAND_VIEW, colors, fresh, hovered);
    if (sc) {
      const look = {
        parts: partsRef.current,
        fixedJack: setup.fixedJack,
        stringAt: (u: number) => string.at01(u) * STRING_SWING_MM,
        ring: string.amplitude,
      };
      if (upright) drawUpright(sc, s, look);
      else drawGrand(sc, s, look);
      sc.finish();
      scene.current = sc;
    }

    trace.current.push(time, [s.k, s.h]);
    if (traceCanvas.current) {
      trace.current.draw(
        traceCanvas.current,
        time,
        [
          { column: 0, color: colors.muted, width: 1.5 },
          { column: 1, color: colors.accent },
        ],
        [{ level: 1, color: colors.ink }],
        colors,
      );
    }

    const free = stringFree(s, partsRef.current);
    const next: Readouts = {
      key: s.k < 0.01 ? "up" : `${(s.k * KEY_DIP_MM).toFixed(0)} mm down`,
      hammer: HOLDER_WORDS[s.holder],
      speed: s.strikes ? `${metresPerSecond(s.lastStrike).toFixed(1)} m/s` : "–",
      string:
        s.holder === "string"
          ? "held by the hammer"
          : !free
            ? string.amplitude > 0.01
              ? "stopped by the damper"
              : "under the damper"
            : string.amplitude > 0.01
              ? "ringing"
              : "silent",
      count: `${s.strikes} of ${s.presses}`,
    };
    setReadouts((old) =>
      old.key === next.key &&
      old.hammer === next.hammer &&
      old.speed === next.speed &&
      old.string === next.string &&
      old.count === next.count
        ? old
        : next,
    );
  });

  const local = (event: PointerEvent<HTMLCanvasElement>) => partUnder(scene.current, event);

  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    const part = local(event);
    setHovered(part);
    if (part !== "key") return;
    event.preventDefault();
    capturePointer(event);
    hold(true);
  };
  const up = () => {
    if (pointerHeld.current) hold(false);
  };

  const keys = spaceHolds(hold);
  const colors = { key: "var(--muted)", hammer: "var(--accent)" };

  return (
    <section
      ref={panel}
      className={clsx(styles.panel, "not-prose")}
      aria-label={upright ? "Upright piano action" : "Grand piano action"}
    >
      <canvas
        ref={canvas}
        className={styles.canvas}
        style={{
          aspectRatio: upright
            ? `${UPRIGHT_VIEW.x1 - UPRIGHT_VIEW.x0} / ${UPRIGHT_VIEW.y1 - UPRIGHT_VIEW.y0}`
            : `${GRAND_VIEW.x1 - GRAND_VIEW.x0} / ${GRAND_VIEW.y1 - GRAND_VIEW.y0}`,
          height: "auto",
          maxHeight: upright ? 620 : undefined,
          cursor: hovered === "key" ? "pointer" : "default",
          touchAction: "manipulation",
        }}
        tabIndex={0}
        {...keys}
        onPointerDown={down}
        onPointerMove={(event) => {
          if (!pointerHeld.current) setHovered(local(event));
        }}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={() => {
          if (!pointerHeld.current) setHovered(null);
        }}
        role="img"
        aria-label="The action in side view. Press the key to play; space holds it down."
      />
      <canvas
        ref={traceCanvas}
        className={clsx(styles.canvas, "mt-tight")}
        style={{ height: 64 }}
        aria-hidden
      />

      <dl className="mt-label grid grid-cols-2 gap-label sm:grid-cols-3" aria-live="polite">
        <LineReadout color={colors.key} label="key" value={readouts.key} />
        <LineReadout color={colors.hammer} label="hammer" value={readouts.hammer} />
        <div className={clsx(styles.readout, styles.wordy)}>
          <dt>string</dt>
          <dd>{readouts.string}</dd>
        </div>
        <div className={clsx(styles.readout, styles.wordy)}>
          <dt>last hammer speed at the string</dt>
          <dd>{readouts.speed}</dd>
        </div>
        {setup.trill && (
          <div className={clsx(styles.readout, styles.wordy)}>
            <dt>presses that struck the string</dt>
            <dd>{readouts.count}</dd>
          </div>
        )}
        <div className={clsx(styles.readout, styles.wordy)}>
          <dt>part</dt>
          <dd>{hovered ?? "–"}</dd>
        </div>
      </dl>

      <div className="mt-para flex flex-wrap items-end gap-label">
        <HoldButton onHold={hold} />
        <TouchSlider
          value={touch}
          onChange={setTouch}
          readout={`key down in ${formatMs(keyTime(touch))}`}
        />
      </div>
      <div className="mt-label flex flex-wrap items-center gap-label">
        <SlowSwitch value={slow} onChange={setSlow} />
        {setup.pedal && <PianoCheck label="Sustain pedal" checked={pedal} onChange={setPedal} />}
        {setup.escapements && (
          <PianoSwitch
            label="Escapement"
            value={double ? "double" : "single"}
            options={[
              { value: "single", label: "Single" },
              { value: "double", label: "Double" },
            ]}
            onChange={(v) => setDouble(v === "double")}
          />
        )}
      </div>
      {setup.trill && (
        <div className="mt-label flex flex-wrap items-center gap-label">
          <PianoCheck label="Repeat the note" checked={trill} onChange={setTrill} />
          <label className="flex min-w-0 flex-1 flex-col">
            <span className={clsx(styles.muted, "text-xs")}>
              <span className={styles.mono}>{rate}</span> presses a second
            </span>
            <input
              className={styles.slider}
              type="range"
              min={2}
              max={16}
              step={1}
              value={rate}
              aria-label="Presses a second"
              onChange={(event) => {
                setRate(Number(event.target.value));
                sim.current.presses = 0;
                sim.current.strikes = 0;
              }}
            />
          </label>
        </div>
      )}
    </section>
  );
}
