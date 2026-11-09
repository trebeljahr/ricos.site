import clsx from "clsx";
import { useCallback, useState } from "react";
import {
  chordSymbol,
  landsOnRoot,
  MAJOR_THIRD,
  MINOR_THIRD,
  pitchClass,
  pitchColor,
  stackThirds,
} from "src/lib/piano/notes";
import { playPianoChord } from "src/lib/piano/sampler";
import type { KeyMark } from "./Keyboard";
import { PlayablePiano } from "./PlayablePiano";
import styles from "./piano.module.css";

const LOW = 48; // C3: roots live in this octave, so a 13th chord still fits
const HIGH = LOW + 33;
const MAX_THIRDS = 6;

/** Build a chord one third at a time on any root, and hear each new stack. */
export function ChordBuilder() {
  const [root, setRoot] = useState(LOW);
  const [thirds, setThirds] = useState<number[]>([MAJOR_THIRD, MINOR_THIRD]);
  const notes = stackThirds(root, thirds);
  const symbol = chordSymbol(notes[0].spelled, thirds);
  const doubled = landsOnRoot(notes);

  const strum = useCallback((r: number, t: number[], spread = 0.03) => {
    playPianoChord(
      stackThirds(r, t).map((n) => n.midi),
      { spread, duration: 1.8, velocity: 0.62 },
    );
  }, []);

  const add = (size: number) => {
    if (thirds.length >= MAX_THIRDS) return;
    const next = [...thirds, size];
    setThirds(next);
    strum(root, next);
  };

  const onNoteOn = useCallback(
    (m: number) => {
      const r = LOW + pitchClass(m);
      setRoot(r);
      strum(r, thirds);
    },
    [thirds, strum],
  );

  const marks: Record<number, KeyMark> = {};
  for (const n of notes) marks[n.midi] = { label: n.label, ring: n.degree === 1 };

  return (
    <section className={clsx(styles.panel, "not-prose")} aria-label="Chord builder">
      <div className="grid gap-para sm:grid-cols-[minmax(0,220px)_1fr] sm:items-end">
        <ThirdsTower notes={notes} thirds={thirds} />
        <div className="min-w-0">
          <p className={clsx(styles.muted, "text-xs")}>chord symbol</p>
          <p className="text-4xl font-semibold tracking-tight sm:text-5xl" aria-live="polite">
            {symbol}
          </p>
          <p className={clsx(styles.mono, "mt-tight text-sm")}>
            {notes.map((n) => n.spelled).join(" · ")}
          </p>
          {doubled && <p className={clsx(styles.muted, "mt-hair text-sm")}>back on the root</p>}
          <div className="mt-para flex flex-wrap gap-tight">
            <button
              type="button"
              className={clsx(styles.button, styles.primary)}
              onClick={() => add(MINOR_THIRD)}
              disabled={thirds.length >= MAX_THIRDS}
            >
              + minor third
            </button>
            <button
              type="button"
              className={clsx(styles.button, styles.primary)}
              onClick={() => add(MAJOR_THIRD)}
              disabled={thirds.length >= MAX_THIRDS}
            >
              + major third
            </button>
          </div>
          <div className="mt-tight flex flex-wrap gap-tight">
            <button
              type="button"
              className={clsx(styles.button, styles.small)}
              onClick={() => setThirds((t) => t.slice(0, -1))}
              disabled={thirds.length === 0}
            >
              Remove top
            </button>
            <button
              type="button"
              className={clsx(styles.button, styles.small)}
              onClick={() => setThirds([])}
              disabled={thirds.length === 0}
            >
              Clear
            </button>
            <button
              type="button"
              className={clsx(styles.button, styles.small)}
              onClick={() => strum(root, thirds, 0.02)}
            >
              Play together
            </button>
            <button
              type="button"
              className={clsx(styles.button, styles.small)}
              onClick={() => strum(root, thirds, 0.32)}
            >
              Play one by one
            </button>
          </div>
        </div>
      </div>
      <PlayablePiano
        className="mt-para"
        range={[LOW, HIGH]}
        marks={marks}
        sound={false}
        onNoteOn={onNoteOn}
        short
        bar={false}
      />
    </section>
  );
}

/** The chord as a tower: each block a third, its height the number of half steps. */
function ThirdsTower({
  notes,
  thirds,
}: {
  notes: ReturnType<typeof stackThirds>;
  thirds: number[];
}) {
  const unit = 9;
  // Tall enough for the stack plus one more third, so it grows as you build.
  const top = notes[notes.length - 1].semitones;
  const total = Math.max(10, Math.min(21, top + 4)) * unit + 24;
  const chip = 22;
  return (
    <svg
      viewBox={`0 0 220 ${total}`}
      className={clsx(styles.svg, "mx-auto max-w-[220px]")}
      role="img"
      aria-label={`Stacked thirds: ${notes.map((n) => n.spelled).join(", ")}`}
    >
      {thirds.map((size, i) => {
        const top = total - 12 - notes[i + 1].semitones * unit;
        const height = size * unit;
        return (
          <g key={`${i}-${size}`}>
            <rect
              x={70}
              y={top}
              width={80}
              height={height - 2}
              rx={5}
              fill={size === MAJOR_THIRD ? "var(--accent)" : "var(--muted)"}
              opacity={size === MAJOR_THIRD ? 0.75 : 0.45}
            />
            <text
              x={110}
              y={top + height / 2 + 3}
              textAnchor="middle"
              style={{ fontSize: 12, fontWeight: 700, fill: "var(--paper)" }}
            >
              {size === MAJOR_THIRD ? "M3" : "m3"}
            </text>
          </g>
        );
      })}
      {notes.map((n) => {
        const y = total - 12 - n.semitones * unit;
        return (
          <g key={n.degree}>
            <line x1={58} x2={162} y1={y} y2={y} stroke="var(--ink)" strokeWidth={1.5} />
            <rect
              x={6}
              y={y - chip / 2}
              width={50}
              height={chip}
              rx={chip / 2}
              fill={pitchColor(pitchClass(n.midi), 0.62, 0.16)}
            />
            <text
              x={31}
              y={y + 4}
              textAnchor="middle"
              style={{ fontSize: 12, fontWeight: 700, fill: "#fff" }}
            >
              {n.spelled}
            </text>
            <text x={170} y={y + 4} style={{ fontSize: 12, fontWeight: 600 }}>
              {n.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
