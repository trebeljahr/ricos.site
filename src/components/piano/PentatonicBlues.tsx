import clsx from "clsx";
import { type CSSProperties, useState } from "react";
import { pitchClass, roleColor } from "src/lib/piano/notes";
import {
  atOrAbove,
  bluesScale,
  type Key,
  keyName,
  keyOn,
  MAJOR,
  MINOR,
  pentatonic,
  relativeKey,
  type ScaleNote,
  scaleNotes,
  stepSizes,
} from "src/lib/piano/scales";
import { PianoSelect, PianoSwitch, usePianoPlayer } from "./controls";
import type { KeyMark } from "./Keyboard";
import { PlayablePiano } from "./PlayablePiano";
import styles from "./piano.module.css";

type Shape = "scale" | "pentatonic" | "blues";
const SHAPES = [
  { value: "scale", label: "7 notes" },
  { value: "pentatonic", label: "Pentatonic" },
  { value: "blues", label: "Blues" },
] as const satisfies readonly { value: Shape; label: string }[];
const SHAPE_NAMES: Record<Shape, string> = {
  scale: "",
  pentatonic: " pentatonic",
  blues: " blues",
};
export const BLUE_NOTE = "oklch(0.56 0.18 258)";

/** E3–G5: room for any major tonic from G3 and its relative minor below it. */
const RANGE: [number, number] = [52, 79];
/** A picked major key's tonic sits in G3–F♯4, its relative minor a minor third lower. */
const MAJOR_LOW = 55;
/** Seconds between the notes of a run. */
const GAP = 0.2;

const notesOf = (key: Key, tonic: number, shape: Shape) =>
  shape === "scale"
    ? scaleNotes(key, tonic)
    : shape === "pentatonic"
      ? pentatonic(key, tonic)
      : bluesScale(key, tonic);

/**
 * A major scale, the five of its notes without half steps, the same five from
 * the relative minor, and the blue note added on top.
 */
export function PentatonicBlues() {
  const [tonic, setTonic] = useState(60);
  const [minor, setMinor] = useState(false);
  const [shape, setShape] = useState<Shape>("scale");
  const { playChords, sounding } = usePianoPlayer();

  const mode = minor ? MINOR : MAJOR;
  const key = keyOn(pitchClass(tonic), mode);
  const majorKey = minor ? relativeKey(key) : key;
  const minorKey = minor ? key : relativeKey(key);
  const active = notesOf(key, tonic, shape);
  const activePcs = new Set(active.map((n) => n.pc));
  const leftOut =
    shape === "scale" ? [] : scaleNotes(key, tonic).filter((n) => !activePcs.has(n.pc));

  /** Up to the octave once, then back down to the tonic, one note at a time. */
  const run = (notes: ScaleNote[]) => {
    const up = [...notes.map((n) => n.midi), notes[0].midi + 12];
    const there = [...up, ...up.slice(0, -1).reverse()];
    playChords(
      there.map((m) => [m]),
      GAP,
    );
  };

  const update = (next: { tonic?: number; minor?: boolean; shape?: Shape }) => {
    const t = next.tonic ?? tonic;
    const m = next.minor ?? minor;
    const s = next.shape ?? shape;
    setTonic(t);
    setMinor(m);
    setShape(s);
    run(notesOf(keyOn(pitchClass(t), m ? MINOR : MAJOR), t, s));
  };

  const colorOf = (note: ScaleNote) => (note.blue ? BLUE_NOTE : roleColor(note.midi - tonic));

  // Only the scale itself, tonic to octave: no copies of its notes to either side.
  const marks: Record<number, KeyMark> = {};
  for (const note of leftOut)
    marks[note.midi] = { label: note.label, ghost: true, color: colorOf(note) };
  for (const note of active)
    marks[note.midi] = { label: note.label, ring: note.degree === 0, color: colorOf(note) };
  marks[tonic + 12] = { label: "1", ring: true, color: roleColor(0) };

  return (
    <section className={clsx(styles.panel, "not-prose")} aria-label="Pentatonic and blues scales">
      <div className="flex flex-wrap items-end gap-tight">
        <PianoSelect
          label="keys"
          value={String(majorKey.tonicPc)}
          options={Array.from({ length: 12 }, (_, pc) => ({
            value: String(pc),
            label: `${keyName(keyOn(pc))} / ${keyName(relativeKey(keyOn(pc)))}`,
          }))}
          onChange={(v) => {
            const majorTonic = atOrAbove(Number(v), MAJOR_LOW);
            update({ tonic: minor ? majorTonic - 3 : majorTonic });
          }}
        />
        <PianoSwitch
          label="Major or relative minor"
          value={minor ? "minor" : "major"}
          options={[
            { value: "major", label: keyName(majorKey) },
            { value: "minor", label: keyName(minorKey) },
          ]}
          onChange={(v) => {
            if ((v === "minor") === minor) return;
            update({ minor: v === "minor", tonic: v === "minor" ? tonic - 3 : tonic + 3 });
          }}
        />
        <PianoSwitch
          label="Notes"
          value={shape}
          options={SHAPES}
          onChange={(s) => update({ shape: s })}
        />
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

      <PlayablePiano
        className="mt-para"
        range={RANGE}
        marks={marks}
        down={sounding}
        sound={false}
        onNoteOn={(m) => update({ tonic: m })}
        short
        bar={false}
      />
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
  colorOf: (note: ScaleNote) => string;
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
