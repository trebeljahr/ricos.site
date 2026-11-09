import clsx from "clsx";
import { type CSSProperties, useState } from "react";
import { stepWhite, whiteAtOrBelow } from "src/lib/piano/keys";
import { chordSymbol, pitchClass, pitchColor } from "src/lib/piano/notes";
import {
  atOrAbove,
  type Key,
  keyName,
  keyOn,
  keyPitchClasses,
  MAJOR,
  MINOR,
  romanNumeral,
  scaleNotes,
  TRIADS,
  triadOnDegree,
} from "src/lib/piano/scales";
import { KeyPicker, usePianoPlayer } from "./controls";
import type { KeyMark } from "./Keyboard";
import { PlayablePiano } from "./PlayablePiano";
import styles from "./piano.module.css";

/** One colour per triad quality, shared by the buttons and the slots. */
export const QUALITY_COLORS = [
  "oklch(0.7 0.15 55)", // major
  "oklch(0.6 0.12 250)", // minor
  "oklch(0.55 0.1 320)", // diminished
];
const OUTSIDE = "#8a8178";

/**
 * Walk the seven notes of a scale: on each, try a major, minor and diminished
 * triad; the one whose notes all belong to the key is kept in its slot.
 */
export function ChordFamily() {
  const [key, setKey] = useState<Key>(() => keyOn(0));
  const [degree, setDegree] = useState(0);
  const [tried, setTried] = useState<number | null>(null);
  const [found, setFound] = useState<(number | null)[]>(() => Array(7).fill(null));
  const { play, playChords } = usePianoPlayer();

  const tonic = atOrAbove(key.tonicPc, 48); // C3–B3
  const scale = scaleNotes(key, tonic);
  const pcs = keyPitchClasses(key);
  const from = whiteAtOrBelow(tonic);
  const to = stepWhite(from, 14);
  const root = scale[degree];
  const attempt = tried === null ? null : triadOnDegree(key, degree, TRIADS[tried].thirds, tonic);
  const inKey = attempt ? attempt.outside.filter((o) => !o).length : 0;

  const chordOf = (d: number, q: number) => triadOnDegree(key, d, TRIADS[q].thirds, tonic);

  const choose = (d: number) => {
    setDegree(d);
    setTried(found[d]);
    play([scale[d].midi], { duration: 0.8 });
  };

  const tryQuality = (q: number) => {
    const result = chordOf(degree, q);
    setTried(q);
    play(
      result.notes.map((n) => n.midi),
      { spread: 0.03, duration: 1.6 },
    );
    if (result.fits) setFound((f) => f.map((value, d) => (d === degree ? q : value)));
  };

  const changeKey = (next: Key) => {
    setKey(next);
    setDegree(0);
    setTried(null);
    setFound(Array(7).fill(null));
  };

  const playFamily = () =>
    playChords(
      found.flatMap((q, d) => (q === null ? [] : [chordOf(d, q).notes.map((n) => n.midi)])),
      0.75,
    );

  const marks: Record<number, KeyMark> = {};
  for (let m = from; m <= to; m++)
    if (pcs.has(pitchClass(m)))
      marks[m] = { ghost: true, color: pitchColor(pitchClass(m), 0.62, 0.16) };
  if (attempt) {
    attempt.notes.forEach((n, i) => {
      marks[n.midi] = attempt.outside[i]
        ? { label: n.spelled, color: OUTSIDE, ring: i === 0 }
        : { label: n.spelled, ring: i === 0 };
    });
  } else {
    marks[root.midi] = { label: root.spelled, ring: true };
  }

  const symbol = attempt
    ? chordSymbol(attempt.notes[0].spelled, [...TRIADS[tried ?? 0].thirds])
    : root.spelled;

  return (
    <section className={clsx(styles.panel, "not-prose")} aria-label="Chords of a scale">
      <div className="flex flex-wrap items-end justify-between gap-tight">
        <KeyPicker value={key} modes={[MAJOR, MINOR]} onChange={changeKey} />
        <div className="flex flex-wrap gap-tight">
          <button
            type="button"
            className={clsx(styles.button, styles.small)}
            onClick={playFamily}
            disabled={found.every((q) => q === null)}
          >
            Play the kept chords
          </button>
          <button
            type="button"
            className={clsx(styles.button, styles.small)}
            onClick={() => changeKey(key)}
            disabled={found.every((q) => q === null) && tried === null}
          >
            Start over
          </button>
        </div>
      </div>

      <ol
        className="mt-para grid list-none grid-cols-7 gap-hair p-0"
        aria-label={`Degrees of ${keyName(key)}`}
      >
        {scale.map((note, d) => {
          const q = found[d];
          const chord = q === null ? null : chordOf(d, q);
          return (
            <li key={note.degree} className="min-w-0">
              <button
                type="button"
                className={clsx(styles.slot, "w-full")}
                aria-pressed={d === degree}
                aria-label={`${d + 1}: ${note.spelled}${chord ? `, ${romanNumeral(d, [...TRIADS[q as number].thirds])}` : ""}`}
                onClick={() => choose(d)}
                style={
                  {
                    "--slot-color": q === null ? "var(--line)" : QUALITY_COLORS[q],
                  } as CSSProperties
                }
              >
                <span className={clsx(styles.mono, "text-xs")}>{d + 1}</span>
                <span className="text-sm font-semibold">{note.spelled}</span>
                <span className={clsx(styles.slotChord, q === null && styles.muted)}>
                  {chord ? romanNumeral(d, [...TRIADS[q as number].thirds]) : "?"}
                </span>
                <span className={clsx(styles.mono, "truncate text-[11px]")}>
                  {chord
                    ? chordSymbol(chord.notes[0].spelled, [...TRIADS[q as number].thirds])
                    : " "}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-para flex items-start justify-between gap-tight">
        <div className="min-w-0">
          <p className={clsx(styles.muted, "text-xs")}>
            {attempt
              ? `${TRIADS[tried ?? 0].name} triad on ${root.spelled}`
              : `degree ${degree + 1}`}
          </p>
          <p className="text-4xl font-semibold tracking-tight sm:text-5xl" aria-live="polite">
            {symbol}
          </p>
          <p className={clsx(styles.mono, "mt-tight text-sm")}>
            {attempt
              ? attempt.notes.map((n, i) => (
                  <span key={n.degree}>
                    {i > 0 && " · "}
                    <span className={clsx(attempt.outside[i] && "line-through opacity-60")}>
                      {n.spelled}
                    </span>
                  </span>
                ))
              : " "}
          </p>
          <p className={clsx(styles.muted, "mt-hair text-sm")}>
            {attempt ? `${inKey} of 3 in ${keyName(key)}` : " "}
          </p>
        </div>
        <div className="flex shrink-0 gap-tight">
          <button
            type="button"
            className={styles.button}
            onClick={() => choose((degree + 6) % 7)}
            aria-label="Previous degree"
          >
            ◀
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => choose((degree + 1) % 7)}
            aria-label="Next degree"
          >
            ▶
          </button>
        </div>
      </div>
      <div className="mt-label grid grid-cols-3 gap-tight sm:flex sm:flex-wrap">
        {TRIADS.map((t, q) => (
          <button
            key={t.name}
            type="button"
            className={clsx(styles.button, "px-2 sm:px-4")}
            aria-pressed={tried === q}
            onClick={() => tryQuality(q)}
          >
            <span
              aria-hidden="true"
              className="inline-block size-2.5 shrink-0 rounded-full"
              style={{ background: QUALITY_COLORS[q] }}
            />
            {t.name}
          </button>
        ))}
      </div>

      <PlayablePiano className="mt-para" range={[from, to]} marks={marks} short bar={false} />
    </section>
  );
}
