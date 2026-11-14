import clsx from "clsx";
import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { harmonicTone } from "src/lib/piano/harmonicSound";
import {
  analyse,
  HARMONIC_COUNT,
  type Harmonics,
  normalise,
  strokeToPeriod,
  WAVE_PRESETS,
  type WavePreset,
  waveAt,
} from "src/lib/piano/harmonics";
import { formatHz, midiToHz, noteName, roleColor } from "src/lib/piano/notes";
import type { HeldTone } from "src/lib/piano/synth";
import { fitCanvas, panelColors, useAnimation } from "./canvas";
import { PianoSelect, PianoSwitch } from "./controls";
import styles from "./piano.module.css";

const SUM_HEIGHT = 140; // the sum's area, a 12px gap to the rows included
const SUM_GAP = 12;
const ROW_HEIGHT = 30;
const FLIGHT = 0.45; // seconds a change takes to travel from its row into the sum
const GLIDE = 0.5; // seconds a slider takes to glide to a preset or a drawn shape
const GLIDE_STAGGER = 0.06;
const ROOTS = [36, 41, 45, 48, 52, 57, 60]; // C2 … C4
const PRESETS: { value: WavePreset; label: string }[] = [
  { value: "pure", label: "Pure" },
  { value: "square", label: "Square" },
  { value: "sawtooth", label: "Sawtooth" },
  { value: "triangle", label: "Triangle" },
];

type Mode = "build" | "take";
type Point = { x: number; y: number };

const harmonicColor = (n: number) => roleColor(12 * Math.log2(n));
const copy = (h: Harmonics): Harmonics => ({
  amplitudes: [...h.amplitudes],
  phases: [...h.phases],
});
const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** A lopsided bump, so "take apart" has a shape to show before anyone draws. */
const SEED: Point[] = Array.from({ length: 65 }, (_, i) => {
  const x = i / 64;
  return {
    x,
    y: 0.85 * Math.exp(-(((x - 0.28) / 0.1) ** 2)) - 0.45 * Math.exp(-(((x - 0.68) / 0.16) ** 2)),
  };
});

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
 * One note as a stack of harmonics: harmonic n has n peaks in the window.
 * Build a wave by turning harmonics up, or draw a wave and see how much of
 * each harmonic it holds.
 */
export function Overtones() {
  const panel = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>("build");
  const [wave, setWave] = useState<Harmonics>(() => copy(WAVE_PRESETS.sawtooth));
  const [root, setRoot] = useState(45);
  const [playing, setPlaying] = useState(false);
  const reduced = useReducedMotion();
  const f0 = midiToHz(root);
  const waveRef = useRef(wave);
  waveRef.current = wave;

  // What the sum shows: each harmonic lands there once its change has flown up from its row.
  const shown = useRef<Harmonics>(copy(WAVE_PRESETS.sawtooth));
  const flights = useRef(new Map<number, number>());
  const fit = useRef(0);
  const glide = useRef<{ from: Harmonics; to: Harmonics; start: number } | null>(null);
  const trace = useRef<{ points: Point[]; offset: number; gain: number } | null>(null);
  const drawing = useRef(false);
  const tone = useRef<HeldTone | null>(null);
  const soundStale = useRef(false);

  useEffect(() => {
    tone.current?.setFrequency(f0, 0.02);
  }, [f0]);
  useEffect(() => () => tone.current?.stop(), []);

  const glideTo = useCallback(
    (to: Harmonics) => {
      if (reduced) {
        glide.current = null;
        setWave(copy(to));
        return;
      }
      glide.current = { from: copy(waveRef.current), to: copy(to), start: now() };
    },
    [reduced],
  );

  /** Takes the drawn wave apart and moves the sliders to what it holds. */
  const takeApart = useCallback(
    (points: Point[]) => {
      const samples = strokeToPeriod(points);
      const offset = samples.reduce((sum, y) => sum + y, 0) / samples.length;
      const { harmonics, gain } = normalise(analyse(samples));
      const flat = gain < 0.02;
      trace.current = { points, offset, gain: flat ? 1 : gain };
      glideTo(
        flat
          ? { amplitudes: harmonics.amplitudes.map(() => 0), phases: harmonics.phases }
          : harmonics,
      );
    },
    [glideTo],
  );

  const switchMode = (next: Mode) => {
    setMode(next);
    if (next === "take") takeApart(trace.current?.points ?? SEED);
  };

  const setHarmonic = (i: number, value: number) => {
    glide.current = null;
    setWave((w) => {
      if (w.amplitudes[i] === value) return w;
      const amplitudes = [...w.amplitudes];
      amplitudes[i] = value;
      return { amplitudes, phases: w.phases };
    });
  };

  const toggle = () => {
    if (tone.current) {
      tone.current.stop();
      tone.current = null;
      setPlaying(false);
    } else {
      tone.current = harmonicTone(f0, shown.current.amplitudes);
      setPlaying(true);
    }
  };

  // Drawing a wave in "take apart".
  const pointAt = (event: PointerEvent<HTMLDivElement>): Point => {
    const box = event.currentTarget.getBoundingClientRect();
    const half = (SUM_HEIGHT - SUM_GAP) / 2;
    return {
      x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
      y: Math.min(1, Math.max(-1, (half - (event.clientY - box.top)) / (half - 6))),
    };
  };
  const drawDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drawing.current = true;
    glide.current = null;
    trace.current = { points: [pointAt(event)], offset: 0, gain: trace.current?.gain ?? 1 };
  };
  const drawMove = (event: PointerEvent<HTMLDivElement>) => {
    if (drawing.current && trace.current) trace.current.points.push(pointAt(event));
  };
  const drawUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const points = trace.current?.points ?? [];
    if (points.length > 1) takeApart(points);
  };

  useAnimation(panel, () => {
    const t = now();

    // Sliders gliding to a preset or a drawn shape, one after another.
    const g = glide.current;
    if (g) {
      const amplitudes = g.from.amplitudes.map((a, i) => {
        const k = ease((t - g.start - i * GLIDE_STAGGER) / GLIDE);
        return a + (g.to.amplitudes[i] - a) * k;
      });
      setWave({ amplitudes, phases: g.to.phases });
      if (t - g.start > GLIDE + HARMONIC_COUNT * GLIDE_STAGGER) glide.current = null;
    }

    // Changes fly from their rows into the sum, and land there.
    const s = shown.current;
    for (let i = 0; i < HARMONIC_COUNT; i++) {
      const changed =
        Math.abs(wave.amplitudes[i] - s.amplitudes[i]) > 1e-4 ||
        (wave.amplitudes[i] > 1e-4 && Math.abs(wave.phases[i] - s.phases[i]) > 1e-4);
      const started = flights.current.get(i);
      if (reduced) {
        if (changed) {
          s.amplitudes[i] = wave.amplitudes[i];
          s.phases[i] = wave.phases[i];
          soundStale.current = true;
        }
      } else if (started === undefined) {
        if (changed) flights.current.set(i, t);
      } else if (t - started >= FLIGHT) {
        flights.current.delete(i);
        s.amplitudes[i] = wave.amplitudes[i];
        s.phases[i] = wave.phases[i];
        soundStale.current = true;
      }
    }
    if (soundStale.current && tone.current) tone.current.setHarmonics(s.amplitudes);
    soundStale.current = false;

    const c = canvas.current && fitCanvas(canvas.current);
    if (!c) return;
    const { ctx, width } = c;
    const colors = panelColors(panel.current);
    const sumMid = (SUM_HEIGHT - SUM_GAP) / 2;
    const sumHalf = sumMid - 6;
    const rowHalf = ROW_HEIGHT / 2 - 3;
    const rowMid = (i: number) => SUM_HEIGHT + i * ROW_HEIGHT + ROW_HEIGHT / 2;
    const steps = Math.max(120, Math.floor(width / 1.5));
    const path = (y: (theta: number) => number) => {
      ctx.beginPath();
      for (let k = 0; k <= steps; k++) {
        const x = (k / steps) * width;
        const py = y((k / steps) * 2 * Math.PI);
        if (k === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.stroke();
    };
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // How tall the sum is drawn: matched to the drawing in "take apart", else fitted to its peak.
    let peak = 0;
    for (let k = 0; k < 96; k++) peak = Math.max(peak, Math.abs(waveAt(s, (k / 96) * 2 * Math.PI)));
    const tr = trace.current;
    const target = mode === "take" && tr ? tr.gain : 0.9 / Math.max(peak, 0.25);
    fit.current =
      reduced || fit.current === 0 ? target : fit.current + (target - fit.current) * 0.15;
    const sumY = (y: number) => sumMid - y * fit.current * sumHalf;

    // The sum's area: rest line, then the drawn wave, then the sum itself.
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, sumMid);
    ctx.lineTo(width, sumMid);
    ctx.moveTo(0, SUM_HEIGHT - SUM_GAP / 2);
    ctx.lineTo(width, SUM_HEIGHT - SUM_GAP / 2);
    ctx.stroke();
    if (mode === "take" && tr && tr.points.length > 1) {
      ctx.strokeStyle = colors.muted;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 5;
      ctx.beginPath();
      tr.points.forEach((p, k) => {
        const y = sumMid - (p.y - (drawing.current ? 0 : tr.offset)) * sumHalf;
        if (k === 0) ctx.moveTo(p.x * width, y);
        else ctx.lineTo(p.x * width, y);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (!drawing.current) {
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 2.5;
      path((theta) => sumY(waveAt(s, theta)));
    }

    // One row per harmonic: its shape faint, its share in its colour.
    for (let i = 0; i < HARMONIC_COUNT; i++) {
      const n = i + 1;
      const mid = rowMid(i);
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      path((theta) => mid - rowHalf * Math.sin(n * theta + wave.phases[i]));
      ctx.setLineDash([]);
      const a = wave.amplitudes[i];
      if (a > 1e-3) {
        ctx.strokeStyle = harmonicColor(n);
        ctx.lineWidth = 2;
        path((theta) => mid - rowHalf * a * Math.sin(n * theta + wave.phases[i]));
      }
    }

    // Changes on their way up: the difference between the new and the old harmonic.
    for (const [i, started] of flights.current) {
      const n = i + 1;
      const k = ease((t - started) / FLIGHT);
      const mid = rowMid(i) + (sumMid - rowMid(i)) * k;
      const scale = rowHalf + (fit.current * sumHalf - rowHalf) * k;
      const delta = (theta: number) =>
        wave.amplitudes[i] * Math.sin(n * theta + wave.phases[i]) -
        s.amplitudes[i] * Math.sin(n * theta + s.phases[i]);
      ctx.strokeStyle = harmonicColor(n);
      ctx.globalAlpha = 0.85 - 0.35 * k;
      ctx.lineWidth = 2;
      path((theta) => mid - scale * delta(theta));
      ctx.globalAlpha = 1;
    }
  });

  const presetMatch = PRESETS.find(({ value }) =>
    WAVE_PRESETS[value].amplitudes.every(
      (a, i) =>
        Math.abs(a - wave.amplitudes[i]) < 1e-3 &&
        (a < 1e-3 || Math.abs(WAVE_PRESETS[value].phases[i] - wave.phases[i]) < 1e-3),
    ),
  )?.value;

  return (
    <section
      ref={panel}
      className={clsx(styles.panel, "not-prose")}
      aria-label="Harmonics of one note"
    >
      <div
        className="grid gap-x-tight"
        style={{
          gridTemplateColumns: "26px minmax(96px, 34%) minmax(0, 1fr)",
          gridTemplateRows: `${SUM_HEIGHT}px repeat(${HARMONIC_COUNT}, ${ROW_HEIGHT}px)`,
        }}
      >
        <div className="col-span-2 flex flex-col items-start gap-tight">
          <button
            type="button"
            className={clsx(styles.button, styles.primary)}
            onClick={toggle}
            aria-pressed={playing}
          >
            {playing ? "Stop" : "Play"}
          </button>
          <PianoSelect
            label="base note"
            value={String(root)}
            options={ROOTS.map((m) => ({ value: String(m), label: noteName(m) }))}
            onChange={(v) => setRoot(Number(v))}
          />
        </div>
        <div
          className="relative"
          style={{ gridColumn: 3, gridRow: `1 / span ${HARMONIC_COUNT + 1}` }}
        >
          <canvas
            ref={canvas}
            className={clsx(styles.canvas, "h-full")}
            style={{ touchAction: "pan-y", pointerEvents: "none" }}
            role="img"
            aria-label="One period of the sum on top, and below it each harmonic with as many peaks as its number"
          />
          {mode === "take" && (
            <div
              className="absolute inset-x-0 top-0"
              style={{ height: SUM_HEIGHT - SUM_GAP, touchAction: "none", cursor: "crosshair" }}
              onPointerDown={drawDown}
              onPointerMove={drawMove}
              onPointerUp={drawUp}
              onPointerCancel={drawUp}
              role="img"
              aria-label="Drawing area for one period of a wave"
            />
          )}
        </div>
        {wave.amplitudes.map((a, i) => {
          const n = i + 1;
          return (
            <HarmonicRow
              // biome-ignore lint/suspicious/noArrayIndexKey: one row per harmonic number
              key={i}
              n={n}
              row={i + 2}
              value={a}
              hz={f0 * n}
              onChange={(v) => setHarmonic(i, v)}
            />
          );
        })}
      </div>

      <div className="mt-para flex flex-wrap items-center gap-tight">
        <PianoSwitch
          label="Mode"
          value={mode}
          options={[
            { value: "build", label: "Build" },
            { value: "take", label: "Take apart" },
          ]}
          onChange={switchMode}
        />
        {mode === "build" && (
          <fieldset className={clsx(styles.segmented, "m-0 min-w-0 border-0 p-0")}>
            <legend className="sr-only">Wave shapes</legend>
            {PRESETS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={clsx(styles.button, styles.small)}
                aria-pressed={presetMatch === value}
                onClick={() => glideTo(WAVE_PRESETS[value])}
              >
                {label}
              </button>
            ))}
          </fieldset>
        )}
      </div>
    </section>
  );
}

/** A harmonic's number and its slider, drawn in the harmonic's colour, with its frequency inside. */
function HarmonicRow({
  n,
  row,
  value,
  hz,
  onChange,
}: {
  n: number;
  row: number;
  value: number;
  hz: number;
  onChange: (value: number) => void;
}) {
  const dragging = useRef(false);
  const color = harmonicColor(n);
  const set = (v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    onChange(clamped < 0.02 ? 0 : Math.round(clamped * 1000) / 1000);
  };
  const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    set((event.clientX - box.left) / box.width);
  };
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 0.2 : 0.05;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? value + step
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? value - step
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? 1
              : null;
    if (next === null) return;
    event.preventDefault();
    set(next);
  };
  return (
    <>
      <span
        className={clsx(styles.mono, "self-center text-right text-xs font-semibold")}
        style={{ gridColumn: 1, gridRow: row, color }}
        aria-hidden="true"
      >
        {n}×
      </span>
      <div
        role="slider"
        tabIndex={0}
        aria-label={`Harmonic ${n}, ${formatHz(hz)}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-valuetext={`${Math.round(value * 100)}%`}
        className="relative my-[3px] cursor-pointer overflow-hidden rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          gridColumn: 2,
          gridRow: row,
          background: "var(--track)",
          border: "1px solid var(--line)",
          outlineColor: "var(--accent)",
          touchAction: "pan-y",
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          dragging.current = true;
          fromPointer(event);
        }}
        onPointerMove={(event) => dragging.current && fromPointer(event)}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        onKeyDown={onKey}
      >
        <div
          className="absolute inset-y-0 left-0"
          style={{ width: `${value * 100}%`, background: color }}
        />
        <span
          className={clsx(
            styles.mono,
            "pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px]",
          )}
          style={{ color: "var(--muted)" }}
        >
          {formatHz(hz)}
        </span>
      </div>
    </>
  );
}
