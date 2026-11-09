import clsx from "clsx";
import { type CSSProperties, useState } from "react";
import { stepWhite, whiteAtOrBelow } from "src/lib/piano/keys";
import { pitchClass, pitchColor } from "src/lib/piano/notes";
import {
  atOrAbove,
  bluesScale,
  type Key,
  keyName,
  keyOn,
  MINOR,
  pentatonic,
  relativeKey,
  type ScaleNote,
  scaleNotes,
  stepSizes,
} from "src/lib/piano/scales";
import { PianoSelect, usePianoPlayer } from "./controls";
import type { KeyMark } from "./Keyboard";
import { PlayablePiano } from "./PlayablePiano";
import styles from "./piano.module.css";

type Shape = "scale" | "pentatonic" | "blues";
const SHAPES: { id: Shape; label: string }[] = [
  { id: "scale", label: "7 notes" },
  { id: "pentatonic", label: "Pentatonic" },
  { id: "blues", label: "Blues" },
];
const SHAPE_NAMES: Record<Shape, string> = {
  scale: "",
  pentatonic: " pentatonic",
  blues: " blues",
};
export const BLUE_NOTE = "oklch(0.56 0.18 258)";

/**
 * A major scale, the five of its notes without half steps, the same five from
 * the relative minor, and the blue note added on top.
 */
export function PentatonicBlues() {
  const [key, setKey] = useState<Key>(() => keyOn(0));
  const [shape, setShape] = useState<Shape>("scale");
  const { play } = usePianoPlayer();

  const major = key.mode === MINOR ? relativeKey(key) : key;
  const minor = relativeKey(major);
  // The major tonic sits in A3–G♯4 and its relative minor a minor third
  // lower, so switching between them keeps the same keys on screen.
  const majorTonic = atOrAbove(major.tonicPc, 57);
  const tonicOf = (k: Key) => (k.mode === MINOR ? majorTonic - 3 : majorTonic);
  const notesOf = (k: Key, s: Shape) =>
    s === "scale"
      ? scaleNotes(k, tonicOf(k))
      : s === "pentatonic"
        ? pentatonic(k, tonicOf(k))
        : bluesScale(k, tonicOf(k));

  const tonic = tonicOf(key);
  const active = notesOf(key, shape);
  const activePcs = new Set(active.map((n) => n.pc));
  const leftOut =
    shape === "scale" ? [] : scaleNotes(key, tonic).filter((n) => !activePcs.has(n.pc));
  const from = whiteAtOrBelow(majorTonic - 3);
  const to = stepWhite(from, 14);

  const run = (notes: ScaleNote[]) =>
    play([...notes.map((n) => n.midi), notes[0].midi + 12], { spread: 0.17, duration: 0.5 });

  const update = (k: Key, s: Shape) => {
    setKey(k);
    setShape(s);
    run(notesOf(k, s));
  };

  const colorOf = (note: ScaleNote, lightness = 0.62) =>
    note.blue ? BLUE_NOTE : pitchColor(note.pc, lightness, 0.16);

  const marks: Record<number, KeyMark> = {};
  for (let m = from; m <= to; m++) {
    const pc = pitchClass(m);
    const note = active.find((n) => n.pc === pc);
    const left = leftOut.find((n) => n.pc === pc);
    if (note) marks[m] = { label: note.label, ring: pc === key.tonicPc, color: colorOf(note) };
    else if (left) marks[m] = { label: left.label, ghost: true, color: colorOf(left) };
  }

  return (
    <section className={clsx(styles.panel, "not-prose")} aria-label="Pentatonic and blues scales">
      <div className="flex flex-wrap items-end gap-tight">
        <PianoSelect
          label="keys"
          value={String(major.tonicPc)}
          options={Array.from({ length: 12 }, (_, pc) => ({
            value: String(pc),
            label: `${keyName(keyOn(pc))} / ${keyName(relativeKey(keyOn(pc)))}`,
          }))}
          onChange={(v) => {
            const next = keyOn(Number(v));
            update(key.mode === MINOR ? relativeKey(next) : next, shape);
          }}
        />
        <span className={styles.segmented} role="group" aria-label="Major or relative minor">
          {[major, minor].map((k) => (
            <button
              key={k.mode.name}
              type="button"
              className={styles.button}
              aria-pressed={k.mode === key.mode}
              onClick={() => update(k, shape)}
            >
              {keyName(k)}
            </button>
          ))}
        </span>
        <span className={styles.segmented} role="group" aria-label="Notes">
          {SHAPES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={styles.button}
              aria-pressed={s.id === shape}
              onClick={() => update(key, s.id)}
            >
              {s.label}
            </button>
          ))}
        </span>
      </div>

      <div className="mt-para flex flex-wrap items-end justify-between gap-tight">
        <div className="min-w-0">
          <p className="text-3xl font-semibold tracking-tight sm:text-4xl" aria-live="polite">
            {keyName(key)}
            {SHAPE_NAMES[shape]}
          </p>
          <p className={clsx(styles.mono, "mt-hair text-sm")}>
            {active.map((n) => n.spelled).join(" · ")}
          </p>
        </div>
        <button
          type="button"
          className={clsx(styles.button, styles.primary)}
          onClick={() => run(active)}
        >
          Play
        </button>
      </div>

      <ChromaticStrip tonic={tonic} active={active} leftOut={leftOut} colorOf={colorOf} />

      <PlayablePiano className="mt-para" range={[from, to]} marks={marks} short bar={false} />
    </section>
  );
}

/** Twelve half steps from the tonic to its octave: which are in the scale, and the steps between. */
function ChromaticStrip({
  tonic,
  active,
  leftOut,
  colorOf,
}: {
  tonic: number;
  active: ScaleNote[];
  leftOut: ScaleNote[];
  colorOf: (note: ScaleNote, lightness?: number) => string;
}) {
  const steps = stepSizes(active);
  const at = (k: number) => {
    const pc = pitchClass(tonic + k);
    return {
      note: active.find((n) => n.pc === pc),
      left: leftOut.find((n) => n.pc === pc),
    };
  };
  return (
    <div className="mt-para" aria-hidden="true">
      <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-[3px]">
        {Array.from({ length: 13 }, (_, k) => {
          const { note, left } = at(k);
          const shown = note ?? left;
          return (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: one cell per half step
              key={k}
              className={clsx(styles.stripCell, note && styles.stripOn, left && styles.stripLeft)}
              style={shown ? ({ "--cell-color": colorOf(shown) } as CSSProperties) : undefined}
            >
              {shown && (
                <>
                  <span className="font-semibold">{shown.spelled}</span>
                  <span className="opacity-80">{k === 12 ? "1" : shown.label}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-hair grid grid-cols-[repeat(26,minmax(0,1fr))]">
        {active.map((note, i) => {
          const start = note.midi - tonic;
          return (
            <span
              key={note.midi}
              className={clsx(styles.mono, styles.muted, "text-center text-xs")}
              style={{ gridColumn: `${2 * start + 2} / span ${2 * steps[i]}` }}
            >
              {steps[i]}
            </span>
          );
        })}
      </div>
    </div>
  );
}
