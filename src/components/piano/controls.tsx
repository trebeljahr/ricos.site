import clsx from "clsx";
import { useCallback, useEffect, useId, useRef } from "react";
import type { Voice } from "src/lib/piano/audio";
import { playPiano, playPianoChord } from "src/lib/piano/sampler";
import { type Key, keyName, keyOn, MODES, type Mode } from "src/lib/piano/scales";
import styles from "./piano.module.css";

type Option = { value: string; label: string; group?: string };

/** A native select dressed like the demo buttons, with a short label above it. */
export function PianoSelect({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  className?: string;
}) {
  const id = useId();
  const groups = [...new Set(options.map((o) => o.group))];
  const render = (list: Option[]) =>
    list.map((o) => (
      <option key={o.value} value={o.value}>
        {o.label}
      </option>
    ));
  return (
    <div className={clsx("flex min-w-0 flex-col", className)}>
      <label htmlFor={id} className={clsx(styles.muted, "text-xs")}>
        {label}
      </label>
      <span className={styles.selectWrap}>
        <select
          id={id}
          className={styles.select}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {groups.length > 1
            ? groups.map((group) => (
                <optgroup key={group} label={group}>
                  {render(options.filter((o) => o.group === group))}
                </optgroup>
              ))
            : render(options)}
        </select>
      </span>
    </div>
  );
}

const keyValue = (key: Key) => `${MODES.indexOf(key.mode)}:${key.tonicPc}`;

/** Picks a key: any of the twelve tonics, in each of the given modes. */
export function KeyPicker({
  value,
  modes,
  onChange,
  label = "key",
}: {
  value: Key;
  modes: Mode[];
  onChange: (key: Key) => void;
  label?: string;
}) {
  const options = modes.flatMap((mode) =>
    Array.from({ length: 12 }, (_, pc) => {
      const key = keyOn(pc, mode);
      return { value: keyValue(key), label: keyName(key), group: mode.alias ?? mode.name };
    }),
  );
  return (
    <PianoSelect
      label={label}
      value={keyValue(keyOn(value.tonicPc, value.mode))}
      options={options}
      onChange={(v) => {
        const [mode, pc] = v.split(":").map(Number);
        onChange(keyOn(pc, MODES[mode]));
      }}
    />
  );
}

type PlayOptions = { spread?: number; velocity?: number; duration?: number };

/**
 * Plays chords and runs of notes on the sampled piano; a new one cuts off the
 * one before, so quick clicks do not pile up into a smear.
 */
export function usePianoPlayer() {
  const voice = useRef<Voice | null>(null);
  useEffect(() => () => voice.current?.stop(), []);

  /** Several keys at once, or one after another with `spread` seconds between them. */
  const play = useCallback((keys: number[], options: PlayOptions = {}) => {
    voice.current?.stop();
    voice.current = playPianoChord(keys, { spread: 0.02, velocity: 0.62, ...options });
  }, []);

  /** Chords one after another, `gap` seconds apart. */
  const playChords = useCallback((chords: number[][], gap = 0.7, velocity = 0.6) => {
    voice.current?.stop();
    const voices = chords.flatMap((chord, i) =>
      chord.map((midi) => playPiano(midi, { velocity, delay: i * gap, duration: gap * 0.95 })),
    );
    voice.current = {
      stop: () => {
        for (const v of voices) v.stop();
      },
    };
  }, []);

  return { play, playChords };
}
