import clsx from "clsx";
import { useCallback, useMemo, useRef, useState } from "react";
import { useWidth } from "src/hooks/usePianoInput";
import {
  chordSymbol,
  MAJOR_THIRD,
  MINOR_THIRD,
  pitchClass,
  pitchColor,
  type StackedNote,
  stackThirds,
} from "src/lib/piano/notes";
import { playPiano } from "src/lib/piano/sampler";
import {
  atOrAbove,
  bassTone,
  figuredBass,
  INVERSION_NAMES,
  intervalShort,
  invert,
  openVoicing,
} from "src/lib/piano/scales";
import { usePianoPlayer } from "./controls";
import type { KeyMark } from "./Keyboard";
import { PlayablePiano } from "./PlayablePiano";
import styles from "./piano.module.css";

const NARROW: [number, number] = [48, 79]; // C3–G5
const WIDE: [number, number] = [36, 84]; // C2–C6
const MAX_THIRDS = 3;

type Spacing = "close" | "open" | "spread";
const SPACINGS: { id: Spacing; label: string }[] = [
  { id: "close", label: "Close" },
  { id: "open", label: "Open" },
  { id: "spread", label: "Bass apart" },
];

/** One MIDI number per chord tone, in stacking order: root, third, fifth, seventh. */
type Placement = number[];

const sorted = (notes: number[]) => [...notes].sort((a, b) => a - b);
const fits = (notes: number[], [low, high]: [number, number]) =>
  notes.every((m) => m >= low && m <= high);

/** Moves a placement by whole octaves into the range, as near its middle as it goes. */
function fitRange(notes: Placement, range: [number, number]): Placement {
  const centre = (range[0] + range[1]) / 2;
  let best: Placement | null = null;
  let distance = Number.POSITIVE_INFINITY;
  for (let k = -4; k <= 4; k++) {
    const shifted = notes.map((m) => m + 12 * k);
    if (!fits(shifted, range)) continue;
    const mean = shifted.reduce((s, m) => s + m, 0) / shifted.length;
    if (Math.abs(mean - centre) < distance) {
      best = shifted;
      distance = Math.abs(mean - centre);
    }
  }
  if (best) return best;
  return notes.map((m) => {
    let n = m;
    while (n < range[0]) n += 12;
    while (n > range[1]) n -= 12;
    return n;
  });
}

/** A sorted voicing turned back into one note per chord tone. */
const byTone = (voicing: number[], tonePcs: number[]) =>
  tonePcs.map((pc) => voicing.find((m) => pitchClass(m) === pc) ?? pc);

function preset(rootPosition: number[], inversion: number, spacing: Spacing) {
  const close = invert(rootPosition, inversion);
  if (spacing === "open") return openVoicing(close);
  if (spacing === "spread") return [close[0] - 12, ...close.slice(1)];
  return close;
}

/** True when two voicings are the same shape, one possibly whole octaves above the other. */
function sameShape(a: number[], b: number[]) {
  const x = sorted(a);
  const y = sorted(b);
  if (x.length !== y.length) return false;
  const shift = x[0] - y[0];
  return shift % 12 === 0 && x.every((m, i) => m - y[i] === shift);
}

/**
 * Stack thirds into a chord, then move its notes around the keyboard: tap any
 * key with one of the chord's note names to move that note there.
 */
export function ChordInversions() {
  const box = useRef<HTMLElement>(null);
  const width = useWidth(box);
  const range = width >= 640 ? WIDE : NARROW;
  const [chord, setChord] = useState(() => ({
    root: 0,
    thirds: [MAJOR_THIRD, MINOR_THIRD],
    placed: [60, 64, 67] as Placement,
  }));
  const { play } = usePianoPlayer();

  const notes = stackThirds(60 + chord.root, chord.thirds);
  const tonePcs = notes.map((n) => pitchClass(n.midi));
  const rootPosition = notes.map((n) => n.midi);
  const placed = useMemo(
    () => (fits(chord.placed, range) ? chord.placed : fitRange(chord.placed, range)),
    [chord.placed, range],
  );
  const voicing = sorted(placed);
  const bass = Math.max(0, bassTone(placed, tonePcs));
  const symbol = chordSymbol(notes[0].spelled, chord.thirds);
  const slash = bass > 0 ? `${symbol}/${notes[bass].spelled}` : symbol;
  const toneAt = (m: number) => tonePcs.indexOf(pitchClass(m));

  const strum = useCallback(
    (next: number[], spread = 0.03) => play(sorted(next), { spread, duration: 1.8 }),
    [play],
  );

  const set = (next: Partial<typeof chord> & { placed: Placement }) => {
    setChord((c) => ({ ...c, ...next }));
    strum(next.placed);
  };

  const applyPreset = (inversion: number, spacing: Spacing) => {
    const next = byTone(preset(rootPosition, inversion, spacing), tonePcs);
    set({ placed: fitRange(next, range) });
  };

  const moveRoot = (step: -1 | 1) => {
    const next = placed.map((m) => m + step);
    set({
      root: (chord.root + step + 12) % 12,
      placed: fits(next, range) ? next : fitRange(next, range),
    });
  };

  const nextPc = (size: number) => (chord.root + notes[notes.length - 1].semitones + size) % 12;
  const canAdd = (size: number) =>
    chord.thirds.length < MAX_THIRDS && !tonePcs.includes(nextPc(size));

  const addThird = (size: number) => {
    if (!canAdd(size)) return;
    let top = atOrAbove(nextPc(size), Math.max(...placed) + 1);
    while (top > range[1]) top -= 12;
    set({ thirds: [...chord.thirds, size], placed: [...placed, top] });
  };

  const removeTop = () => {
    if (chord.thirds.length === 0) return;
    set({ thirds: chord.thirds.slice(0, -1), placed: placed.slice(0, -1) });
  };

  const onNoteOn = (m: number, velocity: number) => {
    const tone = toneAt(m);
    if (tone < 0) {
      playPiano(m, { velocity, duration: 0.9 });
      return;
    }
    const next = [...placed];
    next[tone] = m;
    set({ placed: next });
  };

  const marks: Record<number, KeyMark> = {};
  for (let m = range[0]; m <= range[1]; m++) {
    const tone = toneAt(m);
    if (tone >= 0) marks[m] = { ghost: true, color: pitchColor(tonePcs[tone], 0.62, 0.16) };
  }
  placed.forEach((m, tone) => {
    marks[m] = { label: notes[tone].label, ring: tone === 0 };
  });

  const spacing = SPACINGS.find((s) => sameShape(placed, preset(rootPosition, bass, s.id)))?.id;

  return (
    <section ref={box} className={clsx(styles.panel, "not-prose")} aria-label="Chord inversions">
      <div className="grid gap-para sm:grid-cols-[minmax(0,220px)_1fr] sm:items-start">
        <GapTower voicing={voicing} notes={notes} tonePcs={tonePcs} />
        <div className="min-w-0">
          <p className={clsx(styles.muted, "text-xs")}>chord symbol</p>
          <p className="text-4xl font-semibold tracking-tight sm:text-5xl" aria-live="polite">
            {slash}
          </p>
          <p className={clsx(styles.mono, "mt-tight text-sm")}>
            {voicing.map((m) => notes[toneAt(m)]?.spelled).join(" · ")}
          </p>
          <dl className="mt-label grid grid-cols-2 gap-label">
            <div className={clsx(styles.readout, styles.wordy)}>
              <dt>
                {notes.length >= 3 ? `figured bass ${figuredBass(notes.length, bass)}` : "bass"}
              </dt>
              <dd>{INVERSION_NAMES[bass] ?? "—"}</dd>
            </div>
            <div className={styles.readout}>
              <dt>half steps, bottom to top</dt>
              <dd>{voicing[voicing.length - 1] - voicing[0]}</dd>
            </div>
          </dl>

          <div className="mt-para flex flex-wrap items-center gap-tight">
            <span className={styles.segmented} role="group" aria-label="Root">
              <button
                type="button"
                className={clsx(styles.button, styles.small)}
                onClick={() => moveRoot(-1)}
                aria-label="Root a half step down"
              >
                ◀
              </button>
              <span
                className={clsx(
                  styles.mono,
                  "inline-flex min-w-12 items-center justify-center font-semibold",
                )}
              >
                {notes[0].spelled}
              </span>
              <button
                type="button"
                className={clsx(styles.button, styles.small)}
                onClick={() => moveRoot(1)}
                aria-label="Root a half step up"
              >
                ▶
              </button>
            </span>
            <button
              type="button"
              className={clsx(styles.button, styles.small)}
              onClick={() => addThird(MINOR_THIRD)}
              disabled={!canAdd(MINOR_THIRD)}
            >
              + minor third
            </button>
            <button
              type="button"
              className={clsx(styles.button, styles.small)}
              onClick={() => addThird(MAJOR_THIRD)}
              disabled={!canAdd(MAJOR_THIRD)}
            >
              + major third
            </button>
            <button
              type="button"
              className={clsx(styles.button, styles.small)}
              onClick={removeTop}
              disabled={chord.thirds.length === 0}
            >
              Remove top
            </button>
          </div>

          <div
            className="mt-tight flex flex-wrap gap-tight"
            role="group"
            aria-label="Note in the bass"
          >
            {notes.map((n, k) => (
              <button
                key={n.degree}
                type="button"
                className={clsx(styles.button, styles.small)}
                aria-pressed={bass === k}
                onClick={() => applyPreset(k, spacing ?? "close")}
              >
                {INVERSION_NAMES[k]}
              </button>
            ))}
          </div>
          <div className="mt-tight flex flex-wrap gap-tight">
            <span className={styles.segmented} role="group" aria-label="Spacing">
              {SPACINGS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={clsx(styles.button, styles.small)}
                  aria-pressed={spacing === s.id}
                  disabled={s.id !== "close" && notes.length < (s.id === "open" ? 3 : 2)}
                  onClick={() => applyPreset(bass, s.id)}
                >
                  {s.label}
                </button>
              ))}
            </span>
            <button
              type="button"
              className={clsx(styles.button, styles.small)}
              onClick={() => strum(placed, 0.02)}
            >
              Play together
            </button>
            <button
              type="button"
              className={clsx(styles.button, styles.small)}
              onClick={() => strum(placed, 0.3)}
            >
              Play one by one
            </button>
          </div>
        </div>
      </div>
      <PlayablePiano
        className="mt-para"
        range={range}
        marks={marks}
        sound={false}
        onNoteOn={onNoteOn}
        short
        bar={false}
      />
    </section>
  );
}

/**
 * The voicing from the bottom up: each block is the gap between two
 * neighbouring notes, as tall as its half steps, named by its interval.
 */
function GapTower({
  voicing,
  notes,
  tonePcs,
}: {
  voicing: number[];
  notes: StackedNote[];
  tonePcs: number[];
}) {
  const span = Math.max(1, voicing[voicing.length - 1] - voicing[0]);
  const unit = Math.min(9, 236 / Math.max(span, 12));
  const total = Math.max(12, span) * unit + 28;
  const y = (m: number) => total - 14 - (m - voicing[0]) * unit;
  const chip = 22;
  const tone = (m: number) => notes[tonePcs.indexOf(pitchClass(m))];
  return (
    <svg
      viewBox={`0 0 220 ${total}`}
      className={clsx(styles.svg, "mx-auto max-w-[220px]")}
      role="img"
      aria-label={`From the bottom: ${voicing.map((m) => tone(m)?.spelled).join(", ")}`}
    >
      {voicing.slice(1).map((m, i) => {
        const low = voicing[i];
        const gap = m - low;
        const top = y(m);
        const height = gap * unit;
        return (
          <g key={`${low}-${m}`}>
            <rect
              x={70}
              y={top + 1}
              width={80}
              height={Math.max(2, height - 2)}
              rx={5}
              fill={gap <= 4 ? "var(--accent)" : "var(--muted)"}
              opacity={gap <= 4 ? 0.7 : 0.4}
            />
            {height >= 14 && (
              <text
                x={110}
                y={top + height / 2 + 4}
                textAnchor="middle"
                style={{ fontSize: 12, fontWeight: 700, fill: "var(--paper)" }}
              >
                {intervalShort(gap)}
              </text>
            )}
          </g>
        );
      })}
      {voicing.map((m) => {
        const n = tone(m);
        return (
          <g key={m}>
            <line x1={58} x2={162} y1={y(m)} y2={y(m)} stroke="var(--ink)" strokeWidth={1.5} />
            <rect
              x={6}
              y={y(m) - chip / 2}
              width={50}
              height={chip}
              rx={chip / 2}
              fill={pitchColor(pitchClass(m), 0.62, 0.16)}
            />
            <text
              x={31}
              y={y(m) + 4}
              textAnchor="middle"
              style={{ fontSize: 12, fontWeight: 700, fill: "#fff" }}
            >
              {n?.spelled}
            </text>
            <text x={170} y={y(m) + 4} style={{ fontSize: 12, fontWeight: 600 }}>
              {n?.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
