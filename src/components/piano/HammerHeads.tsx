import clsx from "clsx";
import { useMemo, useRef, useState } from "react";
import {
  brightness,
  COVERINGS,
  contactPulse,
  type HammerCovering,
  STRIKE_POINT,
  strikeSpectrum,
} from "src/lib/piano/hammerHead";
import { type Pt, rect, type Scene, type View } from "./actionScene";
import { fitCanvas, panelColors, useAnimation } from "./canvas";
import { PianoSwitch } from "./controls";
import { sceneOn, useRingingString } from "./mechanism";
import styles from "./piano.module.css";

const VIEW: View = { x0: -64, x1: 64, y0: -66, y1: 22 };
const HZ = 262; // middle C
const BARS = 16;
const MAX_PULSE_MS = 4;
const SPEEDS: [number, number] = [0.5, 5]; // m/s at the string, softest to hardest
const RISE = 0.45; // seconds the hammer takes to reach the string on screen
const FALL = 0.5;
const CONTACT_SHOWN_PER_MS = 0.35; // seconds on screen per millisecond of contact
const SQUEEZE_ZOOM = 4; // compression drawn this many times deeper
const NONE: ReadonlySet<string> = new Set();

type Blow = {
  start: number;
  covering: HammerCovering;
  squeeze: number;
  /** Seconds on screen the head stays on the string. */
  shown: number;
  struck: boolean;
};

/**
 * Hammer heads through time: bare wood, leather, soft felt and pressed felt.
 * Strike the string with each and see how long the head stays on it, how
 * much the covering squeezes, and which partials the blow leaves ringing.
 */
export function HammerHeads() {
  const panel = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const chart = useRef<HTMLCanvasElement>(null);
  const blow = useRef<Blow | null>(null);
  const [coveringId, setCoveringId] = useState(COVERINGS[COVERINGS.length - 1].id);
  const [touch, setTouch] = useState(0.5);
  const string = useRingingString(HZ, STRIKE_POINT, 0.5);
  const covering = COVERINGS.find((c) => c.id === coveringId) ?? COVERINGS[0];
  const speed = SPEEDS[0] * (SPEEDS[1] / SPEEDS[0]) ** touch;

  const blows = useMemo(
    () =>
      COVERINGS.map((c) => {
        const pulse = contactPulse(c, speed, 96);
        const spectrum = strikeSpectrum(pulse.time, HZ, 32);
        return { covering: c, pulse, spectrum };
      }),
    [speed],
  );
  const current = blows.find((b) => b.covering.id === covering.id) ?? blows[0];

  const strike = () => {
    blow.current = {
      start: performance.now() / 1000,
      covering,
      squeeze: current.pulse.squeeze,
      shown: Math.max(0.12, current.pulse.time * 1000 * CONTACT_SHOWN_PER_MS),
      struck: false,
    };
  };

  const last = useRef<number | null>(null);
  useAnimation(panel, (time) => {
    const colors = panelColors(panel.current);
    const dt = last.current === null ? 0 : Math.min(0.05, time - last.current);
    last.current = time;
    const b = blow.current;
    let lift = 0; // 0 at rest below the string, 1 touching it
    let squeeze = 0;
    if (b) {
      const t = performance.now() / 1000 - b.start;
      if (t < RISE) lift = (t / RISE) ** 2;
      else if (t < RISE + b.shown) {
        lift = 1;
        squeeze = b.squeeze * Math.sin((Math.PI * (t - RISE)) / b.shown);
        if (!b.struck) {
          b.struck = true;
          string.strike(speed, Math.min(1, speed / 3), current.spectrum);
        }
      } else if (t < RISE + b.shown + FALL) {
        const f = (t - RISE - b.shown) / FALL;
        lift = 1 - f * (2 - f);
      } else blow.current = null;
    }
    string.advance(dt, 0, true);
    const sc = sceneOn(canvas.current, VIEW, colors, NONE, null);
    if (sc) drawHead(sc, b?.covering ?? covering, lift, squeeze, (u) => string.at01(u));
    if (chart.current) drawCharts(chart.current, blows, covering.id, colors);
  });

  const ms = current.pulse.time * 1000;
  return (
    <section ref={panel} className={clsx(styles.panel, "not-prose")} aria-label="Hammer heads">
      <canvas
        ref={canvas}
        className={styles.canvas}
        style={{
          aspectRatio: `${VIEW.x1 - VIEW.x0} / ${VIEW.y1 - VIEW.y0}`,
          height: "auto",
          maxHeight: 320,
        }}
        role="img"
        aria-label={`A ${covering.label.toLowerCase()} hammer head under a string, cut through.`}
      />
      <canvas
        ref={chart}
        className={clsx(styles.canvas, "mt-tight")}
        style={{ height: 150 }}
        aria-hidden
      />
      <dl className="mt-label grid grid-cols-2 gap-label sm:grid-cols-4" aria-live="polite">
        <div className={styles.readout}>
          <dt>time on the string</dt>
          <dd>{ms < 1 ? ms.toFixed(2) : ms.toFixed(1)} ms</dd>
        </div>
        <div className={styles.readout}>
          <dt>deepest squeeze</dt>
          <dd>{current.pulse.squeeze.toFixed(2)} mm</dd>
        </div>
        <div className={styles.readout}>
          <dt>average partial, by energy</dt>
          <dd>{brightness(current.spectrum.slice(0, BARS)).toFixed(1)}</dd>
        </div>
        <div className={styles.readout}>
          <dt>hammer speed</dt>
          <dd>{speed.toFixed(1)} m/s</dd>
        </div>
      </dl>
      <div className="mt-para flex flex-wrap items-end gap-label">
        <button type="button" className={clsx(styles.button, styles.primary)} onClick={strike}>
          Strike
        </button>
        <label className="flex min-w-0 flex-1 flex-col">
          <span className={clsx(styles.muted, "flex justify-between text-xs")}>
            <span>soft</span>
            <span>hard</span>
          </span>
          <input
            className={styles.slider}
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={touch}
            aria-label="Hammer speed"
            aria-valuetext={`${speed.toFixed(1)} metres a second`}
            onChange={(event) => setTouch(Number(event.target.value))}
          />
        </label>
      </div>
      <div className="mt-label">
        <PianoSwitch
          label="Hammer covering"
          value={covering.id}
          options={COVERINGS.map((c) => ({ value: c.id, label: c.label }))}
          onChange={setCoveringId}
        />
      </div>
    </section>
  );
}

/** A rounded cap `hw` wide each side, its top at `top`, down to `bottom`; nothing above the string. */
function cap(hw: number, top: number, bottom: number): Pt[] {
  const ry = Math.min(hw * 0.8, top - bottom);
  const cy = top - ry;
  const arcPoints: Pt[] = [];
  for (let k = 0; k <= 18; k++) {
    const a = (Math.PI * k) / 18;
    arcPoints.push([hw * Math.cos(a), Math.min(0, cy + ry * Math.sin(a))]);
  }
  return [[hw, bottom], ...arcPoints, [-hw, bottom]];
}

/** The head cut through, under the string. `lift` 0–1 brings it up; `squeeze` in mm. */
function drawHead(
  scene: Scene,
  covering: HammerCovering,
  lift: number,
  squeeze: number,
  stringAt: (u: number) => number,
) {
  const total = covering.layers.reduce((sum, l) => sum + l.mm, 0);
  // The head keeps moving up while its covering squeezes flat against the string.
  const face = -(1 - lift) * 14 + squeeze * SQUEEZE_ZOOM;
  const coreTop = face - total;
  scene.shape("hammer shank", rect(-3.5, -80, 3.5, coreTop - 30), { material: "wood" });
  // Coverings from the outside in, so each inner one is drawn over the next.
  const tops: number[] = [];
  let reach = coreTop;
  for (const layer of covering.layers) {
    reach += layer.mm;
    tops.push(reach);
  }
  for (let i = covering.layers.length - 1; i >= 0; i--) {
    const layer = covering.layers[i];
    const hw = 9 + 0.9 * (tops[i] - coreTop);
    scene.shape(layer.mm >= 3 ? "felt" : "leather", cap(hw, tops[i], coreTop - 24), {
      fill: layer.color,
    });
  }
  scene.shape(
    "wooden core",
    [[11, coreTop - 40], ...cap(9, coreTop, coreTop - 30).slice(1, -1), [-11, coreTop - 40]],
    { material: "wood" },
  );
  scene.pin([0, coreTop - 33], undefined, 1.6);
  // The string along its length; it rings once the head has left it.
  const metal = scene.dark ? "#c9ced3" : "#9aa1a8";
  const line: Pt[] = [];
  for (let x = -64; x <= 64; x += 2) {
    const u = STRIKE_POINT + (x / 120) * 0.2;
    line.push([x, 1 + stringAt(u) * 10]);
  }
  scene.line("string", line, metal, 2.6);
}

function drawCharts(
  canvas: HTMLCanvasElement,
  blows: { covering: HammerCovering; pulse: ReturnType<typeof contactPulse>; spectrum: number[] }[],
  currentId: string,
  colors: ReturnType<typeof panelColors>,
) {
  const fitted = fitCanvas(canvas);
  if (!fitted) return;
  const { ctx, width, height } = fitted;
  const gap = 18;
  const left = (width - gap) * 0.45;
  const pad = 16;
  // Force against time, every covering, the chosen one bold.
  const peak = Math.max(...blows.flatMap((b) => b.pulse.force.map((f) => f.force)), 1);
  ctx.font = "11px ui-sans-serif, system-ui";
  ctx.fillStyle = colors.muted;
  ctx.strokeStyle = colors.line;
  ctx.beginPath();
  ctx.moveTo(0, height - pad);
  ctx.lineTo(left, height - pad);
  ctx.stroke();
  for (let ms = 0; ms <= MAX_PULSE_MS; ms++) {
    const x = (ms / MAX_PULSE_MS) * left;
    ctx.fillText(`${ms}${ms === MAX_PULSE_MS ? " ms" : ""}`, Math.min(x, left - 28), height - 2);
  }
  for (const b of blows) {
    const chosen = b.covering.id === currentId;
    ctx.strokeStyle = chosen ? colors.accent : colors.muted;
    ctx.globalAlpha = chosen ? 1 : 0.45;
    ctx.lineWidth = chosen ? 2.4 : 1.2;
    ctx.beginPath();
    b.pulse.force.forEach((f, i) => {
      const x = Math.min(left, (f.t * 1000 * left) / MAX_PULSE_MS);
      const y = height - pad - (f.force / peak) * (height - 2 * pad);
      if (i === 0) ctx.moveTo(0, height - pad);
      ctx.lineTo(x, y);
    });
    ctx.lineTo(Math.min(left, (b.pulse.time * 1000 * left) / MAX_PULSE_MS), height - pad);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // The partials the chosen blow leaves on the string, in decibels.
  const chosen = blows.find((b) => b.covering.id === currentId) ?? blows[0];
  const x0 = left + gap;
  const w = width - x0;
  const bar = w / BARS;
  const top = Math.max(...chosen.spectrum.slice(0, BARS), 1e-9);
  for (let i = 0; i < BARS; i++) {
    const db = 20 * Math.log10(Math.max(1e-6, chosen.spectrum[i] / top));
    const frac = Math.max(0, 1 + db / 50);
    const h = frac * (height - 2 * pad);
    ctx.fillStyle = colors.accent;
    ctx.globalAlpha = 0.35 + 0.65 * frac;
    ctx.fillRect(x0 + i * bar + 1, height - pad - h, bar - 2, h);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = colors.muted;
  for (const n of [1, 4, 8, 12, 16]) {
    ctx.fillText(String(n), x0 + (n - 1) * bar + bar / 2 - 3, height - 2);
  }
}
