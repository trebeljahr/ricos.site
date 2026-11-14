import clsx from "clsx";
import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import { pluckedString, type StringVoice } from "src/lib/piano/harmonicSound";
import { formatHz, roleColor } from "src/lib/piano/notes";
import {
  formatRatio,
  modeDecay,
  modeEnvelope,
  modeNodes,
  modeShape,
  pluckAmplitudes,
  snapTo,
  stringFrequency,
  triangleAt,
} from "src/lib/piano/stringModes";
import { fitCanvas, type PanelColors, panelColors, useAnimation } from "./canvas";
import { PianoSwitch } from "./controls";
import styles from "./piano.module.css";

// The string at the start: 80 cm long, pulled with 80 N, and a mass per
// length chosen so that it sounds A2, 110 Hz.
const L0 = 0.8;
const T0 = 80;
const F0 = 110;
const MU = T0 / (2 * L0 * F0) ** 2;
const L_RANGE: [number, number] = [0.2, 1];
const T_RANGE: [number, number] = [T0 / 4, T0 * 4];
const LENGTH_SNAPS = [1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 1, 5 / 4].map((r) => r * L0);
const TENSION_SNAPS = [1 / 4, 1 / 2, 1, 2, 9 / 4, 4].map((r) => r * T0);

const TAU = 2.2; // seconds for the fundamental to fall to 1/e, in sound and on screen
const SHOWN_PER_HZ = 0.9 / F0; // the string on screen swings 0.9 times a second at 110 Hz
const DRAWN_MODES = 24;
const SOUND_MODES = 40;
const PART_ROWS = 8;
const BARS = 12;
const PEG_TURNS = 3; // turns of the peg from the slackest to the tightest string

const STRING_HEIGHT = 200;
const ROW_HEIGHT = 30;
const BAR_HEIGHT = 120;

type Mode = "string" | "parts";
type Pluck = { amps: number[]; start: number; peak: number };
type Drag = "peg" | "bridge" | "spring" | "pluck";

const clamp = (v: number, [lo, hi]: [number, number]) => Math.min(hi, Math.max(lo, v));
const modeColor = (n: number, lightness?: number) => roleColor(12 * Math.log2(n), lightness);
const compactHz = (hz: number) =>
  hz >= 1000 ? `${(hz / 1000).toFixed(hz >= 10000 ? 0 : 1)}k` : `${Math.round(hz)}`;

/** Where everything sits on a canvas `width` pixels wide. */
function layout(width: number, length: number, tension: number) {
  const mid = STRING_HEIGHT / 2;
  const pegX = 22;
  const pegR = 14;
  const nutX = 48;
  const wallX = width - 6;
  const springMin = 34;
  const springMax = 64;
  const perMetre = (wallX - springMax - 18 - nutX) / L_RANGE[1];
  const springAt = (t: number) =>
    springMin + ((t - T_RANGE[0]) / (T_RANGE[1] - T_RANGE[0])) * (springMax - springMin);
  return {
    mid,
    pegX,
    pegY: mid + pegR,
    pegR,
    nutX,
    wallX,
    perMetre,
    bridgeX: nutX + length * perMetre,
    hookX: wallX - springAt(tension),
    springAt,
    pull: mid - 14, // pixels for a pull of height 1
  };
}
type Layout = ReturnType<typeof layout>;

const now = () => performance.now() / 1000;

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    setReduced(query.matches);
    const change = () => setReduced(query.matches);
    query.addEventListener?.("change", change);
    return () => query.removeEventListener?.("change", change);
  }, []);
  return reduced;
}

/**
 * A string between a tuning peg and a movable bridge. Turn the peg or pull
 * the spring for tension, slide the bridge for length, pull the string and
 * let go to pluck it.
 */
export function PluckString() {
  const panel = useRef<HTMLElement>(null);
  const stringCanvas = useRef<HTMLCanvasElement>(null);
  const partsCanvas = useRef<HTMLCanvasElement>(null);
  const barsCanvas = useRef<HTMLCanvasElement>(null);
  const [length, setLength] = useState(L0);
  const [tension, setTension] = useState(T0);
  const [mode, setMode] = useState<Mode>("string");
  const reduced = useReducedMotion();

  const raw = useRef({ length: L0, tension: T0 });
  const drag = useRef<{ kind: Drag; angle: number } | null>(null);
  const grab = useRef<{ x: number; h: number } | null>(null);
  const pluck = useRef<Pluck | null>(null);
  const phase = useRef({ cycles: 0, last: 0 });
  const voice = useRef<StringVoice | null>(null);
  const focus = useRef<"peg" | "bridge" | null>(null);
  const geometry = useRef<Layout | null>(null);

  const hz = stringFrequency(length, tension, MU);

  useEffect(() => {
    voice.current?.setFrequency(hz);
  }, [hz]);
  useEffect(() => () => voice.current?.stop(), []);

  const setRawLength = (value: number) => {
    raw.current.length = clamp(value, L_RANGE);
    setLength(snapTo(raw.current.length, LENGTH_SNAPS, 0.015));
  };
  const setRawTension = (value: number) => {
    raw.current.tension = clamp(value, T_RANGE);
    setTension(snapTo(raw.current.tension, TENSION_SNAPS, 0.03));
  };

  const release = (x: number, h: number) => {
    const amps = pluckAmplitudes(x, h, DRAWN_MODES);
    pluck.current = {
      amps,
      start: now(),
      peak: Math.max(...amps.slice(0, BARS).map(Math.abs), 1e-6),
    };
    voice.current?.stop();
    voice.current = pluckedString(
      hz,
      pluckAmplitudes(x, h, SOUND_MODES),
      (n) => modeDecay(n, TAU),
      0.3 + 0.5 * Math.min(1, Math.abs(h)),
    );
  };

  const local = (event: PointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return { px: event.clientX - box.left, py: event.clientY - box.top };
  };

  const grabAt = (px: number, py: number, g: Layout) => ({
    x: Math.min(0.97, Math.max(0.03, (px - g.nutX) / (g.bridgeX - g.nutX))),
    h: Math.min(1, Math.max(-1, (py - g.mid) / g.pull)),
  });

  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    const g = geometry.current;
    if (!g) return;
    const { px, py } = local(event);
    let kind: Drag | null = null;
    if (Math.hypot(px - g.pegX, py - g.pegY) <= g.pegR + 16) kind = "peg";
    else if (Math.abs(px - g.bridgeX) <= 14 && (py > g.mid + 4 || Math.abs(px - g.bridgeX) <= 7))
      kind = "bridge";
    else if (px > g.nutX && px < g.bridgeX) kind = "pluck";
    else if (px > Math.max(g.bridgeX + 14, g.hookX - 24) && px < g.wallX + 6) kind = "spring";
    if (!kind) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { kind, angle: Math.atan2(py - g.pegY, px - g.pegX) };
    if (kind === "pluck") {
      // Touching the string stops it, as a finger would.
      voice.current?.stop();
      voice.current = null;
      pluck.current = null;
      grab.current = grabAt(px, py, g);
    }
  };

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    const g = geometry.current;
    if (!d || !g) return;
    const { px, py } = local(event);
    if (d.kind === "pluck") grab.current = grabAt(px, py, g);
    else if (d.kind === "bridge") setRawLength((px - g.nutX) / g.perMetre);
    else if (d.kind === "spring") {
      const span = T_RANGE[1] - T_RANGE[0];
      const stretch = g.wallX - px;
      const from = g.springAt(T_RANGE[0]);
      const to = g.springAt(T_RANGE[1]);
      setRawTension(T_RANGE[0] + ((stretch - from) / (to - from)) * span);
    } else if (d.kind === "peg") {
      if (Math.hypot(px - g.pegX, py - g.pegY) < 5) return;
      const angle = Math.atan2(py - g.pegY, px - g.pegX);
      let turn = angle - d.angle;
      if (turn > Math.PI) turn -= 2 * Math.PI;
      if (turn < -Math.PI) turn += 2 * Math.PI;
      d.angle = angle;
      // Clockwise on screen tightens.
      setRawTension(
        raw.current.tension + (turn / (2 * Math.PI * PEG_TURNS)) * (T_RANGE[1] - T_RANGE[0]),
      );
    }
  };

  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.kind !== "pluck") return;
    const g = grab.current;
    grab.current = null;
    if (!g) return;
    // A tap without a pull still plucks, gently, where it landed.
    release(g.x, Math.abs(g.h) < 0.04 ? -0.3 : g.h);
  };

  const sliderKeys = (kind: "peg" | "bridge") => (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const big = event.shiftKey ? 5 : 1;
    if (kind === "peg") setRawTension(tension + step * big * 4);
    else setRawLength(length + step * big * 0.01);
  };

  const reset = () => {
    raw.current = { length: L0, tension: T0 };
    setLength(L0);
    setTension(T0);
  };

  useAnimation(panel, () => {
    const colors = panelColors(panel.current);
    const t = now();
    const ph = phase.current;
    const dt = ph.last ? Math.min(0.1, t - ph.last) : 0;
    ph.last = t;
    if (!reduced) ph.cycles += SHOWN_PER_HZ * hz * dt;
    const p = pluck.current;
    const age = p ? t - p.start : 0;
    if (p && age > 6 * TAU) pluck.current = null;
    const g = grab.current;
    const preview = g ? pluckAmplitudes(g.x, g.h, DRAWN_MODES) : null;
    const peak = preview ? Math.max(...preview.slice(0, BARS).map(Math.abs), 1e-6) : p?.peak;

    /** How far mode n is out at this moment, and how far it can swing now. */
    const modeNow = (n: number) => {
      if (preview) return { value: preview[n - 1], reach: Math.abs(preview[n - 1]) };
      if (!pluck.current || !p) return { value: 0, reach: 0 };
      const reach = Math.abs(p.amps[n - 1]) * modeEnvelope(n, age, TAU);
      const swing = reduced ? 1 : Math.cos(2 * Math.PI * n * ph.cycles);
      return { value: p.amps[n - 1] * modeEnvelope(n, age, TAU) * swing, reach };
    };

    const s = stringCanvas.current && fitCanvas(stringCanvas.current);
    if (s) {
      const geo = layout(s.width, length, tension);
      geometry.current = geo;
      const count = mode === "parts" ? PART_ROWS : DRAWN_MODES;
      const modes = Array.from({ length: count }, (_, i) => modeNow(i + 1));
      drawInstrument(s.ctx, geo, colors, tension, focus.current);
      const shape = (x: number) =>
        modes.reduce((sum, m, i) => sum + m.value * modeShape(i + 1, x), 0);
      const band = (x: number) =>
        modes.reduce((sum, m, i) => sum + m.reach * Math.abs(modeShape(i + 1, x)), 0);
      if (g && mode === "parts") {
        drawString(s.ctx, geo, (x) => triangleAt(x, g.x, g.h), colors.muted, 1.5, [4, 4]);
      }
      if (reduced && !g && pluck.current) {
        drawBand(s.ctx, geo, band, colors.accent);
        drawString(s.ctx, geo, () => 0, colors.ink, 2.5);
      } else {
        drawString(
          s.ctx,
          geo,
          g && mode === "string" ? (x) => triangleAt(x, g.x, g.h) : shape,
          colors.ink,
          2.5,
        );
      }
    }

    const geo = geometry.current;
    const r = partsCanvas.current && fitCanvas(partsCanvas.current);
    if (r && geo) {
      const { ctx } = r;
      const scale = (ROW_HEIGHT / 2 - 3) / Math.max(peak ?? 1, 0.05);
      for (let i = 0; i < PART_ROWS; i++) {
        const n = i + 1;
        const mid = i * ROW_HEIGHT + ROW_HEIGHT / 2;
        const m = modeNow(n);
        const color = modeColor(n);
        ctx.fillStyle = color;
        ctx.font = "600 12px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textBaseline = "middle";
        ctx.fillText(`${n}×`, 6, mid);
        // The shape this mode can take, faint, so its nodes show even when it is silent.
        const guide = { ...geo, mid, pull: ROW_HEIGHT / 2 - 3 };
        drawString(ctx, guide, (x) => modeShape(n, x), colors.line, 1, [3, 3]);
        drawString(ctx, guide, (x) => -modeShape(n, x), colors.line, 1, [3, 3]);
        const rowGeo = { ...geo, mid, pull: scale };
        if (reduced && !g) drawBand(ctx, rowGeo, (x) => m.reach * Math.abs(modeShape(n, x)), color);
        else drawString(ctx, rowGeo, (x) => m.value * modeShape(n, x), color, 2);
        ctx.fillStyle = colors.ink;
        for (const node of modeNodes(n)) {
          ctx.beginPath();
          ctx.arc(geo.nutX + node * (geo.bridgeX - geo.nutX), mid, 2.5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }

    const b = barsCanvas.current && fitCanvas(barsCanvas.current);
    if (b) {
      const { ctx, width } = b;
      const slot = width / BARS;
      const top = 6;
      const base = BAR_HEIGHT - 32;
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, base + 0.5);
      ctx.lineTo(width, base + 0.5);
      ctx.stroke();
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (let i = 0; i < BARS; i++) {
        const n = i + 1;
        const cx = slot * (i + 0.5);
        const w = Math.max(6, slot * 0.55);
        const amount = peak ? modeNow(n).reach / peak : 0;
        ctx.fillStyle = colors.line;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(cx - w / 2, top, w, base - top);
        ctx.globalAlpha = 1;
        if (amount > 0.002) {
          const h = (base - top) * Math.min(1, amount);
          ctx.fillStyle = modeColor(n);
          ctx.fillRect(cx - w / 2, base - h, w, h);
        }
        ctx.fillStyle = modeColor(n);
        ctx.fillText(`${n}×`, cx, base + 4);
        ctx.fillStyle = colors.muted;
        ctx.fillText(compactHz(hz * n), cx, base + 17);
      }
      ctx.textAlign = "start";
    }
  });

  const lengthRatio = length / L0;
  const tensionRatio = tension / T0;

  return (
    <section ref={panel} className={clsx(styles.panel, "not-prose")} aria-label="Plucked string">
      <div className="relative">
        <canvas
          ref={stringCanvas}
          className={styles.canvas}
          style={{ height: STRING_HEIGHT, cursor: "grab" }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          role="img"
          aria-label="A string from a tuning peg over a movable bridge to a spring scale"
        />
        <div
          role="slider"
          tabIndex={0}
          className="sr-only"
          aria-label="Tension: turn the peg"
          aria-valuemin={T_RANGE[0]}
          aria-valuemax={T_RANGE[1]}
          aria-valuenow={Math.round(tension)}
          aria-valuetext={`${Math.round(tension)} newtons`}
          onKeyDown={sliderKeys("peg")}
          onFocus={() => {
            focus.current = "peg";
          }}
          onBlur={() => {
            focus.current = null;
          }}
        />
        <div
          role="slider"
          tabIndex={0}
          className="sr-only"
          aria-label="Length: move the bridge"
          aria-valuemin={L_RANGE[0] * 100}
          aria-valuemax={L_RANGE[1] * 100}
          aria-valuenow={Math.round(length * 100)}
          aria-valuetext={`${Math.round(length * 100)} centimetres`}
          onKeyDown={sliderKeys("bridge")}
          onFocus={() => {
            focus.current = "bridge";
          }}
          onBlur={() => {
            focus.current = null;
          }}
        />
        <button type="button" className="sr-only" onClick={() => release(0.25, -0.4)}>
          Pluck
        </button>
      </div>

      {mode === "parts" && (
        <canvas
          ref={partsCanvas}
          className={clsx(styles.canvas, "mt-tight")}
          style={{ height: ROW_HEIGHT * PART_ROWS }}
          role="img"
          aria-label="The first eight standing waves of the string, which add up to its shape"
        />
      )}

      <canvas
        ref={barsCanvas}
        className={clsx(styles.canvas, "mt-tight")}
        style={{ height: BAR_HEIGHT }}
        role="img"
        aria-label="How much of each standing wave is in the sound, and its frequency in hertz"
      />

      <dl className="mt-label grid grid-cols-3 gap-label">
        <div className={styles.readout}>
          <dt>frequency</dt>
          <dd>{formatHz(hz)}</dd>
        </div>
        <div className={styles.readout}>
          <dt>length</dt>
          <dd>{Math.round(length * 100)} cm</dd>
        </div>
        <div className={styles.readout}>
          <dt>tension</dt>
          <dd>{Math.round(tension)} N</dd>
        </div>
      </dl>
      <div className={clsx(styles.mono, "mt-tight grid gap-hair text-sm")} aria-live="polite">
        <div>
          length {formatRatio(lengthRatio)} → frequency {formatRatio(1 / lengthRatio)}
        </div>
        <div>
          tension {formatRatio(tensionRatio)} → frequency {formatRatio(Math.sqrt(tensionRatio))}
        </div>
      </div>

      <div className="mt-para flex flex-wrap items-center gap-tight">
        <PianoSwitch
          label="View"
          value={mode}
          options={[
            { value: "string", label: "String" },
            { value: "parts", label: "Parts" },
          ]}
          onChange={setMode}
        />
        <button
          type="button"
          className={clsx(styles.button, styles.small)}
          onClick={reset}
          disabled={length === L0 && tension === T0}
        >
          Reset
        </button>
      </div>
    </section>
  );
}

/** A line along the vibrating part, `y(x)` out from the rest line (x 0–1 from nut to bridge). */
function drawString(
  ctx: CanvasRenderingContext2D,
  g: Pick<Layout, "nutX" | "bridgeX" | "mid" | "pull">,
  y: (x: number) => number,
  color: string,
  width: number,
  dash: number[] = [],
) {
  const len = g.bridgeX - g.nutX;
  const steps = Math.max(48, Math.floor(len / 2));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash(dash);
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const x = i / steps;
    const px = g.nutX + x * len;
    const py = g.mid + y(x) * g.pull;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.setLineDash([]);
}

/** The area a string sweeps through, for readers who asked for less motion. */
function drawBand(
  ctx: CanvasRenderingContext2D,
  g: Pick<Layout, "nutX" | "bridgeX" | "mid" | "pull">,
  reach: (x: number) => number,
  color: string,
) {
  const len = g.bridgeX - g.nutX;
  const steps = Math.max(48, Math.floor(len / 2));
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const x = i / steps;
    ctx.lineTo(g.nutX + x * len, g.mid - reach(x) * g.pull);
  }
  for (let i = steps; i >= 0; i--) {
    const x = i / steps;
    ctx.lineTo(g.nutX + x * len, g.mid + reach(x) * g.pull);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Peg, nut, bridge, the dead end of the string and the spring scale. */
function drawInstrument(
  ctx: CanvasRenderingContext2D,
  g: Layout,
  colors: PanelColors,
  tension: number,
  focused: "peg" | "bridge" | null,
) {
  const { mid } = g;
  const base = mid + 26;

  // Track the bridge slides along, with a tick where it started.
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(g.nutX, base + 1);
  ctx.lineTo(g.nutX + L_RANGE[1] * g.perMetre, base + 1);
  ctx.stroke();
  const startX = g.nutX + L0 * g.perMetre;
  ctx.strokeStyle = colors.muted;
  ctx.beginPath();
  ctx.moveTo(startX, base + 4);
  ctx.lineTo(startX, base + 10);
  ctx.stroke();

  // The string past the bridge, which does not sound, out to the spring.
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(g.bridgeX, mid);
  ctx.lineTo(g.hookX, mid);
  ctx.stroke();

  // Spring: a zigzag from the hook to the wall, longer the harder it pulls.
  const coils = 9;
  const springStart = g.hookX + 6;
  const springLength = g.wallX - springStart;
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(g.hookX, mid);
  ctx.lineTo(springStart, mid);
  for (let i = 0; i < coils; i++) {
    ctx.lineTo(springStart + ((i + 0.5) / coils) * springLength, mid + (i % 2 ? 6 : -6));
  }
  ctx.lineTo(g.wallX, mid);
  ctx.stroke();
  ctx.fillStyle = colors.ink;
  ctx.beginPath();
  ctx.arc(g.hookX, mid, 3, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = colors.muted;
  ctx.fillRect(g.wallX, mid - 26, 4, 52);

  // The scale under the spring: ticks at a quarter, half, once, twice and four times the start.
  const scaleY = mid + 18;
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(g.wallX - g.springAt(T_RANGE[1]), scaleY);
  ctx.lineTo(g.wallX - g.springAt(T_RANGE[0]), scaleY);
  ctx.stroke();
  for (const r of [1 / 4, 1 / 2, 1, 2, 4]) {
    const x = g.wallX - g.springAt(T0 * r);
    ctx.strokeStyle = r === 1 ? colors.muted : colors.line;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, scaleY - 4);
    ctx.lineTo(x, scaleY + 4);
    ctx.stroke();
  }
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.moveTo(g.hookX, scaleY - 2);
  ctx.lineTo(g.hookX - 5, scaleY + 7);
  ctx.lineTo(g.hookX + 5, scaleY + 7);
  ctx.closePath();
  ctx.fill();

  // From the nut back to the peg the string winds on.
  ctx.strokeStyle = colors.muted;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(g.pegX, mid);
  ctx.lineTo(g.nutX, mid);
  ctx.stroke();

  // Peg: turns with the tension, three turns from slack to tight.
  const turned = ((tension - T_RANGE[0]) / (T_RANGE[1] - T_RANGE[0])) * PEG_TURNS * 2 * Math.PI;
  ctx.save();
  ctx.translate(g.pegX, g.pegY);
  ctx.rotate(turned);
  ctx.fillStyle = colors.track;
  ctx.strokeStyle = colors.ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, g.pegR, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = colors.ink;
  ctx.beginPath();
  ctx.roundRect(-g.pegR - 4, -3.5, 2 * g.pegR + 8, 7, 3.5);
  ctx.fill();
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.arc(g.pegR - 1, 0, 3, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();

  // Nut and bridge: the two points the sounding part runs between.
  const wedge = (x: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, mid);
    ctx.lineTo(x - 8, base);
    ctx.lineTo(x + 8, base);
    ctx.closePath();
    ctx.fill();
  };
  wedge(g.nutX, colors.muted);
  wedge(g.bridgeX, colors.ink);

  if (focused) {
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (focused === "peg") ctx.arc(g.pegX, g.pegY, g.pegR + 6, 0, 2 * Math.PI);
    else ctx.arc(g.bridgeX, mid + 14, 18, 0, 2 * Math.PI);
    ctx.stroke();
  }
}
