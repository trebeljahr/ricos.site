import clsx from "clsx";
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { Voice } from "src/lib/piano/audio";
import { playPiano, playPianoChord } from "src/lib/piano/sampler";
import { type Key, keyName, keyOn, MODES, type Mode } from "src/lib/piano/scales";
import styles from "./piano.module.css";

type Option = { value: string; label: string; group?: string };

/**
 * A pick-one list in the demos' own look: a pill that opens a panel of
 * choices, grouped when the options carry a `group`.
 */
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
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);
  const groups = [...new Set(options.map((o) => o.group))];

  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
    root.current?.querySelector<HTMLElement>("button")?.focus();
  };

  const onListKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(list.current?.querySelectorAll<HTMLElement>("[role=option]") ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const move = (to: number) => {
      event.preventDefault();
      items[(to + items.length) % items.length]?.focus();
    };
    if (event.key === "ArrowRight" || event.key === "ArrowDown") move(at + 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") move(at - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(items.length - 1);
    else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      root.current?.querySelector<HTMLElement>("button")?.focus();
    }
  };

  return (
    <div ref={root} className={clsx("relative flex min-w-0 flex-col", className)}>
      <span id={id} className={clsx(styles.muted, "text-xs")}>
        {label}
      </span>
      <button
        type="button"
        className={styles.pickerButton}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={id}
        onClick={() => setOpen((o) => !o)}
      >
        {current?.label ?? value}
        <span aria-hidden className={styles.pickerCaret}>
          ▾
        </span>
      </button>
      {open && (
        <div
          ref={list}
          role="listbox"
          aria-labelledby={id}
          className={styles.pickerPanel}
          onKeyDown={onListKey}
        >
          {groups.map((group) => (
            <div key={group ?? ""} className={styles.pickerGroup}>
              {group && groups.length > 1 && (
                <div className={clsx(styles.muted, "text-xs")}>{group}</div>
              )}
              <div className={styles.pickerGrid}>
                {options
                  .filter((o) => o.group === group)
                  .map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      role="option"
                      aria-selected={o.value === value}
                      tabIndex={o.value === value ? 0 : -1}
                      className={styles.pickerOption}
                      onClick={() => choose(o.value)}
                    >
                      {o.label}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A switch between two or more modes: a track with a sliding thumb, one of the
 * options always on. For settings that can each be on or off, use
 * `PianoCheck` instead.
 */
export function PianoSwitch<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const at = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = options[(at + step + options.length) % options.length];
    onChange(next.value);
    event.currentTarget.querySelector<HTMLElement>(`[data-value="${next.value}"]`)?.focus();
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={clsx(styles.switch, className)}
      style={{ "--count": options.length, "--at": at } as CSSProperties}
      onKeyDown={onKey}
    >
      <span aria-hidden className={styles.switchThumb} />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          data-value={o.value}
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          className={styles.switchOption}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** One setting that is on or off on its own, drawn as a small switch with its label. */
export function PianoCheck({
  label,
  checked,
  onChange,
  color,
  disabled,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** The colour of the switch when on, e.g. a chord tone's role colour. */
  color?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={styles.check}
      style={color ? ({ "--check-color": color } as CSSProperties) : undefined}
      onClick={() => onChange(!checked)}
    >
      <span aria-hidden className={styles.checkTrack}>
        <span className={styles.checkKnob} />
      </span>
      {label}
    </button>
  );
}

/** "Play together" or "Play one by one": the switch several demos share. */
export type PlayStyle = "together" | "apart";
export const PLAY_STYLES = [
  { value: "together", label: "Together" },
  { value: "apart", label: "One by one" },
] as const satisfies readonly { value: PlayStyle; label: string }[];

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
 * Plays chords and runs of notes on the sampled piano. A new one cuts off the
 * one before, notes not yet struck included, so quick clicks never overlap.
 * `sounding` holds the keys of the run being played right now, for a demo to
 * draw on its keyboard.
 */
export function usePianoPlayer() {
  const voice = useRef<Voice | null>(null);
  const timers = useRef<number[]>([]);
  const [sounding, setSounding] = useState<ReadonlySet<number>>(new Set());

  const stop = useCallback(() => {
    voice.current?.stop();
    voice.current = null;
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
    setSounding(new Set());
  }, []);
  useEffect(() => stop, [stop]);

  /** Shows `steps[i]` from `i * gap` seconds on, and nothing once `total` seconds are over. */
  const track = useCallback((steps: number[][], gap: number, total: number) => {
    steps.forEach((keys, i) => {
      timers.current.push(window.setTimeout(() => setSounding(new Set(keys)), i * gap * 1000));
    });
    timers.current.push(window.setTimeout(() => setSounding(new Set()), total * 1000));
  }, []);

  /** Several keys at once, or one after another with `spread` seconds between them. */
  const play = useCallback(
    (keys: number[], options: PlayOptions = {}) => {
      stop();
      const all = { spread: 0.02, velocity: 0.62, duration: 1.6, ...options };
      voice.current = playPianoChord(keys, all);
      const apart = all.spread >= 0.1;
      track(
        apart ? keys.map((k) => [k]) : [keys],
        all.spread,
        all.duration + (keys.length - 1) * all.spread,
      );
    },
    [stop, track],
  );

  /** Chords one after another, `gap` seconds apart. */
  const playChords = useCallback(
    (chords: number[][], gap = 0.7, velocity = 0.6) => {
      stop();
      const voices = chords.flatMap((chord, i) =>
        chord.map((midi) => playPiano(midi, { velocity, delay: i * gap, duration: gap * 0.95 })),
      );
      voice.current = {
        stop: () => {
          for (const v of voices) v.stop();
        },
      };
      track(chords, gap, chords.length * gap);
    },
    [stop, track],
  );

  return { play, playChords, stop, sounding };
}
