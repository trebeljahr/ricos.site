import clsx from "clsx";
import { useCallback, useState } from "react";
import {
  chordSymbol,
  landsOnRoot,
  MAJOR_THIRD,
  MINOR_THIRD,
  roleColor,
  type StackedNote,
  stackThirds,
} from "src/lib/piano/notes";
import { PianoSwitch, PLAY_STYLES, type PlayStyle, usePianoPlayer } from "./controls";
import type { KeyMark } from "./Keyboard";
import { PlayablePiano } from "./PlayablePiano";
import styles from "./piano.module.css";

const LOW = 48; // C3
const HIGH = LOW + 35;
const MAX_THIRDS = 6;

const thirdName = (size: number) => (size === MAJOR_THIRD ? "major third" : "minor third");
const flip = (size: number) => (size === MAJOR_THIRD ? MINOR_THIRD : MAJOR_THIRD);

/** True when the stack goes major, minor, major … (or minor, major …) all the way up. */
const alternates = (thirds: number[]) =>
  thirds.length >= 2 && thirds.every((size, i) => i === 0 || size !== thirds[i - 1]);

/** Build a chord one third at a time on any root, and hear each new stack. */
export function ChordBuilder() {
  const [root, setRoot] = useState(LOW);
  const [thirds, setThirds] = useState<number[]>([MAJOR_THIRD, MINOR_THIRD]);
  const [style, setStyle] = useState<PlayStyle>("together");
  const player = usePianoPlayer();
  const { play } = player;
  const notes = stackThirds(root, thirds);
  const symbol = chordSymbol(notes[0].spelled, thirds);
  const doubled = landsOnRoot(notes);
  const alternating = alternates(thirds);

  const strum = useCallback(
    (r: number, t: number[], how: PlayStyle = style) => {
      play(
        stackThirds(r, t).map((n) => n.midi),
        { spread: how === "apart" ? 0.32 : 0.03, duration: 1.8, velocity: 0.62 },
      );
    },
    [play, style],
  );

  const change = (next: number[]) => {
    setThirds(next);
    strum(root, next);
  };

  const add = (size: number) => {
    if (thirds.length < MAX_THIRDS) change([...thirds, size]);
  };

  const alternate = () => {
    const first = thirds[0] ?? MAJOR_THIRD;
    change(Array.from({ length: MAX_THIRDS }, (_, i) => (i % 2 === 0 ? first : flip(first))));
  };

  const onNoteOn = useCallback(
    (m: number) => {
      setRoot(m);
      strum(m, thirds);
    },
    [thirds, strum],
  );

  const marks: Record<number, KeyMark> = {};
  for (const n of notes)
    marks[n.midi] = { label: n.label, ring: n.degree === 1, color: roleColor(n.semitones) };

  return (
    <section className={clsx(styles.panel, "not-prose")} aria-label="Chord builder">
      <div className="grid gap-para sm:grid-cols-[minmax(0,220px)_1fr] sm:items-end">
        <ThirdsTower
          notes={notes}
          thirds={thirds}
          alternating={alternating}
          onFlip={(i) => change(thirds.map((size, k) => (k === i ? flip(size) : size)))}
        />
        <div className="min-w-0">
          <p className={clsx(styles.muted, "text-xs")}>chord symbol</p>
          <p className="text-4xl font-semibold tracking-tight sm:text-5xl" aria-live="polite">
            {symbol}
          </p>
          <p className={clsx(styles.mono, "mt-tight text-sm")}>
            {notes.map((n) => n.spelled).join(" · ")}
          </p>
          <p className={clsx(styles.muted, "mt-hair min-h-[1.25rem] text-sm")} aria-live="polite">
            {[alternating && "alternating thirds", doubled && "back on the root"]
              .filter(Boolean)
              .join(" · ")}
          </p>
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
            <button type="button" className={styles.button} onClick={alternate}>
              Alternate up to the 13th
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
          </div>
          <div className="mt-tight flex flex-wrap items-center gap-tight">
            <button
              type="button"
              className={clsx(styles.button, styles.small)}
              onClick={() => strum(root, thirds)}
            >
              Play
            </button>
            <PianoSwitch
              label="How the chord plays"
              value={style}
              options={PLAY_STYLES}
              onChange={setStyle}
            />
          </div>
        </div>
      </div>
      <PlayablePiano
        className="mt-para"
        range={[LOW, HIGH]}
        marks={marks}
        down={player.sounding}
        sound={false}
        onNoteOn={onNoteOn}
        short
        bar={false}
      />
    </section>
  );
}

/**
 * The chord as a tower: each block a third, its height the number of half
 * steps. Clicking a block makes that third major or minor; the notes above
 * move with it.
 */
function ThirdsTower({
  notes,
  thirds,
  alternating,
  onFlip,
}: {
  notes: StackedNote[];
  thirds: number[];
  alternating: boolean;
  onFlip: (index: number) => void;
}) {
  const unit = 9;
  // Tall enough for the stack plus one more third, so it grows as you build.
  const top = notes[notes.length - 1].semitones;
  const total = Math.max(10, Math.min(25, top + 4)) * unit + 24;
  const chip = 22;
  const yOf = (semitones: number) => total - 12 - semitones * unit;
  return (
    <fieldset
      className="relative mx-auto my-0 w-[220px] min-w-0 max-w-full border-0 p-0"
      style={{ height: total }}
      aria-label={`Stacked thirds: ${notes.map((n) => n.spelled).join(", ")}`}
    >
      {thirds.map((size, i) => {
        const y = yOf(notes[i + 1].semitones);
        const major = size === MAJOR_THIRD;
        const name = thirdName(size);
        return (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: one block per place in the stack
            key={i}
            type="button"
            className={clsx(
              "absolute flex items-center justify-center rounded-[5px] text-[11px] font-bold leading-none transition-[top,height,background-color]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
              alternating && "ring-2 ring-[var(--ink)] ring-inset",
            )}
            style={{
              left: 70,
              width: 80,
              top: y,
              height: size * unit - 2,
              background: major ? "var(--accent)" : "var(--muted)",
              color: "var(--paper)",
              opacity: major ? 0.85 : 0.7,
            }}
            aria-label={`${name} from ${notes[i].spelled} to ${notes[i + 1].spelled}: make it a ${thirdName(flip(size))}`}
            title={`Make it a ${thirdName(flip(size))}`}
            onClick={() => onFlip(i)}
          >
            {name}
          </button>
        );
      })}
      {notes.map((n) => {
        const y = yOf(n.semitones);
        return (
          <div key={n.degree} aria-hidden="true">
            <div
              className="absolute h-[1.5px] bg-[var(--ink)]"
              style={{ left: 58, width: 104, top: y - 0.75 }}
            />
            <div
              className="absolute flex items-center justify-center rounded-full text-xs font-bold text-white"
              style={{
                left: 6,
                width: 50,
                top: y - chip / 2,
                height: chip,
                background: roleColor(n.semitones),
              }}
            >
              {n.spelled}
            </div>
            <div
              className="absolute text-xs font-semibold leading-none"
              style={{ left: 170, top: y - 6 }}
            >
              {n.label}
            </div>
          </div>
        );
      })}
    </fieldset>
  );
}
