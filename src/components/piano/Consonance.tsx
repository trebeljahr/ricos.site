import clsx from "clsx";
import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useWidth } from "src/hooks/usePianoInput";
import { formatCents, INTERVALS, midiToHz } from "src/lib/piano/notes";
import {
  curveDips,
  intervalRoughness,
  roughnessCurve,
  SPECTRA,
  simpleRatio,
} from "src/lib/piano/physics";
import { type HeldTone, holdTone } from "src/lib/piano/synth";
import styles from "./piano.module.css";

const BASE_HZ = midiToHz(60);
const MAX_CENTS = 1250;
const H = 240;

/**
 * How rough two tones sound together, for every interval up to an octave:
 * drag along the curve to hear it. The dips depend on the tones' harmonics.
 */
export function Consonance() {
  // Drawn at the real width, so labels keep their size on a phone.
  const box = useRef<HTMLDivElement>(null);
  const W = Math.max(300, Math.round(useWidth(box, 640)));
  const PLOT = { left: 8, right: W - 8, top: 28, bottom: H - 46 };
  const xOf = (c: number) => PLOT.left + (c / MAX_CENTS) * (PLOT.right - PLOT.left);
  const centsOf = (x: number) => ((x - PLOT.left) / (PLOT.right - PLOT.left)) * MAX_CENTS;
  const minLabelCents = (30 / (PLOT.right - PLOT.left)) * MAX_CENTS;
  const [spectrumId, setSpectrumId] = useState("saw");
  const [cents, setCents] = useState(702);
  const [snap, setSnap] = useState(false);
  const [playing, setPlaying] = useState(false);
  const tones = useRef<[HeldTone, HeldTone] | null>(null);
  const dragging = useRef(false);
  const spectrum = SPECTRA.find((s) => s.id === spectrumId)?.amplitudes ?? [1];
  const ratio = 2 ** (cents / 1200);

  const curve = useMemo(() => roughnessCurve(BASE_HZ, spectrum, MAX_CENTS, 2), [spectrum]);
  const peak = useMemo(() => Math.max(...curve.map((p) => p.roughness)), [curve]);
  const dips = useMemo(
    () =>
      curveDips(curve)
        .filter((d) => d.depth > peak * 0.015)
        .map((d) => ({ ...d, ratio: simpleRatio(2 ** (d.cents / 1200), 15, 9) }))
        .filter((d) => d.ratio)
        // Deepest first: a shallower dip right next to a labelled one stays unlabelled.
        .filter((d, i, all) =>
          all.slice(0, i).every((e) => Math.abs(e.cents - d.cents) > Math.max(45, minLabelCents)),
        ),
    [curve, peak, minLabelCents],
  );
  const yOf = (r: number) => PLOT.bottom - (r / peak) * (PLOT.bottom - PLOT.top);

  useEffect(() => {
    tones.current?.[1].setFrequency(BASE_HZ * ratio, 0.01);
  }, [ratio]);
  useEffect(() => {
    tones.current?.forEach((tone) => {
      tone.setHarmonics(spectrum);
    });
  }, [spectrum]);
  useEffect(
    () => () => {
      tones.current?.forEach((tone) => {
        tone.stop();
      });
    },
    [],
  );

  const start = () => {
    if (tones.current) return;
    tones.current = [holdTone(BASE_HZ, spectrum, 0.2), holdTone(BASE_HZ * ratio, spectrum, 0.2)];
    setPlaying(true);
  };
  const stop = () => {
    tones.current?.forEach((tone) => {
      tone.stop();
    });
    tones.current = null;
    setPlaying(false);
  };

  const pick = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * W;
    let c = Math.min(MAX_CENTS, Math.max(0, centsOf(x)));
    if (snap) c = Math.round(c / 100) * 100;
    setCents(Math.round(c * 2) / 2);
  };

  const roughness = intervalRoughness(BASE_HZ, ratio, spectrum) / peak;
  const nearest = INTERVALS[Math.min(12, Math.round(cents / 100))];
  const fraction = simpleRatio(ratio, 10, 16);
  const path = curve
    .map(
      (p, i) => `${i === 0 ? "M" : "L"}${xOf(p.cents).toFixed(1)} ${yOf(p.roughness).toFixed(1)}`,
    )
    .join(" ");

  return (
    <section className={clsx(styles.panel, "not-prose")} aria-label="Roughness of two tones">
      <div
        ref={box}
        className="min-w-0 cursor-ew-resize"
        style={{ touchAction: "none" }}
        role="slider"
        tabIndex={0}
        aria-label="Interval between the two tones"
        aria-valuemin={0}
        aria-valuemax={MAX_CENTS}
        aria-valuenow={cents}
        aria-valuetext={`${Math.round(cents)} cents, near ${nearest.name}`}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          dragging.current = true;
          pick(event);
          start();
        }}
        onPointerMove={(event) => dragging.current && pick(event)}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        onKeyDown={(event) => {
          const step = snap || event.shiftKey ? 100 : 5;
          if (event.key === "ArrowRight" || event.key === "ArrowUp")
            setCents((c) => Math.min(MAX_CENTS, c + step));
          else if (event.key === "ArrowLeft" || event.key === "ArrowDown")
            setCents((c) => Math.max(0, c - step));
          else return;
          event.preventDefault();
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} aria-hidden="true">
          <rect
            x={PLOT.left}
            y={PLOT.top}
            width={PLOT.right - PLOT.left}
            height={PLOT.bottom - PLOT.top}
            rx={8}
            fill="var(--track)"
          />
          {INTERVALS.map((interval) => (
            <g key={interval.short}>
              <line
                x1={xOf(interval.semitones * 100)}
                x2={xOf(interval.semitones * 100)}
                y1={PLOT.top}
                y2={PLOT.bottom + 6}
                stroke="var(--line)"
                strokeWidth={1.5}
              />
              <text
                x={xOf(interval.semitones * 100)}
                y={PLOT.bottom + 20}
                textAnchor="middle"
                style={{ fontSize: 11, fill: "var(--muted)" }}
              >
                {interval.short}
              </text>
            </g>
          ))}
          <path d={path} fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" />
          {dips.map((dip) => (
            <g key={dip.cents}>
              <circle cx={xOf(dip.cents)} cy={yOf(dip.roughness)} r={3.5} fill="var(--accent)" />
              <text
                x={xOf(dip.cents)}
                y={yOf(dip.roughness) - 9}
                textAnchor="middle"
                style={{ fontSize: 11, fontWeight: 700, fill: "var(--accent)" }}
              >
                {dip.ratio?.[0]}:{dip.ratio?.[1]}
              </text>
            </g>
          ))}
          <line
            x1={xOf(cents)}
            x2={xOf(cents)}
            y1={PLOT.top - 10}
            y2={PLOT.bottom}
            stroke="var(--accent)"
            strokeWidth={2}
          />
          <circle
            cx={xOf(cents)}
            cy={yOf(roughness * peak)}
            r={7}
            fill="var(--accent)"
            stroke="var(--paper)"
            strokeWidth={2}
          />
          <text x={PLOT.left + 6} y={PLOT.top - 10} style={{ fontSize: 11, fill: "var(--muted)" }}>
            rough
          </text>
          <text x={PLOT.left + 6} y={H - 6} style={{ fontSize: 11, fill: "var(--muted)" }}>
            unison
          </text>
          <text
            x={PLOT.right - 6}
            y={H - 6}
            textAnchor="end"
            style={{ fontSize: 11, fill: "var(--muted)" }}
          >
            octave
          </text>
        </svg>
      </div>

      <dl className="mt-label grid grid-cols-2 gap-label sm:grid-cols-4">
        <div className={styles.readout}>
          <dt>interval</dt>
          <dd>{Math.round(cents)}¢</dd>
        </div>
        <div className={styles.readout}>
          <dt>nearest piano interval</dt>
          <dd>
            {nearest.short} {formatCents(cents - nearest.semitones * 100)}
          </dd>
        </div>
        <div className={styles.readout}>
          <dt>ratio</dt>
          <dd>{fraction ? `${fraction[0]} : ${fraction[1]}` : ratio.toFixed(3)}</dd>
        </div>
        <div className={styles.readout}>
          <dt>roughness</dt>
          <dd>{Math.round(roughness * 100)}</dd>
        </div>
      </dl>

      <div className="mt-para flex flex-wrap items-center gap-tight">
        <button
          type="button"
          className={clsx(styles.button, styles.primary)}
          aria-pressed={playing}
          onClick={playing ? stop : start}
        >
          {playing ? "Stop" : "Play both"}
        </button>
        <button
          type="button"
          className={styles.button}
          aria-pressed={snap}
          onClick={() => setSnap((s) => !s)}
        >
          Snap to piano keys
        </button>
      </div>
      <div className="mt-tight">
        <span className={styles.segmented} role="group" aria-label="Harmonics of both tones">
          {SPECTRA.map((s) => (
            <button
              key={s.id}
              type="button"
              className={clsx(styles.button, styles.small)}
              aria-pressed={spectrumId === s.id}
              onClick={() => setSpectrumId(s.id)}
            >
              {s.label}
            </button>
          ))}
        </span>
      </div>
    </section>
  );
}
