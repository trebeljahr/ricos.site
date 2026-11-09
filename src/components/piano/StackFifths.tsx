import clsx from "clsx";
import { useMemo, useState } from "react";
import {
  cents as centsOf,
  defaultLetter,
  formatCents,
  midiToHz,
  pitchClass,
  pitchColor,
  spell,
} from "src/lib/piano/notes";
import { playPianoHz } from "src/lib/piano/sampler";
import type { KeyMark } from "./Keyboard";
import { PlayablePiano } from "./PlayablePiano";
import styles from "./piano.module.css";

const STARTS = [
  { midi: 53, label: "Start on F" },
  { midi: 48, label: "Start on C" },
];
const MAX_STEPS = 12;
const SIZE = 300;
const C = SIZE / 2;
const R = 104;

type Step = {
  index: number;
  name: string;
  midi: number;
  /** Folded into the octave above the start. */
  pureRatio: number;
  numerator: bigint;
  denominator: bigint;
  pureCents: number;
  equalCents: number;
};

function stepsFrom(start: number): Step[] {
  const letter = defaultLetter(start, false);
  return Array.from({ length: MAX_STEPS + 1 }, (_, i) => {
    const numerator = BigInt(3) ** BigInt(i);
    let denominator = BigInt(2) ** BigInt(i);
    while (numerator >= BigInt(2) * denominator) denominator *= BigInt(2);
    const pureRatio = Number(numerator) / Number(denominator);
    const midi = start + ((7 * i) % 12);
    return {
      index: i,
      name: spell(midi, letter + 4 * i) ?? "?",
      midi,
      pureRatio,
      numerator,
      denominator,
      pureCents: centsOf(pureRatio),
      equalCents: (700 * i) % 1200,
    };
  });
}

const point = (cents: number, radius = R) => {
  const angle = (cents / 1200) * 2 * Math.PI;
  return { x: C + radius * Math.sin(angle), y: C - radius * Math.cos(angle) };
};

/**
 * Fifths stacked one on another, folded back into one octave: after twelve,
 * pure 3 : 2 fifths miss the start by a sliver; equal-tempered ones close.
 */
export function StackFifths() {
  const [start, setStart] = useState(53);
  const [count, setCount] = useState(0);
  const [pure, setPure] = useState(true);
  const steps = useMemo(() => stepsFrom(start), [start]);
  const shown = steps.slice(0, count + 1);
  const baseHz = midiToHz(start);
  const centsAt = (s: Step) => (pure ? s.pureCents : s.equalCents);
  const hzAt = (s: Step) => baseHz * 2 ** (centsAt(s) / 1200);
  const last = shown[shown.length - 1];

  const stack = () => {
    if (count >= MAX_STEPS) return;
    const previous = steps[count];
    // The fifth itself, unfolded: the last note and the note a fifth above it.
    const low = hzAt(previous);
    playPianoHz(low, { duration: 1.1, velocity: 0.6 });
    playPianoHz(low * (pure ? 1.5 : 2 ** (7 / 12)), { duration: 1.1, velocity: 0.6, delay: 0.25 });
    setCount((c) => c + 1);
  };

  const playScale = () => {
    const sorted = [...shown].sort((a, b) => centsAt(a) - centsAt(b));
    [...sorted.map(hzAt), baseHz * 2].forEach((hz, i) => {
      playPianoHz(hz, { delay: i * 0.28, duration: 0.5, velocity: 0.62 });
    });
  };

  const marks: Record<number, KeyMark> = {};
  for (const s of shown) {
    if (s.index < 12) marks[s.midi] = { label: s.index, ring: s === last && count > 0 };
  }
  if (count === 12) marks[start + 12] = { label: 12, ring: true };

  // Twelve pure fifths fold to just above the start: that sliver is the miss.
  const comma = count === 12 && pure ? steps[12].pureCents : null;

  return (
    <section className={clsx(styles.panel, "not-prose")} aria-label="Stacking fifths">
      <div className="grid gap-para md:grid-cols-[minmax(0,300px)_1fr] md:items-start">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className={clsx(styles.svg, "mx-auto max-w-[300px]")}
          role="img"
          aria-label={`${count} fifths stacked: ${shown.map((s) => s.name).join(", ")}`}
        >
          <circle cx={C} cy={C} r={R} fill="none" stroke="var(--line)" strokeWidth={2} />
          {Array.from({ length: 12 }, (_, k) => {
            const p = point(k * 100, R + 22);
            const t1 = point(k * 100, R - 6);
            const t2 = point(k * 100, R + 6);
            const reached = shown.find((s) => (s.midi - start) % 12 === k);
            return (
              <g key={k}>
                <line
                  x1={t1.x}
                  y1={t1.y}
                  x2={t2.x}
                  y2={t2.y}
                  stroke="var(--muted)"
                  strokeWidth={1.5}
                />
                <text
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    fill: reached ? pitchColor(pitchClass(start + k), 0.58, 0.16) : "var(--muted)",
                    opacity: reached ? 1 : 0.5,
                  }}
                >
                  {reached?.name ?? spell(start + k, defaultLetter(start + k)) ?? ""}
                </text>
              </g>
            );
          })}
          {shown.slice(1).map((s, i) => {
            const a = point(centsAt(shown[i]));
            const b = point(centsAt(s));
            return (
              <line
                key={s.index}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={pitchColor(pitchClass(s.midi), 0.62, 0.15)}
                strokeWidth={2}
                strokeOpacity={0.85}
              />
            );
          })}
          {comma !== null &&
            (() => {
              const a = point(0, R + 4);
              const b = point(comma, R + 4);
              return (
                <g>
                  <path
                    d={`M${C} ${C} L${a.x} ${a.y} A${R + 4} ${R + 4} 0 0 1 ${b.x} ${b.y} Z`}
                    fill="var(--accent)"
                    opacity={0.35}
                  />
                  <text
                    x={C}
                    y={C + 4}
                    textAnchor="middle"
                    style={{ fontSize: 15, fontWeight: 700, fill: "var(--accent)" }}
                  >
                    {comma.toFixed(1)}¢
                  </text>
                </g>
              );
            })()}
          {shown.map((s) => {
            const p = point(centsAt(s));
            return (
              <circle
                key={s.index}
                cx={p.x}
                cy={p.y}
                r={s === last ? 8 : 6}
                fill={pitchColor(pitchClass(s.midi), 0.62, 0.16)}
                stroke={s === last ? "var(--ink)" : "var(--paper)"}
                strokeWidth={2}
              />
            );
          })}
        </svg>

        <div className="min-w-0">
          <dl className="grid grid-cols-3 gap-label">
            <div className={styles.readout}>
              <dt>fifths stacked</dt>
              <dd>{count}</dd>
            </div>
            <div className={styles.readout}>
              <dt>notes</dt>
              <dd>{new Set(shown.map((s) => s.midi % 12)).size}</dd>
            </div>
            <div className={styles.readout}>
              <dt>{count === 12 ? "miss at the start" : "last note"}</dt>
              <dd>
                {count === 12 ? (pure ? formatCents(steps[12].pureCents) : "±0¢") : last.name}
              </dd>
            </div>
          </dl>
          <div className="mt-para flex flex-wrap gap-tight">
            <button
              type="button"
              className={clsx(styles.button, styles.primary)}
              onClick={stack}
              disabled={count >= MAX_STEPS}
            >
              Stack a fifth
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => setCount((c) => Math.max(0, c - 1))}
              disabled={count === 0}
            >
              Back
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => setCount(0)}
              disabled={count === 0}
            >
              Reset
            </button>
            <button type="button" className={styles.button} onClick={playScale}>
              Play in pitch order
            </button>
          </div>
          <div className="mt-tight flex flex-wrap gap-tight">
            <span className={styles.segmented} role="group" aria-label="Size of each fifth">
              <button
                type="button"
                className={clsx(styles.button, styles.small)}
                aria-pressed={pure}
                onClick={() => setPure(true)}
              >
                Pure 3 : 2
              </button>
              <button
                type="button"
                className={clsx(styles.button, styles.small)}
                aria-pressed={!pure}
                onClick={() => setPure(false)}
              >
                Equal tempered
              </button>
            </span>
            <span className={styles.segmented} role="group" aria-label="First note">
              {STARTS.map((s) => (
                <button
                  key={s.midi}
                  type="button"
                  className={clsx(styles.button, styles.small)}
                  aria-pressed={start === s.midi}
                  onClick={() => {
                    setStart(s.midi);
                    setCount(0);
                  }}
                >
                  {s.label}
                </button>
              ))}
            </span>
          </div>
          <div className="mt-para overflow-x-auto">
            <table className={clsx(styles.mono, "w-full text-left text-xs sm:text-sm")}>
              <thead className={styles.muted}>
                <tr>
                  <th className="py-hair pr-tight font-normal">#</th>
                  <th className="py-hair pr-tight font-normal">note</th>
                  <th className="py-hair pr-tight font-normal">ratio</th>
                  <th className="py-hair pr-tight text-right font-normal">pure</th>
                  <th className="py-hair text-right font-normal">equal</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((s) => (
                  <tr key={s.index} className="border-t" style={{ borderColor: "var(--line)" }}>
                    <td className="py-hair pr-tight">{s.index}</td>
                    <td
                      className="py-hair pr-tight font-semibold"
                      style={{ color: pitchColor(pitchClass(s.midi), 0.55, 0.16) }}
                    >
                      {s.name}
                    </td>
                    <td className="py-hair pr-tight">
                      {s.numerator.toString()}/{s.denominator.toString()}
                    </td>
                    <td className="py-hair pr-tight text-right">{s.pureCents.toFixed(1)}¢</td>
                    <td className="py-hair text-right">{s.equalCents}¢</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <PlayablePiano
        className="mt-para"
        range={[start, start + 16]}
        marks={marks}
        short
        bar={false}
      />
    </section>
  );
}
