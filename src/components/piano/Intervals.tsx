import clsx from "clsx";
import { type CSSProperties, useCallback, useMemo, useState } from "react";
import { layoutKeys } from "src/lib/piano/keys";
import {
  defaultLetter,
  INTERVALS,
  noteName,
  roleColor,
  spell,
  spellInterval,
} from "src/lib/piano/notes";
import { PianoSwitch, PLAY_STYLES, type PlayStyle, usePianoPlayer } from "./controls";
import arrowStyles from "./Intervals.module.css";
import type { KeyMark } from "./Keyboard";
import { PlayablePiano } from "./PlayablePiano";
import styles from "./piano.module.css";

const CHOICES = INTERVALS.slice(1);
const LOW = 48; // C3
const HIGH = LOW + 35;
/** Seconds between the two notes when they play one after the other. */
const GAP = 0.55;

/** The number shown on the upper key: 2 for a second, 8 for the octave. */
const intervalDigit = (semitones: number) => String(INTERVALS[semitones].letterSteps + 1);

/**
 * Pick a key, then an interval: hear the two notes one after the other or
 * together, and see how many half steps apart they are.
 */
export function Intervals() {
  const [root, setRoot] = useState(60);
  const [index, setIndex] = useState(6); // perfect fifth
  const [style, setStyle] = useState<PlayStyle>("apart");
  const [run, setRun] = useState(0);
  const player = usePianoPlayer();
  const { play: playKeys } = player;
  const interval = CHOICES[index];
  const upper = root + interval.semitones;

  const play = useCallback(
    (r: number, semitones: number, how: PlayStyle) => {
      const apart = how === "apart";
      playKeys([r, r + semitones], {
        spread: apart ? GAP : 0.02,
        duration: apart ? 0.9 : 1.4,
        velocity: 0.7,
      });
      setRun((n) => n + 1);
    },
    [playKeys],
  );

  const onNoteOn = useCallback(
    (m: number) => {
      setRoot(m);
      play(m, interval.semitones, style);
    },
    [interval.semitones, style, play],
  );

  const rootName = spell(root, defaultLetter(root)) ?? noteName(root, { octave: false });
  const upperName = spellInterval(root, interval);
  const marks: Record<number, KeyMark> = {
    [root]: { label: "1", ring: true, color: roleColor(0) },
    [upper]: { label: intervalDigit(interval.semitones), color: roleColor(interval.semitones) },
  };

  return (
    <section className={clsx(styles.panel, "not-prose")} aria-label="Intervals">
      <div className="grid grid-cols-2 gap-tight sm:grid-cols-3 md:grid-cols-4">
        {CHOICES.map((choice, i) => (
          <button
            key={choice.short}
            type="button"
            className={clsx(styles.button, styles.small)}
            aria-pressed={i === index}
            onClick={() => {
              setIndex(i);
              play(root, choice.semitones, style);
            }}
          >
            {choice.name}
          </button>
        ))}
      </div>

      <HalfSteps root={root} semitones={interval.semitones} />

      <dl className="mt-label grid grid-cols-2 gap-label sm:grid-cols-3">
        <div className={clsx(styles.readout, styles.wordy)}>
          <dt>interval</dt>
          <dd>{interval.name}</dd>
        </div>
        <div className={clsx(styles.readout, styles.wordy)}>
          <dt>notes</dt>
          <dd>
            {rootName} → {upperName}
          </dd>
        </div>
        <div className={clsx(styles.readout, styles.wordy)}>
          <dt>half steps</dt>
          <dd>{interval.semitones}</dd>
        </div>
      </dl>

      <div className="mt-para flex flex-wrap items-center gap-tight">
        <button
          type="button"
          className={clsx(styles.button, styles.primary)}
          onClick={() => play(root, interval.semitones, style)}
        >
          Play again
        </button>
        <PianoSwitch
          label="How the two notes play"
          value={style}
          options={PLAY_STYLES}
          onChange={setStyle}
        />
      </div>

      <div className="mt-para">
        <IntervalArrow
          key={run}
          from={root}
          to={upper}
          seconds={style === "apart" ? GAP : 0.25}
          color={roleColor(interval.semitones)}
        />
        <PlayablePiano
          range={[LOW, HIGH]}
          marks={marks}
          down={player.sounding}
          sound={false}
          onNoteOn={onNoteOn}
          short
          bar={false}
        />
      </div>
    </section>
  );
}

/**
 * An arc drawn from the lower key to the upper one, timed with the second
 * note. A key past the end of the keyboard gets the arrow at that end.
 */
function IntervalArrow({
  from,
  to,
  seconds,
  color,
}: {
  from: number;
  to: number;
  seconds: number;
  color: string;
}) {
  const keys = useMemo(() => layoutKeys(LOW, HIGH), []);
  const centre = (midi: number) => {
    const key = keys.find((k) => k.midi === midi);
    if (key) return key.left + key.width / 2;
    return midi < LOW ? 0 : 1;
  };
  const x1 = centre(from);
  const x2 = centre(to);
  const off = to > HIGH;
  if (x2 - x1 < 0.005) return <div className={arrowStyles.strip} aria-hidden="true" />;
  const vars = { "--draw": `${seconds}s`, "--arrow": color } as CSSProperties;
  return (
    <div className={arrowStyles.strip} style={vars} aria-hidden="true">
      <div
        className={arrowStyles.arc}
        style={{ left: `${x1 * 100}%`, width: `${(x2 - x1) * 100}%` }}
      >
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
          <path
            d={off ? "M0 30 C 10 2, 70 4, 100 15" : "M0 30 C 12 0, 88 0, 100 28"}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <span
        className={clsx(arrowStyles.head, off && arrowStyles.headOff)}
        style={{ left: `${x2 * 100}%` }}
      />
    </div>
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
            style={{ background: k < semitones ? roleColor(semitones) : "var(--track)" }}
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
