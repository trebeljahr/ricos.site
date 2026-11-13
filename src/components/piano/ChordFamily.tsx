import clsx from "clsx";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { stepWhite, whiteAtOrBelow } from "src/lib/piano/keys";
import {
  chordSymbol,
  INTERVALS,
  pitchClass,
  roleColor,
  type StackedNote,
  stackThirds,
} from "src/lib/piano/notes";
import {
  atOrAbove,
  type Key,
  keyName,
  keyOn,
  keyPitchClasses,
  MAJOR,
  MINOR,
  romanNumeral,
  type ScaleNote,
  scaleNotes,
} from "src/lib/piano/scales";
import { KeyPicker, usePianoPlayer } from "./controls";
import type { KeyMark } from "./Keyboard";
import { PlayablePiano } from "./PlayablePiano";
import styles from "./piano.module.css";

/** Seconds between two counted half steps. */
const STEP = 0.16;
const NEUTRAL = "var(--muted)";
const OUTSIDE = "#8a8178";

/** One colour per triad quality, for the filled slots. */
const QUALITY_COLORS: Record<string, string> = {
  major: "oklch(0.7 0.15 55)",
  minor: "oklch(0.6 0.12 250)",
  diminished: "oklch(0.55 0.1 320)",
  augmented: "oklch(0.62 0.12 140)",
};

const THIRD_SIZES = [3, 4];

function quality(thirds: number[]) {
  const [a, b] = thirds;
  if (b === undefined) return null;
  if (a === 4 && b === 3) return "major";
  if (a === 3 && b === 4) return "minor";
  if (a === 3 && b === 3) return "diminished";
  return "augmented";
}

/** The notes picked on one degree, above its root: none, the third, or third and fifth. */
type Picks = number[];

/** A count of half steps running on the keyboard, from one key up to another. */
type Count = { base: number; target: number; accepted: boolean; shown: number };

type Built = {
  notes: StackedNote[];
  thirds: number[];
  outside: boolean[];
  complete: boolean;
};

function build(root: ScaleNote, picks: Picks, pcs: Set<number>): Built {
  const tones = [root.midi, ...picks];
  const thirds = tones.slice(1).map((m, i) => m - tones[i]);
  const notes = stackThirds(root.midi, thirds, true, root.letter);
  return {
    notes,
    thirds,
    outside: notes.map((n) => !pcs.has(pitchClass(n.midi))),
    complete: thirds.length === 2,
  };
}

/**
 * Build the triad on each note of a scale by hand: from the root, count three
 * or four half steps up to a third, then three or four more to the fifth.
 */
export function ChordFamily() {
  const [key, setKey] = useState<Key>(() => keyOn(0));
  const [degree, setDegree] = useState(0);
  const [picks, setPicks] = useState<Picks[]>(() => Array.from({ length: 7 }, () => []));
  const [count, setCount] = useState<Count | null>(null);
  const timers = useRef<number[]>([]);
  const { play, playChords, stop, sounding } = usePianoPlayer();

  const tonic = atOrAbove(key.tonicPc, 48); // C3–B3
  const scale = scaleNotes(key, tonic);
  const pcs = keyPitchClasses(key);
  const from = whiteAtOrBelow(tonic);
  const to = stepWhite(from, 14);
  const root = scale[degree];
  const mine = picks[degree];
  const chord = build(root, mine, pcs);
  const built = scale.map((note, d) => build(note, picks[d], pcs));

  const clearTimers = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const later = (seconds: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, seconds * 1000));
  };

  /** Counts half steps from `base` up to `target` on the keys, then sounds `final`. */
  const countUp = (base: number, target: number, accepted: boolean, final: number[]) => {
    clearTimers();
    const steps = target - base;
    setCount({ base, target, accepted, shown: 0 });
    play(
      Array.from({ length: steps + 1 }, (_, i) => base + i),
      { spread: STEP, duration: 0.5, velocity: 0.5 },
    );
    for (let i = 1; i <= steps; i++)
      later(i * STEP, () => setCount((c) => (c ? { ...c, shown: i } : c)));
    // The last count stays on the new note a moment before its name replaces it.
    later(steps * STEP + 0.4, () => setCount((c) => (c ? { ...c, shown: steps + 1 } : c)));
    later((steps + 1) * STEP + 0.15, () => play(final, { spread: 0.03, duration: 1.6 }));
  };

  const setMine = (next: Picks) => setPicks((all) => all.map((p, d) => (d === degree ? next : p)));

  const onNoteOn = (m: number) => {
    if (m < root.midi) return;
    if (m === root.midi) {
      clearTimers();
      setCount(null);
      setMine([]);
      play([m], { duration: 1 });
      return;
    }
    // A new third on a full chord, or a key at or below the last picked note, starts the degree again.
    const top = mine.length ? mine[mine.length - 1] : root.midi;
    const kept = chord.complete || m <= top ? [] : mine;
    const base = kept.length ? kept[kept.length - 1] : root.midi;
    if (m - base > 12) return;
    const accepted = THIRD_SIZES.includes(m - base);
    // A built chord stays until a new third replaces it.
    if (chord.complete && !accepted) return;
    const next = accepted ? [...kept, m] : kept;
    setMine(next);
    countUp(base, m, accepted, accepted ? [root.midi, ...next] : [base, m]);
  };

  const choose = (d: number) => {
    clearTimers();
    setCount(null);
    setDegree(d);
    const target = built[d];
    play(
      target.notes.map((n) => n.midi),
      { spread: 0.03, duration: 1.4 },
    );
  };

  const changeKey = (next: Key) => {
    clearTimers();
    stop();
    setKey(next);
    setDegree(0);
    setCount(null);
    setPicks(Array.from({ length: 7 }, () => []));
  };

  const inKey = built.filter((b) => b.complete && !b.outside.some(Boolean));
  const playFamily = () => {
    clearTimers();
    setCount(null);
    playChords(
      inKey.map((b) => b.notes.map((n) => n.midi)),
      0.75,
    );
  };

  // ── Keyboard marks ──────────────────────────────────────────────────────
  const marks: Record<number, KeyMark> = {};
  for (let m = from; m <= to; m++)
    if (pcs.has(pitchClass(m))) marks[m] = { ghost: true, color: NEUTRAL };

  // Half steps counted between the picked notes: 1, 2, 3 up to the third, then again to the fifth.
  const animating = count && count.shown <= count.target - count.base;
  const tones = [root.midi, ...mine];
  tones.slice(1).forEach((m, i) => {
    const low = tones[i];
    const counting = count?.accepted && count.target === m && animating;
    for (let k = low + 1; k < m; k++) {
      if (counting && k - low > (count?.shown ?? 0)) continue;
      marks[k] = { label: k - low, color: NEUTRAL };
    }
  });
  chord.notes.forEach((n, i) => {
    const counting = i > 0 && count?.accepted && count.target === n.midi && animating;
    if (counting) return;
    marks[n.midi] = {
      label: n.spelled,
      ring: i === 0,
      color: roleColor(n.semitones),
      ghost: chord.outside[i],
    };
  });
  if (count) {
    const steps = count.target - count.base;
    for (let i = 1; i <= Math.min(count.shown, steps); i++) {
      const k = count.base + i;
      if (count.accepted && i === steps && count.shown > steps) break;
      marks[k] = count.accepted
        ? { label: i, color: NEUTRAL }
        : { label: i, color: OUTSIDE, ghost: i === steps };
    }
  }

  // ── Readouts ────────────────────────────────────────────────────────────
  const kind = quality(chord.thirds);
  const symbol = chord.complete ? chordSymbol(chord.notes[0].spelled, chord.thirds) : root.spelled;
  const outsideNotes = chord.notes.filter((_, i) => chord.outside[i]);
  const missed =
    count && !count.accepted && count.shown >= count.target - count.base ? count : null;

  return (
    <section className={clsx(styles.panel, "not-prose")} aria-label="Chords of a scale">
      <div className="flex flex-wrap items-end justify-between gap-tight">
        <KeyPicker value={key} modes={[MAJOR, MINOR]} onChange={changeKey} />
        <div className="flex flex-wrap gap-tight">
          <button
            type="button"
            className={clsx(styles.button, styles.small)}
            onClick={playFamily}
            disabled={inKey.length === 0}
          >
            Play the chords in the key
          </button>
          <button
            type="button"
            className={clsx(styles.button, styles.small)}
            onClick={() => changeKey(key)}
            disabled={picks.every((p) => p.length === 0)}
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
          const b = built[d];
          const q = quality(b.thirds);
          const outside = b.complete && b.outside.some(Boolean);
          const roman = b.complete ? romanNumeral(d, b.thirds) : null;
          return (
            <li key={note.degree} className="min-w-0">
              <button
                type="button"
                className={clsx(styles.slot, "w-full", outside && "border-dashed")}
                aria-pressed={d === degree}
                aria-label={`${d + 1}: ${note.spelled}${roman ? `, ${roman}` : ""}${outside ? ", outside the key" : ""}`}
                onClick={() => choose(d)}
                style={
                  {
                    "--slot-color":
                      !q || outside ? (outside ? OUTSIDE : "var(--line)") : QUALITY_COLORS[q],
                  } as CSSProperties
                }
              >
                <span className={clsx(styles.mono, "text-xs")}>{d + 1}</span>
                <span className="text-sm font-semibold">{note.spelled}</span>
                <span
                  className={clsx(
                    styles.slotChord,
                    (!roman || outside) && styles.muted,
                    outside && "line-through",
                  )}
                >
                  {roman ?? "?"}
                </span>
                <span
                  className={clsx(styles.mono, "truncate text-[11px]", outside && styles.muted)}
                >
                  {b.complete ? chordSymbol(b.notes[0].spelled, b.thirds) : " "}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-para flex items-start justify-between gap-tight">
        <div className="min-w-0">
          <p className={clsx(styles.muted, "text-xs")}>
            {kind ? `${kind} triad on ${root.spelled}` : `degree ${degree + 1}`}
          </p>
          <p className="text-4xl font-semibold tracking-tight sm:text-5xl" aria-live="polite">
            {symbol}
          </p>
          <p className={clsx(styles.mono, "mt-tight text-sm")}>
            {chord.notes.map((n, i) => (
              <span key={n.degree}>
                {i > 0 && " · "}
                <span
                  className={clsx(chord.outside[i] && "underline decoration-dashed")}
                  style={{ color: roleColor(n.semitones, 0.55) }}
                >
                  {n.spelled}
                </span>
              </span>
            ))}
            {chord.notes.length < 3 && (
              <span className={styles.muted}>{" · ?".repeat(3 - chord.notes.length)}</span>
            )}
          </p>
          <p className={clsx(styles.muted, "mt-hair text-sm")} aria-live="polite">
            {chord.complete
              ? outsideNotes.length
                ? `${outsideNotes.map((n) => n.spelled).join(", ")} not in ${keyName(key)}`
                : `3 of 3 in ${keyName(key)}`
              : " "}
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

      <StepRuler thirds={chord.thirds} missed={missed ? missed.target - missed.base : null} />

      <PlayablePiano
        className="mt-label"
        range={[from, to]}
        marks={marks}
        down={sounding}
        sound={false}
        onNoteOn={onNoteOn}
        short
        bar={false}
      />
    </section>
  );
}

/**
 * The picked thirds as rows of half-step cells: 3 + 4, 4 + 3 or 3 + 3, and
 * what they add up to from the root.
 */
function StepRuler({ thirds, missed }: { thirds: number[]; missed: number | null }) {
  let total = 0;
  const segments = thirds.map((size) => {
    total += size;
    return { size, color: roleColor(total), name: INTERVALS[size].name, end: total };
  });
  return (
    <div className="mt-para flex min-h-[64px] flex-wrap items-start gap-tight" aria-live="polite">
      {segments.map((s) => (
        <Segment key={s.end} size={s.size} color={s.color} name={s.name} />
      ))}
      {missed !== null && (
        <Segment size={missed} color={OUTSIDE} name={INTERVALS[missed]?.name ?? ""} missed />
      )}
      {segments.length === 2 && (
        <div className="flex flex-col gap-hair self-stretch border-l border-[var(--line)] pl-tight">
          <span className={clsx(styles.mono, "text-lg font-semibold")}>
            {segments[0].size} + {segments[1].size} = {total}
          </span>
          <span className="text-xs" style={{ color: roleColor(total, 0.55) }}>
            {INTERVALS[total].name}
          </span>
        </div>
      )}
    </div>
  );
}

function Segment({
  size,
  color,
  name,
  missed = false,
}: {
  size: number;
  color: string;
  name: string;
  missed?: boolean;
}) {
  return (
    <div className={clsx("flex flex-col gap-hair", missed && "opacity-70")}>
      <div className="flex gap-[2px]">
        {Array.from({ length: size }, (_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: cells are positions, not items
            key={i}
            className={clsx(
              styles.mono,
              "inline-flex size-6 items-center justify-center rounded-md text-[11px] font-bold text-white",
            )}
            style={
              missed ? { boxShadow: `inset 0 0 0 1.5px ${color}`, color } : { background: color }
            }
          >
            {i + 1}
          </span>
        ))}
      </div>
      <span className={clsx("text-xs", missed && "line-through")}>{name}</span>
    </div>
  );
}
