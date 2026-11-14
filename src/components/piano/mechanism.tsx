// Parts every mechanism demo shares: a key you hold with the pointer, the
// space bar or a button; a touch from soft to hard; slow motion; a string
// that rings, is struck and is silenced; and a trace of the key and the
// hammer over time.

import clsx from "clsx";
import { type KeyboardEvent, useEffect, useRef } from "react";
import { feltStrike } from "src/lib/piano/hammerHead";
import { pluckedString, type StringVoice } from "src/lib/piano/harmonicSound";
import { drawPaper, Scene, type View } from "./actionScene";
import { fitCanvas, type PanelColors } from "./canvas";
import { PianoSwitch } from "./controls";
import styles from "./piano.module.css";

export const SLOW_OPTIONS = [
  { value: "1", label: "Real speed" },
  { value: "0.1", label: "1/10" },
  { value: "0.025", label: "1/40" },
] as const;
export type Slow = (typeof SLOW_OPTIONS)[number]["value"];

export function SlowSwitch({ value, onChange }: { value: Slow; onChange: (v: Slow) => void }) {
  return <PianoSwitch label="Speed" value={value} options={SLOW_OPTIONS} onChange={onChange} />;
}

/** Soft to hard: how fast the finger pushes the key down. */
export function TouchSlider({
  value,
  onChange,
  readout,
}: {
  value: number;
  onChange: (v: number) => void;
  readout: string;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col">
      <span className={clsx(styles.muted, "flex justify-between gap-label text-xs")}>
        <span>soft</span>
        <span className={styles.mono}>{readout}</span>
        <span>hard</span>
      </span>
      <input
        className={styles.slider}
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        aria-label="Touch"
        aria-valuetext={readout}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

/** Keeps a pointer's moves and release coming here, if the browser still knows the pointer. */
export function capturePointer(event: { pointerId: number; currentTarget: Element }) {
  try {
    event.currentTarget.setPointerCapture?.(event.pointerId);
  } catch {
    // The pointer is already gone, e.g. a synthetic event.
  }
}

/** A button that holds the key down while it is pressed. */
export function HoldButton({
  label = "Press the key",
  onHold,
}: {
  label?: string;
  onHold: (down: boolean) => void;
}) {
  const held = useRef(false);
  const set = (down: boolean) => {
    if (held.current === down) return;
    held.current = down;
    onHold(down);
  };
  return (
    <button
      type="button"
      className={clsx(styles.button, styles.primary)}
      style={{ touchAction: "none" }}
      onPointerDown={(event) => {
        event.preventDefault();
        capturePointer(event);
        set(true);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onKeyDown={(event) => {
        if ((event.key === " " || event.key === "Enter") && !event.repeat) {
          event.preventDefault();
          set(true);
        }
      }}
      onKeyUp={(event) => {
        if (event.key === " " || event.key === "Enter") set(false);
      }}
      onBlur={() => set(false)}
    >
      {label}
    </button>
  );
}

/** Space held on the demo (outside its own controls) holds the key down. */
export function spaceHolds(onHold: (down: boolean) => void) {
  const fromControl = (event: KeyboardEvent) =>
    (event.target as HTMLElement).closest("button, input, select, [role=radiogroup]") !== null;
  return {
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key !== " " || fromControl(event)) return;
      event.preventDefault();
      if (!event.repeat) onHold(true);
    },
    onKeyUp: (event: KeyboardEvent) => {
      if (event.key !== " " || fromControl(event)) return;
      onHold(false);
    },
  };
}

// ── The string ─────────────────────────────────────────────────────────────

const SHOWN_MODES = 10;
const SHOWN_HZ = 2.2; // the drawn fundamental swings about twice a second
const FREE_FADE = 2.6; // seconds, real time, for a free string to fade on screen
const DAMPED_FADE = 0.04; // seconds, mechanism time, for a damped string

/**
 * The string the mechanism strikes: what it looks like (slowed down, a few
 * standing waves) and what it sounds like (at full speed).
 */
export class RingingString {
  amplitude = 0;
  private modes: number[] = [];
  private phase = 0;
  private voice: StringVoice | null = null;

  constructor(
    readonly hz: number,
    /** Where it is struck or plucked, as a fraction of its length. */
    readonly at: number,
    readonly level = 0.6,
  ) {}

  /** A blow at `speed` m/s; `size` 0–1 scales the drawn swing. */
  strike(speed: number, size: number, spectrum = feltStrike(speed, this.hz, 32)) {
    this.modes = spectrum
      .slice(0, SHOWN_MODES)
      .map((a, i) => a * Math.sign(Math.sin((i + 1) * Math.PI * this.at)));
    const peak = Math.max(...this.modes.map(Math.abs), 1e-6);
    this.modes = this.modes.map((a) => a / peak);
    this.amplitude = Math.min(1, Math.max(this.amplitude * 0.4, size));
    this.phase = 0;
    this.voice?.stop();
    this.voice = pluckedString(
      this.hz,
      spectrum,
      (n) => 3.2 / (1 + 0.35 * (n - 1)),
      this.level * (0.15 + 0.85 * Math.min(1, size)),
    );
  }

  /** Changes the pitch of the sounding string, e.g. while a tangent presses it. */
  retune(hz: number) {
    this.voice?.setFrequency(hz);
  }

  /** Stops the sound and lets the drawing settle quickly. */
  silence() {
    this.voice?.stop();
    this.voice = null;
  }

  /** Advances the drawing: `real` seconds on the clock, `mechanism` seconds of the model. */
  advance(real: number, mechanism: number, free: boolean) {
    this.phase += real * SHOWN_HZ;
    this.amplitude *= free ? Math.exp(-real / FREE_FADE) : Math.exp(-mechanism / DAMPED_FADE);
    if (this.amplitude < 0.002) this.amplitude = 0;
  }

  /** Displacement at u (0–1 along the string), between −1 and 1. */
  at01(u: number) {
    if (!this.amplitude) return 0;
    let y = 0;
    for (let i = 0; i < this.modes.length; i++) {
      const n = i + 1;
      y += this.modes[i] * Math.sin(n * Math.PI * u) * Math.cos(2 * Math.PI * n * this.phase);
    }
    return (y / 2) * this.amplitude;
  }

  dispose() {
    this.voice?.stop();
  }
}

/** Keeps one RingingString per demo, stopped when the demo unmounts. */
export function useRingingString(hz: number, at: number, level?: number) {
  const ref = useRef<RingingString | null>(null);
  if (!ref.current) ref.current = new RingingString(hz, at, level);
  useEffect(() => () => ref.current?.dispose(), []);
  return ref.current;
}

// ── The trace ──────────────────────────────────────────────────────────────

export type TraceLine = { color: string; values: number[]; dashed?: boolean; width?: number };

const TRACE_SECONDS = 5;

/** Keeps the last few seconds of a few values, sampled every frame. */
export class Trace {
  private times: number[] = [];
  private rows: number[][] = [];

  push(time: number, values: number[]) {
    this.times.push(time);
    this.rows.push(values);
    while (this.times.length && this.times[0] < time - TRACE_SECONDS) {
      this.times.shift();
      this.rows.shift();
    }
  }

  /** Draws column `i` of each row as a line; `marks` are horizontal guide levels. */
  draw(
    canvas: HTMLCanvasElement,
    now: number,
    lines: { column: number; color: string; width?: number }[],
    marks: { level: number; color: string }[],
    colors: PanelColors,
  ) {
    const fitted = fitCanvas(canvas);
    if (!fitted) return;
    const { ctx, width, height } = fitted;
    const pad = 6;
    const y = (v: number) => height - pad - v * (height - 2 * pad);
    ctx.lineWidth = 1;
    for (const mark of marks) {
      ctx.strokeStyle = mark.color;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y(mark.level));
      ctx.lineTo(width, y(mark.level));
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = colors.line;
    ctx.beginPath();
    ctx.moveTo(0, y(0));
    ctx.lineTo(width, y(0));
    ctx.stroke();
    for (const line of lines) {
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.width ?? 2;
      ctx.lineJoin = "round";
      ctx.beginPath();
      this.times.forEach((t, i) => {
        const x = width - ((now - t) / TRACE_SECONDS) * width;
        const v = this.rows[i][line.column];
        if (i === 0) ctx.moveTo(x, y(v));
        else ctx.lineTo(x, y(v));
      });
      ctx.stroke();
    }
  }
}

/** A readout whose caption carries the colour of its line in the trace. */
export function LineReadout({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className={clsx(styles.readout, styles.wordy)}>
      <dt>
        <span
          aria-hidden
          className="mr-hair inline-block h-0.5 w-3 align-middle"
          style={{ background: color }}
        />
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

/** Milliseconds, for the touch readout. */
export const formatMs = (seconds: number) => `${Math.round(seconds * 1000)} ms`;

/** Clears `canvas` and returns a scene fitted to it, ready to draw parts on. */
export function sceneOn(
  canvas: HTMLCanvasElement | null,
  view: View,
  colors: PanelColors,
  fresh: ReadonlySet<string>,
  hovered: string | null,
) {
  const fitted = canvas && fitCanvas(canvas);
  if (!fitted) return null;
  const dark = document.documentElement.classList.contains("dark");
  drawPaper(fitted.ctx, fitted.width, fitted.height, colors, dark);
  return new Scene(fitted.ctx, view, fitted.width, fitted.height, colors, dark, fresh, hovered);
}

/** The named part under a pointer event on the scene's canvas. */
export function partUnder(
  scene: Scene | null,
  event: { clientX: number; clientY: number; currentTarget: Element },
) {
  const box = event.currentTarget.getBoundingClientRect();
  return scene?.partAt(event.clientX - box.left, event.clientY - box.top) ?? null;
}
