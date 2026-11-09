import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useKeyLabels, useMidiStatus, usePianoInput, useWidth } from "src/hooks/usePianoInput";
import type { Voice } from "src/lib/piano/audio";
import { COMPUTER_KEYS, stepWhite, whiteAtOrBelow } from "src/lib/piano/keys";
import { formatHz, midiToHz, noteName, PIANO_HIGH, PIANO_LOW } from "src/lib/piano/notes";
import { playPiano, prefetchPiano } from "src/lib/piano/sampler";
import { Keyboard, type KeyMark } from "./Keyboard";
import styles from "./piano.module.css";

/** The C the A key plays, for each octave the computer keys can reach. */
const LOWEST_BASE = 24;
const HIGHEST_BASE = 96;

export type PlayablePianoProps = {
  /** The octave the computer keys start on: 4 puts the A key on middle C. */
  octave?: number;
  /** Narrowest a white key may be, in pixels; fewer keys show on small screens. */
  minKeyWidth?: number;
  /** Most white keys to show on a wide screen. */
  maxWhiteKeys?: number;
  /** A fixed range instead of one that fits the width. */
  range?: [number, number];
  marks?: Readonly<Record<number, KeyMark>>;
  /** Extra keys drawn down, e.g. notes a demo is playing. */
  down?: ReadonlySet<number>;
  onNoteOn?: (midi: number, velocity: number) => void;
  onNoteOff?: (midi: number) => void;
  /** False: the keys report presses but make no sound (the caller plays them). */
  sound?: boolean;
  /** Show the held notes, the octave buttons and the MIDI button. */
  bar?: boolean;
  short?: boolean;
  names?: "c" | "all" | "none";
  label?: string;
  className?: string;
};

/**
 * The shared piano of the /piano demos: sampled piano sound, mouse, touch,
 * computer keys and MIDI. Demos hook in with `onNoteOn` and draw on it with
 * `marks`.
 */
export function PlayablePiano({
  octave = 4,
  minKeyWidth = 34,
  maxWhiteKeys = 29,
  range,
  marks,
  down: extraDown,
  onNoteOn,
  onNoteOff,
  sound = true,
  bar = true,
  short = false,
  names = "c",
  label = "Piano keyboard",
  className,
}: PlayablePianoProps) {
  const box = useRef<HTMLDivElement>(null);
  const width = useWidth(box);
  const [base, setBase] = useState(() => 12 * (octave + 1));
  const [held, setHeld] = useState<ReadonlySet<number>>(new Set());
  const [last, setLast] = useState<number | null>(null);
  const voices = useRef(new Map<number, Voice>());
  const sustained = useRef(new Set<number>());
  const pedal = useRef(false);
  const labels = useKeyLabels();
  const midi = useMidiStatus();

  // The visible keys: as many white keys as fit, starting a little below the
  // computer keys' C so the hand position sits in the middle.
  const [from, to] = useMemo(() => {
    if (range) return range;
    const count = Math.max(8, Math.min(maxWhiteKeys, Math.floor(width / minKeyWidth)));
    const spare = Math.max(0, count - 11);
    let start = stepWhite(base, -Math.floor(spare / 2));
    start = Math.max(PIANO_LOW, whiteAtOrBelow(start));
    let end = stepWhite(start, count - 1);
    if (end > PIANO_HIGH) {
      end = PIANO_HIGH;
      start = stepWhite(end, -(count - 1));
    }
    return [start, end] as [number, number];
  }, [range, width, minKeyWidth, maxWhiteKeys, base]);

  useEffect(() => {
    if (sound) prefetchPiano(from, to);
  }, [sound, from, to]);

  useEffect(
    () => () => {
      for (const voice of voices.current.values()) voice.stop();
      voices.current.clear();
    },
    [],
  );

  const noteOn = useCallback(
    (m: number, velocity: number) => {
      if (m < PIANO_LOW || m > PIANO_HIGH) return;
      if (sound) {
        voices.current.get(m)?.stop();
        voices.current.set(m, playPiano(m, { velocity }));
        sustained.current.delete(m);
      }
      setHeld((h) => new Set(h).add(m));
      setLast(m);
      onNoteOn?.(m, velocity);
    },
    [sound, onNoteOn],
  );

  const noteOff = useCallback(
    (m: number) => {
      if (pedal.current) sustained.current.add(m);
      else {
        voices.current.get(m)?.stop();
        voices.current.delete(m);
      }
      setHeld((h) => {
        const next = new Set(h);
        next.delete(m);
        return next;
      });
      onNoteOff?.(m);
    },
    [onNoteOff],
  );

  const sustain = useCallback((isDown: boolean) => {
    pedal.current = isDown;
    if (isDown) return;
    for (const m of sustained.current) {
      voices.current.get(m)?.stop();
      voices.current.delete(m);
    }
    sustained.current.clear();
  }, []);

  const shiftOctave = useCallback((step: -1 | 1) => {
    setBase((b) => Math.min(HIGHEST_BASE, Math.max(LOWEST_BASE, b + 12 * step)));
  }, []);

  const { activate } = usePianoInput(
    base,
    { onDown: noteOn, onUp: noteOff, onSustain: sustain },
    { onOctave: shiftOctave },
  );

  const hints = useMemo(() => {
    if (!labels) return undefined;
    const out: Record<number, string> = {};
    for (const [code, step] of Object.entries(COMPUTER_KEYS)) out[base + step] = labels[code] ?? "";
    return out;
  }, [labels, base]);

  const down = useMemo(() => {
    if (!extraDown?.size) return held;
    const all = new Set(held);
    for (const m of extraDown) all.add(m);
    return all;
  }, [held, extraDown]);

  const heldNames = [...held].sort((a, b) => a - b).map((m) => noteName(m));

  return (
    <div ref={box} className={clsx(styles.tokens, "not-prose min-w-0", className)}>
      <Keyboard
        from={from}
        to={to}
        down={down}
        marks={marks}
        names={names}
        hints={hints}
        onKeyDown={noteOn}
        onKeyUp={noteOff}
        onActivate={activate}
        short={short}
        label={label}
        tabIndex={0}
      />
      {bar && (
        <div className={styles.pianoBar}>
          <div className={clsx(styles.held, styles.mono)} aria-live="polite">
            {heldNames.length > 1
              ? heldNames.join(" · ")
              : last !== null
                ? `${noteName(last)} · ${formatHz(midiToHz(last))} · MIDI ${last}`
                : " "}
          </div>
          <div className="flex flex-wrap items-center gap-tight">
            <span
              className={clsx(styles.segmented)}
              role="group"
              aria-label="Octave of the computer keys"
            >
              <button
                type="button"
                className={clsx(styles.button, styles.small)}
                onClick={() => shiftOctave(-1)}
                disabled={base <= LOWEST_BASE}
                aria-label="Computer keys one octave down"
              >
                − Oct
              </button>
              <button
                type="button"
                className={clsx(styles.button, styles.small)}
                onClick={() => shiftOctave(1)}
                disabled={base >= HIGHEST_BASE}
                aria-label="Computer keys one octave up"
              >
                + Oct
              </button>
            </span>
            {midi.status !== "unsupported" && (
              <button
                type="button"
                className={clsx(styles.button, styles.small)}
                onClick={() => void midi.connect()}
                disabled={midi.status === "connecting"}
                aria-pressed={midi.status === "on"}
                title={midi.inputs.join(", ") || undefined}
              >
                {midi.status === "on"
                  ? midi.inputs.length
                    ? `MIDI: ${midi.inputs[0]}${midi.inputs.length > 1 ? ` +${midi.inputs.length - 1}` : ""}`
                    : "MIDI: no keyboard found"
                  : midi.status === "denied"
                    ? "MIDI blocked"
                    : midi.status === "connecting"
                      ? "Connecting…"
                      : "Connect MIDI"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
