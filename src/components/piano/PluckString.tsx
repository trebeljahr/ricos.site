import clsx from "clsx";
import { type PointerEvent, useRef, useState } from "react";
import type { Voice } from "src/lib/piano/audio";
import { formatCents, formatHz, nearestNote, noteName } from "src/lib/piano/notes";
import { pluckModes, stringAt } from "src/lib/piano/physics";
import { pluckTone } from "src/lib/piano/synth";
import { fitCanvas, logScale, panelColors, useAnimation } from "./canvas";
import styles from "./piano.module.css";

const MIN_HZ = 20;
const MAX_HZ = 20000;
const scale = logScale(MIN_HZ, MAX_HZ);
const PIANO_RANGE: [number, number] = [27.5, 4186];
const DECAY = 3.2; // seconds the fundamental takes to fade, on screen
const PICKUP = 0.18; // where along the string the trace is measured
const TRACE_SECONDS = 3;
const MARGIN = 22;

/** How fast the string moves on screen: higher notes visibly faster, all slowed down. */
const shownFrequency = (hz: number) => 0.6 * (hz / MIN_HZ) ** 0.4;
const modeCount = (hz: number) => Math.max(1, Math.min(40, Math.floor(18000 / hz)));

type Pluck = { modes: number[]; start: number; shown: number };

/**
 * A string to pull and let go. It vibrates on screen, slowed down, while the
 * trace below records the motion of one point on it; you hear the same
 * vibration at the real frequency.
 */
export function PluckString({ initialHz = 110 }: { initialHz?: number }) {
  const panel = useRef<HTMLElement>(null);
  const stringCanvas = useRef<HTMLCanvasElement>(null);
  const traceCanvas = useRef<HTMLCanvasElement>(null);
  const [hz, setHz] = useState(initialHz);
  const pluck = useRef<Pluck | null>(null);
  const grab = useRef<{ x: number; y: number } | null>(null);
  const trace = useRef<{ t: number; y: number }[]>([]);
  const voice = useRef<Voice | null>(null);
  const now = () => performance.now() / 1000;

  const release = (position: number, height: number) => {
    const count = modeCount(hz);
    const modes = pluckModes(position, height, count);
    pluck.current = { modes, start: now(), shown: shownFrequency(hz) };
    voice.current?.stop();
    voice.current = pluckTone(
      hz,
      modes.map((m) => Math.abs(m)),
      { level: 0.25 + 0.5 * Math.min(1, Math.abs(height) / 0.4) },
    );
  };

  const pointOnString = (event: PointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left - MARGIN) / (box.width - 2 * MARGIN);
    const y = (event.clientY - box.top - box.height / 2) / (box.height / 2 - 8);
    return { x: Math.min(0.97, Math.max(0.03, x)), y: Math.min(1, Math.max(-1, y)) * 0.45 };
  };

  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    voice.current?.stop();
    pluck.current = null;
    grab.current = pointOnString(event);
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (grab.current) grab.current = pointOnString(event);
  };
  const up = () => {
    const g = grab.current;
    if (!g) return;
    grab.current = null;
    // A tap without a pull still plucks, gently, where it landed.
    release(g.x, Math.abs(g.y) < 0.03 ? 0.18 : g.y);
  };

  useAnimation(panel, () => {
    const colors = panelColors(panel.current);
    const s = stringCanvas.current && fitCanvas(stringCanvas.current);
    const t = now();
    const p = pluck.current;
    const age = p ? t - p.start : 0;
    const yAt = (x: number) => {
      if (grab.current) {
        const g = grab.current;
        return x <= g.x ? (g.y * x) / g.x : (g.y * (1 - x)) / (1 - g.x);
      }
      return p ? stringAt(p.modes, x, age, p.shown, DECAY) : 0;
    };
    if (s) {
      const { ctx, width, height } = s;
      const mid = height / 2;
      const len = width - 2 * MARGIN;
      const amp = height / 2 - 8;
      // Bridges at both ends.
      ctx.fillStyle = colors.muted;
      ctx.fillRect(MARGIN - 4, mid - 18, 4, 36);
      ctx.fillRect(width - MARGIN, mid - 18, 4, 36);
      // Rest line and pickup point.
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(MARGIN, mid);
      ctx.lineTo(width - MARGIN, mid);
      ctx.stroke();
      // The string.
      ctx.strokeStyle = colors.ink;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      const steps = Math.max(80, Math.floor(len / 3));
      for (let i = 0; i <= steps; i++) {
        const x = i / steps;
        const px = MARGIN + x * len;
        const py = mid + yAt(x) * amp;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(MARGIN + PICKUP * len, mid + yAt(PICKUP) * amp, 5, 0, 2 * Math.PI);
      ctx.fill();
    }

    // The trace: the pickup point's height over the last few seconds.
    const samples = trace.current;
    samples.push({ t, y: yAt(PICKUP) });
    while (samples.length && samples[0].t < t - TRACE_SECONDS) samples.shift();
    const c = traceCanvas.current && fitCanvas(traceCanvas.current);
    if (c) {
      const { ctx, width, height } = c;
      const mid = height / 2;
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(width, mid);
      ctx.stroke();
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      samples.forEach((sample, i) => {
        const x = width - ((t - sample.t) / TRACE_SECONDS) * width;
        const y = mid + sample.y * (height / 2 - 6) * 1.6;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  });

  const note = nearestNote(hz);
  const inPiano = hz >= PIANO_RANGE[0] * 0.985 && hz <= PIANO_RANGE[1] * 1.015;
  const slower = hz / shownFrequency(hz);
  const position = scale.toPosition(hz);
  const audible = modeCount(hz);

  return (
    <section ref={panel} className={clsx(styles.panel, "not-prose")} aria-label="Plucked string">
      <canvas
        ref={stringCanvas}
        className={styles.canvas}
        style={{ height: 170, cursor: "grab" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        role="img"
        aria-label="A string fixed at both ends. Pull it and let go."
      />
      <canvas
        ref={traceCanvas}
        className={clsx(styles.canvas, "mt-tight")}
        style={{ height: 90 }}
        role="img"
        aria-label="The height of the marked point over the last three seconds"
      />

      <dl className="mt-label grid grid-cols-2 gap-label sm:grid-cols-4">
        <div className={styles.readout}>
          <dt>frequency</dt>
          <dd>{formatHz(hz)}</dd>
        </div>
        <div className={styles.readout}>
          <dt>nearest piano key</dt>
          <dd>{inPiano ? `${noteName(note.midi)} ${formatCents(note.cents)}` : "none"}</dd>
        </div>
        <div className={styles.readout}>
          <dt>shown slower by</dt>
          <dd>{slower >= 100 ? Math.round(slower).toLocaleString("en") : slower.toFixed(1)}×</dd>
        </div>
        <div className={styles.readout}>
          <dt>modes under 18 kHz</dt>
          <dd>{audible}</dd>
        </div>
      </dl>

      <div className="mt-para">
        <div className="flex items-center gap-label">
          <input
            className={styles.slider}
            type="range"
            min={0}
            max={1}
            step={0.0005}
            value={position}
            aria-label="Frequency"
            aria-valuetext={formatHz(hz)}
            onChange={(event) => {
              const next = scale.toValue(Number(event.target.value));
              setHz(Math.round(next * 100) / 100);
              voice.current?.stop();
              pluck.current = null;
            }}
          />
          <button
            type="button"
            className={clsx(styles.button, styles.primary)}
            onClick={() => release(0.2, 0.3)}
          >
            Pluck
          </button>
        </div>
        <HearingScale hz={hz} />
      </div>
    </section>
  );
}

/** The slider's scale: what we hear, and the part a piano covers. */
function HearingScale({ hz }: { hz: number }) {
  const at = (value: number) => `${scale.toPosition(value) * 100}%`;
  const [low, high] = PIANO_RANGE;
  return (
    <div className={clsx(styles.muted, "relative mt-tight h-10 text-xs")} aria-hidden="true">
      <div
        className="absolute top-0 h-2 rounded-full"
        style={{
          left: at(low),
          width: `calc(${at(high)} - ${at(low)})`,
          background: "var(--accent)",
          opacity: 0.35,
        }}
      />
      <div className="absolute top-0 h-2 w-0.5 bg-current" style={{ left: at(hz) }} />
      <span className="absolute top-3 left-0">20 Hz</span>
      <span
        className="absolute top-3 -translate-x-1/2"
        style={{ left: `calc((${at(low)} + ${at(high)}) / 2)` }}
      >
        piano A0–C8
      </span>
      <span className="absolute top-3 right-0">20 kHz</span>
    </div>
  );
}
