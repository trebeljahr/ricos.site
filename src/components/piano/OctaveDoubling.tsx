import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import type { Voice } from "src/lib/piano/audio";
import { beatRate, beatText, COUNTABLE_BEATS, scopeDrift } from "src/lib/piano/beats";
import { formatHz, frequencyColor } from "src/lib/piano/notes";
import { type HeldTone, holdTone, pluckTone } from "src/lib/piano/synth";
import { fitCanvas, panelColors, useAnimation } from "./canvas";
import { PitchSpiral, type SpiralDot } from "./PitchSpiral";
import styles from "./piano.module.css";

const LOW_HZ = 220;
/** A fundamental with a little second harmonic: one peak per period, and the octave beats you can hear. */
const HARMONICS = [1, 0.25];
const MIN_RATIO = 1;
const MAX_RATIO = 2.2;
const NUDGE = 0.005;
const PERIODS = 2; // periods of the lower tone across the scope
const PEAK = 1.25;

const wave = (phase: number) =>
  HARMONICS.reduce((sum, a, i) => sum + a * Math.sin((i + 1) * phase), 0);

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

/**
 * Two tones, the upper one slid from unison to past an octave. On 2 : 1 the
 * sum of the waves stands still; just off it, it crawls and swells with the
 * beats. A spiral with one turn per octave puts both tones on the same spoke.
 */
export function OctaveDoubling() {
  const panel = useRef<HTMLElement>(null);
  const scope = useRef<HTMLCanvasElement>(null);
  const [ratio, setRatio] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const tones = useRef<[HeldTone, HeldTone] | null>(null);
  const pluck = useRef<Voice | null>(null);
  const offset = useRef(0);
  const lastTime = useRef<number | null>(null);
  const highHz = LOW_HZ * ratio;
  const beats = beatRate(LOW_HZ, highHz);

  useEffect(() => {
    tones.current?.[1].setFrequency(highHz);
  }, [highHz]);

  const stopPair = () => {
    tones.current?.forEach((tone) => {
      tone.stop();
    });
    tones.current = null;
    setPlaying(false);
  };

  useEffect(
    () => () => {
      tones.current?.forEach((tone) => {
        tone.stop();
      });
      tones.current = null;
      pluck.current?.stop();
    },
    [],
  );

  const toggle = () => {
    pluck.current?.stop();
    pluck.current = null;
    if (tones.current) stopPair();
    else {
      tones.current = [holdTone(LOW_HZ, HARMONICS, 0.22), holdTone(highHz, HARMONICS, 0.22)];
      setPlaying(true);
    }
  };

  const playPoint = (hz: number) => {
    stopPair();
    pluck.current?.stop();
    pluck.current = pluckTone(hz, [1, 0.4, 0.2, 0.1], { level: 0.45, sustain: 1.6 });
    setPicked(hz);
  };

  const setClamped = (r: number) =>
    setRatio(Math.round(Math.min(MAX_RATIO, Math.max(MIN_RATIO, r)) * 1000) / 1000);

  useAnimation(panel, (time) => {
    const c = scope.current && fitCanvas(scope.current);
    if (!c) return;
    const { ctx, width, height } = c;
    const colors = panelColors(panel.current);
    // The scope starts every frame on the lower wave, so the upper one drifts
    // past it at its real stroboscopic rate, capped: zero on 1:1 and 2:1.
    const dt = lastTime.current === null ? 0 : Math.min(0.1, time - lastTime.current);
    lastTime.current = time;
    if (!reducedMotion()) {
      offset.current =
        (offset.current + 2 * Math.PI * scopeDrift(LOW_HZ, highHz) * dt) % (2 * Math.PI);
    }
    const phase = (x: number) => (x / width) * PERIODS * 2 * Math.PI;
    const upper = (p: number) => wave(p * ratio + offset.current);
    const rows = [
      { y: height * 0.16, amp: height * 0.1, color: frequencyColor(highHz, 0.6), f: upper },
      { y: height * 0.42, amp: height * 0.1, color: frequencyColor(LOW_HZ, 0.6), f: wave },
      {
        y: height * 0.76,
        amp: height * 0.1,
        color: colors.ink,
        f: (p: number) => (wave(p) + upper(p)) / 2,
      },
    ];
    const sum = rows[2];
    // The outline of the sum: how far it reaches right now. It swells and
    // shrinks with the beats, and stands still on the octave.
    let reach = 0;
    for (let x = 0; x <= width; x += 2) reach = Math.max(reach, Math.abs(sum.f(phase(x))));
    const band = (reach / PEAK) * sum.amp * 1.15;
    ctx.fillStyle = colors.track;
    ctx.fillRect(0, sum.y - band, width, 2 * band);
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (const y of [sum.y - band, sum.y + band]) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    for (const row of rows) {
      ctx.strokeStyle = colors.line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, row.y);
      ctx.lineTo(width, row.y);
      ctx.stroke();
      ctx.strokeStyle = row.color;
      ctx.lineWidth = 2.25;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 2) {
        const y = row.y - (row.f(phase(x)) / PEAK) * row.amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = colors.muted;
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.fillText(`upper tone · ${formatHz(highHz)}`, 6, 13);
    ctx.fillText(`lower tone · ${formatHz(LOW_HZ)}`, 6, height * 0.29);
    ctx.fillText("both together", 6, height * 0.56);
  });

  const dots: SpiralDot[] = [
    { hz: LOW_HZ, color: frequencyColor(LOW_HZ, 0.6), label: "lower tone", ring: true },
    { hz: highHz, color: frequencyColor(highHz, 0.6), label: "upper tone", ring: true },
    ...(picked ? [{ hz: picked, color: frequencyColor(picked, 0.6), label: "tapped" }] : []),
  ];

  return (
    <section
      ref={panel}
      className={clsx(styles.panel, "not-prose")}
      aria-label="A tone and the tone twice as high"
    >
      <div className="grid gap-para md:grid-cols-[1fr_minmax(0,300px)] md:items-start">
        <div className="min-w-0">
          <canvas
            ref={scope}
            className={styles.canvas}
            style={{ height: 230 }}
            role="img"
            aria-label={`The upper wave, the lower wave and both together. Beats: ${beatText(beats)}.`}
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
              step={0.001}
              value={ratio}
              aria-label="Upper tone, as a multiple of the lower one"
              aria-valuetext={`${ratio.toFixed(3)} times the lower tone`}
              onChange={(event) => setClamped(Number(event.target.value))}
            />
          </div>
          <div className="mt-tight flex flex-wrap gap-tight">
            {[1, 2].map((r) => (
              <button
                key={r}
                type="button"
                className={clsx(styles.button, styles.small)}
                aria-pressed={ratio === r}
                onClick={() => setClamped(r)}
              >
                {r} : 1
              </button>
            ))}
            <button
              type="button"
              className={clsx(styles.button, styles.small)}
              onClick={() => setClamped(ratio - NUDGE)}
            >
              − nudge
            </button>
            <button
              type="button"
              className={clsx(styles.button, styles.small)}
              onClick={() => setClamped(ratio + NUDGE)}
            >
              + nudge
            </button>
          </div>
          <dl className="mt-para grid grid-cols-2 gap-label">
            <div className={styles.readout}>
              <dt>upper ÷ lower</dt>
              <dd>{ratio.toFixed(3)}</dd>
            </div>
            <div className={clsx(styles.readout, styles.wordy)}>
              <dt>beats</dt>
              <dd className={clsx(beats > COUNTABLE_BEATS && styles.muted)}>{beatText(beats)}</dd>
            </div>
          </dl>
        </div>
        <div className="mx-auto w-full max-w-[300px]">
          <PitchSpiral dots={dots} lines={[[LOW_HZ, highHz]]} onPick={playPoint} />
        </div>
      </div>
    </section>
  );
}
