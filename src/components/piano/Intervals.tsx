import clsx from "clsx";
import { useCallback, useState } from "react";
import {
  cents as centsOf,
  defaultLetter,
  formatCents,
  INTERVALS,
  noteName,
  pitchClass,
  pitchColor,
  spell,
  spellInterval,
} from "src/lib/piano/notes";
import { playPiano } from "src/lib/piano/sampler";
import type { KeyMark } from "./Keyboard";
import { PlayablePiano } from "./PlayablePiano";
import styles from "./piano.module.css";

const CHOICES = INTERVALS.slice(1);
const LOW = 48; // C3
const HIGH = LOW + 35;

/**
 * Pick a key, then an interval: hear the two notes one after the other or
 * together, and see how many half steps apart they are.
 */
export function Intervals() {
  const [root, setRoot] = useState(60);
  const [index, setIndex] = useState(6); // perfect fifth
  const [together, setTogether] = useState(false);
  const interval = CHOICES[index];
  const upper = root + interval.semitones;

  const play = useCallback((r: number, semitones: number, both: boolean) => {
    playPiano(r, { duration: both ? 1.4 : 0.6, velocity: 0.7 });
    playPiano(r + semitones, { duration: both ? 1.4 : 0.9, velocity: 0.7, delay: both ? 0 : 0.55 });
  }, []);

  const onNoteOn = useCallback(
    (m: number) => {
      const r = Math.min(HIGH - 12, m);
      setRoot(r);
      play(r, interval.semitones, together);
    },
    [interval.semitones, together, play],
  );

  const rootName = spell(root, defaultLetter(root)) ?? noteName(root, { octave: false });
  const upperName = spellInterval(root, interval);
  const [p, q] = interval.ratio;
  const pure = centsOf(p / q);
  const marks: Record<number, KeyMark> = {
    [root]: { label: "1", ring: true },
    [upper]: { label: interval.short },
  };

  return (
    <section className={clsx(styles.panel, "not-prose")} aria-label="Intervals">
      <div className="grid grid-cols-4 gap-tight sm:grid-cols-6">
        {CHOICES.map((choice, i) => (
          <button
            key={choice.short}
            type="button"
            className={clsx(styles.button, "px-2")}
            aria-pressed={i === index}
            aria-label={choice.name}
            title={choice.name}
            onClick={() => {
              setIndex(i);
              play(root, choice.semitones, together);
            }}
          >
            {choice.short}
          </button>
        ))}
      </div>

      <HalfSteps root={root} semitones={interval.semitones} />

      <dl className="mt-label grid grid-cols-2 gap-label sm:grid-cols-4">
        <div className={styles.readout}>
          <dt>interval</dt>
          <dd>{interval.name}</dd>
        </div>
        <div className={styles.readout}>
          <dt>notes</dt>
          <dd>
            {rootName} → {upperName}
          </dd>
        </div>
        <div className={styles.readout}>
          <dt>half steps</dt>
          <dd>{interval.semitones}</dd>
        </div>
        <div className={styles.readout}>
          <dt>
            piano vs {p} : {q}
          </dt>
          <dd>{formatCents(interval.semitones * 100 - pure)}</dd>
        </div>
      </dl>

      <div className="mt-para flex flex-wrap items-center gap-tight">
        <button
          type="button"
          className={clsx(styles.button, styles.primary)}
          onClick={() => play(root, interval.semitones, together)}
        >
          Play again
        </button>
        <span className={styles.segmented} role="group" aria-label="How the two notes play">
          <button
            type="button"
            className={clsx(styles.button, styles.small)}
            aria-pressed={!together}
            onClick={() => setTogether(false)}
          >
            One after the other
          </button>
          <button
            type="button"
            className={clsx(styles.button, styles.small)}
            aria-pressed={together}
            onClick={() => setTogether(true)}
          >
            Together
          </button>
        </span>
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

/** A row of half steps from the lower note to the octave, the interval filled in. */
function HalfSteps({ root, semitones }: { root: number; semitones: number }) {
  return (
    <div className="mt-para" aria-hidden="true">
      <div className="flex gap-[3px]">
        {Array.from({ length: 12 }, (_, k) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: one cell per half step
            key={k}
            className="h-6 flex-1 rounded"
            style={{
              background:
                k < semitones
                  ? pitchColor(pitchClass(root + semitones), 0.7, 0.14)
                  : "var(--track)",
            }}
          />
        ))}
      </div>
      <div className={clsx(styles.mono, styles.muted, "mt-hair flex justify-between text-xs")}>
        <span>{noteName(root)}</span>
        <span>{noteName(root + 12)}</span>
      </div>
    </div>
  );
}
