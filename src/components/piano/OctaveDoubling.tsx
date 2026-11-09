import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  formatCents,
  formatHz,
  frequencyColor,
  midiToHz,
  nearestNote,
  noteName,
} from "src/lib/piano/notes";
import { type HeldTone, holdTone } from "src/lib/piano/synth";
import { fitCanvas, panelColors, useAnimation } from "./canvas";
import { PitchSpiral, type SpiralDot } from "./PitchSpiral";
import { PlayablePiano } from "./PlayablePiano";
import styles from "./piano.module.css";

const LOW_HZ = 220;
const HARMONICS = [1, 0.5, 0.33, 0.25, 0.2, 0.16];
const MIN_RATIO = 1;
const MAX_RATIO = 2.25;
const PERIODS = 3; // periods of the lower tone across the scope

const wave = (phase: number) =>
  HARMONICS.reduce((sum, a, i) => sum + a * Math.sin((i + 1) * phase), 0);
const PEAK = 1.6;

/**
 * Two tones: one fixed, one you slide up to twice its frequency. A scope
 * shows both waves and their sum; a spiral shows where each sits in pitch.
 */
export function OctaveDoubling() {
  const panel = useRef<HTMLElement>(null);
  const scope = useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = useState(1.5);
  const [playing, setPlaying] = useState(false);
  const [keys, setKeys] = useState<number[]>([]);
  const tones = useRef<[HeldTone, HeldTone] | null>(null);
  const highHz = LOW_HZ * ratio;

  useEffect(() => {
    tones.current?.[1].setFrequency(highHz);
  }, [highHz]);

  useEffect(
    () => () => {
      tones.current?.forEach((tone) => {
        tone.stop();
      });
      tones.current = null;
    },
    [],
  );

  const toggle = () => {
    if (tones.current) {
      tones.current.forEach((tone) => {
        tone.stop();
      });
      tones.current = null;
      setPlaying(false);
    } else {
      tones.current = [holdTone(LOW_HZ, HARMONICS, 0.22), holdTone(highHz, HARMONICS, 0.22)];
      setPlaying(true);
    }
  };

  const nearest = Math.round(ratio);
  const beat = Math.abs(highHz - nearest * LOW_HZ);
  const nearWhole = Math.abs(ratio - nearest) < 0.08;

  useAnimation(panel, (time) => {
    const c = scope.current && fitCanvas(scope.current);
    if (!c) return;
    const { ctx, width, height } = c;
    const colors = panelColors(panel.current);
    // Sampled once per period of the lower tone, so the lower wave stands
    // still and the upper one drifts at exactly the beat rate.
    const periods = Math.floor(time * LOW_HZ);
    const offset = ((periods * ratio) % 1) * 2 * Math.PI;
    const rows = [
      {
        y: height * 0.17,
        amp: height * 0.11,
        color: frequencyColor(LOW_HZ, 0.6),
        f: (p: number) => wave(p),
      },
      {
        y: height * 0.45,
        amp: height * 0.11,
        color: frequencyColor(highHz, 0.6),
        f: (p: number) => wave(p * ratio + offset),
      },
      {
        y: height * 0.78,
        amp: height * 0.09,
        color: colors.ink,
        f: (p: number) => (wave(p) + wave(p * ratio + offset)) / 2,
      },
    ];
    for (const row of rows) {
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, row.y);
      ctx.lineTo(width, row.y);
      ctx.stroke();
      ctx.strokeStyle = row.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 2) {
        const phase = (x / width) * PERIODS * 2 * Math.PI;
        const y = row.y - (row.f(phase) / PEAK) * row.amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = colors.muted;
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.fillText(formatHz(LOW_HZ), 6, 14);
    ctx.fillText(formatHz(highHz), 6, height * 0.29);
    ctx.fillText("sum", 6, height * 0.61);
    // The beat light: brightest when the waves line up.
    if (playing && nearWhole && beat > 0.05 && beat < 20) {
      const glow = 0.5 + 0.5 * Math.cos(2 * Math.PI * beat * time);
      ctx.fillStyle = colors.accent;
      ctx.globalAlpha = 0.25 + 0.75 * glow;
      ctx.beginPath();
      ctx.arc(width - 14, 14, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  });

  const onNoteOn = useCallback((m: number) => setKeys((k) => [...k.filter((x) => x !== m), m]), []);
  const onNoteOff = useCallback((m: number) => setKeys((k) => k.filter((x) => x !== m)), []);

  const dots: SpiralDot[] = [
    ...keys.map((m) => ({
      hz: midiToHz(m),
      color: frequencyColor(midiToHz(m), 0.6),
      label: noteName(m),
    })),
    { hz: LOW_HZ, color: frequencyColor(LOW_HZ, 0.6), label: "lower tone", ring: true },
    { hz: highHz, color: frequencyColor(highHz, 0.6), label: "upper tone", ring: true },
  ];
  const high = nearestNote(highHz);

  return (
    <section
      ref={panel}
      className={clsx(styles.panel, "not-prose")}
      aria-label="Two tones and their ratio"
    >
      <div className="grid gap-para md:grid-cols-[1fr_minmax(0,300px)] md:items-start">
        <div className="min-w-0">
          <canvas
            ref={scope}
            className={styles.canvas}
            style={{ height: 220 }}
            role="img"
            aria-label="The two waves and their sum"
          />
          <div className="mt-label flex items-center gap-label">
            <button
              type="button"
              className={clsx(styles.button, styles.primary)}
              onClick={toggle}
              aria-pressed={playing}
            >
              {playing ? "Stop" : "Play both"}
            </button>
            <input
              className={styles.slider}
              type="range"
              min={MIN_RATIO}
              max={MAX_RATIO}
              step={0.0005}
              value={ratio}
              aria-label="Frequency ratio of the upper tone to the lower one"
              aria-valuetext={`${ratio.toFixed(3)} to 1`}
              onChange={(event) => setRatio(Number(event.target.value))}
            />
          </div>
          <div className="mt-tight flex flex-wrap gap-tight">
            {[1, 1.5, 2].map((r) => (
              <button
                key={r}
                type="button"
                className={clsx(styles.button, styles.small)}
                aria-pressed={Math.abs(ratio - r) < 0.0003}
                onClick={() => setRatio(r)}
              >
                {r === 1.5 ? "3 : 2" : `${r} : 1`}
              </button>
            ))}
            <button
              type="button"
              className={clsx(styles.button, styles.small)}
              onClick={() => setRatio((r) => Math.max(MIN_RATIO, r - 0.004))}
            >
              − nudge
            </button>
            <button
              type="button"
              className={clsx(styles.button, styles.small)}
              onClick={() => setRatio((r) => Math.min(MAX_RATIO, r + 0.004))}
            >
              + nudge
            </button>
          </div>
          <dl className="mt-para grid grid-cols-3 gap-label">
            <div className={styles.readout}>
              <dt>ratio</dt>
              <dd>{ratio.toFixed(3)} : 1</dd>
            </div>
            <div className={styles.readout}>
              <dt>upper tone</dt>
              <dd>
                {formatHz(highHz)}
                <span className={clsx(styles.muted, "block text-sm font-normal")}>
                  {noteName(high.midi)} {formatCents(high.cents)}
                </span>
              </dd>
            </div>
            <div className={styles.readout}>
              <dt>beats per second</dt>
              <dd>{nearWhole ? beat.toFixed(1) : "—"}</dd>
            </div>
          </dl>
        </div>
        <div className="mx-auto w-full max-w-[300px]">
          <PitchSpiral dots={dots} lines={[[LOW_HZ, highHz]]} />
        </div>
      </div>
      <PlayablePiano
        className="mt-para"
        short
        octave={3}
        onNoteOn={onNoteOn}
        onNoteOff={onNoteOff}
      />
    </section>
  );
}
