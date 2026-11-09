import clsx from "clsx";
import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  formatCents,
  formatHz,
  frequencyColor,
  midiToHz,
  nearestNote,
  noteName,
} from "src/lib/piano/notes";
import { SPECTRA } from "src/lib/piano/physics";
import { type HeldTone, holdTone } from "src/lib/piano/synth";
import { fitCanvas, panelColors, useAnimation } from "./canvas";
import { Keyboard, type KeyMark } from "./Keyboard";
import styles from "./piano.module.css";

const COUNT = 16;
const ROOTS = [36, 45, 48]; // C2, A2, C3
const fill = (amplitudes: number[]) => Array.from({ length: COUNT }, (_, i) => amplitudes[i] ?? 0);

/**
 * One note taken apart into its harmonics: drag the bars to set how loud each
 * one is, and hear and see the note change.
 */
export function Overtones() {
  const panel = useRef<HTMLElement>(null);
  const scope = useRef<HTMLCanvasElement>(null);
  const [root, setRoot] = useState(36);
  const [amps, setAmps] = useState(() => fill(SPECTRA[1].amplitudes));
  const [focus, setFocus] = useState(7);
  const [playing, setPlaying] = useState(false);
  const [solo, setSolo] = useState<number | null>(null);
  const tone = useRef<HeldTone | null>(null);
  const sequence = useRef<{ timer: number; tone: HeldTone | null }>({ timer: 0, tone: null });
  const painting = useRef(false);
  const f0 = midiToHz(root);

  useEffect(() => {
    tone.current?.setHarmonics(amps);
  }, [amps]);
  useEffect(() => {
    tone.current?.setFrequency(f0, 0.01);
  }, [f0]);

  const stopSequence = () => {
    window.clearTimeout(sequence.current.timer);
    sequence.current.tone?.stop();
    sequence.current.tone = null;
    setSolo(null);
  };

  useEffect(
    () => () => {
      tone.current?.stop();
      window.clearTimeout(sequence.current.timer);
      sequence.current.tone?.stop();
    },
    [],
  );

  const toggle = () => {
    stopSequence();
    if (tone.current) {
      tone.current.stop();
      tone.current = null;
      setPlaying(false);
    } else {
      tone.current = holdTone(f0, amps, 0.3);
      setPlaying(true);
    }
  };

  const oneByOne = () => {
    tone.current?.stop();
    tone.current = null;
    setPlaying(false);
    stopSequence();
    const audible = amps.map((a, i) => (a > 0.01 ? i : -1)).filter((i) => i >= 0);
    let step = 0;
    const next = () => {
      sequence.current.tone?.stop();
      if (step >= audible.length) {
        sequence.current.tone = null;
        setSolo(null);
        return;
      }
      const i = audible[step++];
      setSolo(i);
      setFocus(i + 1);
      sequence.current.tone = holdTone(f0 * (i + 1), [1], 0.18 + 0.2 * amps[i]);
      sequence.current.timer = window.setTimeout(next, 420);
    };
    next();
  };

  const paint = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const i = Math.min(
      COUNT - 1,
      Math.max(0, Math.floor(((event.clientX - box.left) / box.width) * COUNT)),
    );
    const value = Math.min(1, Math.max(0, 1 - (event.clientY - box.top) / box.height));
    const snapped = value < 0.04 ? 0 : value;
    setFocus(i + 1);
    setAmps((a) => (a[i] === snapped ? a : a.map((x, j) => (j === i ? snapped : x))));
  };

  useAnimation(panel, () => {
    const c = scope.current && fitCanvas(scope.current);
    if (!c) return;
    const { ctx, width, height } = c;
    const colors = panelColors(panel.current);
    const mid = height / 2;
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(width, mid);
    ctx.stroke();
    const samples: number[] = [];
    let peak = 0.0001;
    for (let x = 0; x <= width; x += 2) {
      const phase = (x / width) * 2 * 2 * Math.PI;
      const y = amps.reduce((sum, a, i) => sum + a * Math.sin((i + 1) * phase), 0);
      samples.push(y);
      peak = Math.max(peak, Math.abs(y));
    }
    if (solo !== null) {
      ctx.strokeStyle = frequencyColor(f0 * (solo + 1), 0.62);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 2) {
        const phase = (x / width) * 2 * 2 * Math.PI;
        const y = mid - ((amps[solo] * Math.sin((solo + 1) * phase)) / peak) * (mid - 8);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = colors.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    samples.forEach((s, k) => {
      const y = mid - (s / peak) * (mid - 8);
      if (k === 0) ctx.moveTo(k * 2, y);
      else ctx.lineTo(k * 2, y);
    });
    ctx.stroke();
  });

  const marks = useMemo(() => {
    const out: Record<number, KeyMark> = {};
    amps.forEach((a, i) => {
      if (a <= 0.01) return;
      const { midi } = nearestNote(f0 * (i + 1));
      out[midi] = { label: i + 1, ring: solo === i };
    });
    return out;
  }, [amps, f0, solo]);

  const focusHz = f0 * focus;
  const focusNote = nearestNote(focusHz);
  const preset = SPECTRA.find((s) =>
    fill(s.amplitudes).every((a, i) => Math.abs(a - amps[i]) < 1e-6),
  );

  return (
    <section
      ref={panel}
      className={clsx(styles.panel, "not-prose")}
      aria-label="Harmonics of one note"
    >
      <canvas
        ref={scope}
        className={styles.canvas}
        style={{ height: 120 }}
        role="img"
        aria-label="Two periods of the note's wave"
      />

      <div
        className="relative mt-label flex h-40 cursor-crosshair items-end gap-[2px] sm:gap-1"
        style={{ touchAction: "none" }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          painting.current = true;
          paint(event);
        }}
        onPointerMove={(event) => painting.current && paint(event)}
        onPointerUp={() => {
          painting.current = false;
        }}
        onPointerCancel={() => {
          painting.current = false;
        }}
        role="group"
        aria-label="Loudness of each harmonic"
      >
        {amps.map((a, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: one bar per harmonic number
            key={i}
            className="relative h-full flex-1 rounded-t"
            style={{
              background: "var(--track)",
              outline: focus === i + 1 ? "2px solid var(--accent)" : undefined,
            }}
          >
            <div
              className="absolute inset-x-0 bottom-0 rounded-t"
              style={{
                height: `${a * 100}%`,
                background: frequencyColor(f0 * (i + 1), 0.66, 0.15),
                opacity: solo === null || solo === i ? 1 : 0.35,
              }}
            />
          </div>
        ))}
      </div>
      <div
        className={clsx(
          styles.mono,
          styles.muted,
          "mt-hair flex gap-[2px] text-center text-[10px] sm:gap-1 sm:text-xs",
        )}
        aria-hidden="true"
      >
        {amps.map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: one label per harmonic number
          <span key={i} className="flex-1">
            {i + 1}
          </span>
        ))}
      </div>

      <dl className="mt-label grid grid-cols-2 gap-label sm:grid-cols-4">
        <div className={styles.readout}>
          <dt>harmonic</dt>
          <dd>
            {focus} × {formatHz(f0)}
          </dd>
        </div>
        <div className={styles.readout}>
          <dt>frequency</dt>
          <dd>{formatHz(focusHz)}</dd>
        </div>
        <div className={styles.readout}>
          <dt>nearest key</dt>
          <dd>
            {noteName(focusNote.midi, { flats: true })} {formatCents(focusNote.cents)}
          </dd>
        </div>
        <div className={styles.readout}>
          <dt>loudness</dt>
          <dd>{Math.round(amps[focus - 1] * 100)}%</dd>
        </div>
      </dl>

      <div className="mt-para flex flex-wrap items-center gap-tight">
        <button
          type="button"
          className={clsx(styles.button, styles.primary)}
          onClick={toggle}
          aria-pressed={playing}
        >
          {playing ? "Stop" : "Play note"}
        </button>
        <button type="button" className={styles.button} onClick={oneByOne}>
          One harmonic at a time
        </button>
      </div>
      <div className="mt-tight flex flex-wrap items-center gap-tight">
        <span className={styles.segmented} role="group" aria-label="Harmonic recipes">
          {SPECTRA.map((s) => (
            <button
              key={s.id}
              type="button"
              className={clsx(styles.button, styles.small)}
              aria-pressed={preset?.id === s.id}
              onClick={() => setAmps(fill(s.amplitudes))}
            >
              {s.label}
            </button>
          ))}
        </span>
        <span className={styles.segmented} role="group" aria-label="Fundamental">
          {ROOTS.map((m) => (
            <button
              key={m}
              type="button"
              className={clsx(styles.button, styles.small)}
              aria-pressed={root === m}
              onClick={() => setRoot(m)}
            >
              {noteName(m)}
            </button>
          ))}
        </span>
      </div>

      <Keyboard
        className="mt-para"
        from={root}
        to={root + 48}
        marks={marks}
        short
        label="Keys nearest to each harmonic"
      />
    </section>
  );
}
