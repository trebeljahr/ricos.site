import clsx from "clsx";
import { type CSSProperties, type PointerEvent, type ReactNode, useMemo, useRef } from "react";
import { layoutKeys } from "src/lib/piano/keys";
import { noteName, pitchClass, pitchColor } from "src/lib/piano/notes";
import styles from "./piano.module.css";

export type KeyMark = {
  label?: ReactNode;
  /** Defaults to the key's pitch colour. */
  color?: string;
  ring?: boolean;
  /** An outline instead of a filled dot: a note left out or outside the key. */
  ghost?: boolean;
};

export type KeyboardProps = {
  from: number;
  to: number;
  /** Keys drawn pressed down. */
  down?: ReadonlySet<number>;
  marks?: Readonly<Record<number, KeyMark>>;
  /** Note names on every C ("c"), on every key ("all"), or none. */
  names?: "c" | "all" | "none";
  /** Computer-key letters to show on keys, by MIDI number. */
  hints?: Readonly<Record<number, string>>;
  onKeyDown?: (midi: number, velocity: number) => void;
  onKeyUp?: (midi: number) => void;
  short?: boolean;
  label?: string;
  className?: string;
  /** Called on any pointer or focus inside the keyboard. */
  onActivate?: () => void;
  tabIndex?: number;
};

/**
 * A piano keyboard you can press with a mouse, finger or several fingers, and
 * slide across. It draws what it is given (`down`, `marks`) and reports
 * presses; sound and state live in the caller.
 */
export function Keyboard({
  from,
  to,
  down,
  marks,
  names = "c",
  hints,
  onKeyDown,
  onKeyUp,
  short = false,
  label = "Piano keyboard",
  className,
  onActivate,
  tabIndex,
}: KeyboardProps) {
  const keys = useMemo(() => layoutKeys(from, to), [from, to]);
  const whites = keys.filter((key) => !key.black).length;
  const pointers = useRef(new Map<number, number>());
  const playable = Boolean(onKeyDown);

  const keyAt = (x: number, y: number) => {
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-midi]");
    return element ? Number(element.dataset.midi) : null;
  };

  const velocityAt = (target: HTMLElement | null, y: number) => {
    if (!target) return 0.72;
    const box = target.getBoundingClientRect();
    const depth = Math.min(1, Math.max(0, (y - box.top) / Math.max(1, box.height)));
    return 0.5 + 0.4 * depth;
  };

  const press = (event: PointerEvent<HTMLDivElement>) => {
    onActivate?.();
    if (!playable) return;
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const midi = keyAt(event.clientX, event.clientY);
    if (midi === null) return;
    pointers.current.set(event.pointerId, midi);
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-midi]");
    onKeyDown?.(midi, velocityAt(target ?? null, event.clientY));
  };

  const slide = (event: PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (previous === undefined) return;
    const midi = keyAt(event.clientX, event.clientY);
    if (midi === previous) return;
    onKeyUp?.(previous);
    if (midi === null) {
      pointers.current.set(event.pointerId, Number.NaN);
      return;
    }
    pointers.current.set(event.pointerId, midi);
    onKeyDown?.(midi, 0.68);
  };

  const release = (event: PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (previous === undefined) return;
    pointers.current.delete(event.pointerId);
    if (!Number.isNaN(previous)) onKeyUp?.(previous);
  };

  return (
    <div className={clsx(styles.case, "not-prose", className)}>
      <div
        className={clsx(styles.keys, short && styles.short)}
        style={{ "--whites": whites } as CSSProperties}
        role="group"
        aria-label={label}
        tabIndex={tabIndex}
        onPointerDown={press}
        onPointerMove={slide}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
        onFocus={onActivate}
        onContextMenu={(event) => event.preventDefault()}
      >
        {keys.map(({ midi, black, left, width }) => {
          const mark = marks?.[midi];
          const pc = pitchClass(midi);
          const isDown = down?.has(midi) ?? false;
          const name =
            names === "all" || (names === "c" && pc === 0 && !black)
              ? noteName(midi, { octave: pc === 0 || names === "c" })
              : null;
          return (
            <div
              key={midi}
              data-midi={midi}
              role={playable ? "button" : undefined}
              aria-label={playable ? noteName(midi) : undefined}
              aria-pressed={playable ? isDown : undefined}
              className={clsx(
                styles.key,
                black ? styles.black : styles.white,
                isDown && styles.down,
              )}
              style={
                {
                  left: `${left * 100}%`,
                  width: `${width * 100}%`,
                  "--key-color": pitchColor(pc, 0.72, 0.17),
                  cursor: playable ? "pointer" : "default",
                } as CSSProperties
              }
            >
              {mark && (
                <span
                  className={clsx(
                    styles.mark,
                    mark.ring && styles.markRing,
                    mark.ghost && styles.markGhost,
                  )}
                  style={
                    { "--mark-color": mark.color ?? pitchColor(pc, 0.6, 0.17) } as CSSProperties
                  }
                >
                  {mark.label}
                </span>
              )}
              {hints?.[midi] && <span className={styles.hint}>{hints[midi]}</span>}
              {name && !black && <span className={styles.keyLabel}>{name}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
