import clsx from "clsx";
import { useState } from "react";
import { stepWhite, whiteAtOrBelow } from "src/lib/piano/keys";
import { roleColor } from "src/lib/piano/notes";
import {
  atOrAbove,
  changedDegrees,
  degreeLabels,
  type Key,
  keyFromFifths,
  keyName,
  keyOn,
  MAJOR,
  MAJOR_SCALE,
  MODES_BRIGHT_TO_DARK,
  type Mode,
  modeOn,
  modeScale,
  modeSteps,
  type ScaleNote,
  scaleNotes,
} from "src/lib/piano/scales";
import { PianoSelect, usePianoPlayer } from "./controls";
import type { KeyMark } from "./Keyboard";
import { PlayablePiano } from "./PlayablePiano";
import styles from "./piano.module.css";

const NAME_W = 86;
const X0 = 92;
const CELL = 18;
const ROW = 26;
const WIDTH = X0 + 13 * CELL + 4;
const STRIP_Y = 7 * ROW + 10;
const HEIGHT = STRIP_Y + 24;
const centre = (k: number) => X0 + k * CELL + CELL / 2;

/** Seconds between the notes of a run. */
const GAP = 0.18;

/** Half steps each degree is moved against the major scale: −1 lowered, +1 raised. */
const shifts = (mode: Mode) => modeScale(mode).map((s, i) => s - MAJOR_SCALE[i]);

/**
 * The seven modes on one tonic, brightest to darkest: each is the major scale
 * on that tonic with some of its notes moved by a half step.
 */
export function ModeRotator() {
  const [tonicPc, setTonicPc] = useState(0);
  const [index, setIndex] = useState(1); // Ionian
  const [previous, setPrevious] = useState<number | null>(null);
  const { playChords, sounding } = usePianoPlayer();

  const mode = MODES_BRIGHT_TO_DARK[index];
  const key = modeOn(tonicPc, mode);
  const tonic = atOrAbove(tonicPc, 60);
  const notes = scaleNotes(key, tonic);
  const before = previous === null ? null : MODES_BRIGHT_TO_DARK[previous];
  const changed = before ? changedDegrees(before, mode) : [];
  const parent = keyFromFifths(key.fifths, MAJOR);
  const major = keyOn(tonicPc, MAJOR, { flats: key.fifths < 0 });
  const majorNotes = scaleNotes(major, tonic);
  const moved = shifts(mode).flatMap((shift, d) => (shift ? [d] : []));
  const from = stepWhite(whiteAtOrBelow(tonic), -1);
  const to = stepWhite(from, 10);

  const run = (k: Key) => {
    const scale = scaleNotes(k, tonic);
    playChords(
      [...scale.map((n) => n.midi), tonic + 12].map((m) => [m]),
      GAP,
    );
  };

  const select = (i: number) => {
    if (i !== index) {
      setPrevious(index);
      setIndex(i);
    }
    run(modeOn(tonicPc, MODES_BRIGHT_TO_DARK[i]));
  };

  // The major scale's note, ghosted, where the mode moved it away.
  const marks: Record<number, KeyMark> = {};
  for (const d of moved) {
    const old = tonic + MAJOR_SCALE[d];
    marks[old] = { label: String(d + 1), ghost: true, color: roleColor(MAJOR_SCALE[d]) };
  }
  for (const n of [...notes, { ...notes[0], midi: tonic + 12 }]) {
    marks[n.midi] = {
      label: n.midi === tonic + 12 ? "1" : n.label,
      ring: n.degree === 0 || moved.includes(n.degree),
      color: roleColor(n.midi - tonic),
    };
  }

  const tonicOptions = Array.from({ length: 12 }, (_, pc) => ({
    value: String(pc),
    label: keyOn(pc).tonic,
  }));

  return (
    <section className={clsx(styles.panel, "not-prose")} aria-label="Modes from bright to dark">
      <div className="flex flex-wrap items-end justify-between gap-tight">
        <PianoSelect
          label="tonic"
          value={String(tonicPc)}
          options={tonicOptions}
          onChange={(v) => {
            setTonicPc(Number(v));
            setPrevious(null);
            run(modeOn(Number(v), mode));
          }}
        />
        <button
          type="button"
          className={clsx(styles.button, styles.primary)}
          onClick={() => run(key)}
        >
          Play
        </button>
      </div>

      <div className="mt-para min-w-0">
        <p className="text-3xl font-semibold tracking-tight sm:text-4xl" aria-live="polite">
          {keyName(key)}
        </p>
        <p className={clsx(styles.mono, "mt-hair text-sm")}>
          {notes.map((n) => n.spelled).join(" ")}
        </p>
        <dl className="mt-label grid grid-cols-2 gap-label sm:grid-cols-3">
          <div className={clsx(styles.readout, styles.wordy)}>
            <dt>{`moved from ${keyName(major)}`}</dt>
            <dd>{moved.length ? moved.map((d) => notes[d].label).join(" ") : "—"}</dd>
          </div>
          <div className={clsx(styles.readout, styles.wordy)}>
            <dt>same notes as</dt>
            <dd>{keyName(parent)}</dd>
          </div>
          <div className={clsx(styles.readout, styles.wordy)}>
            <dt>{before ? `changed from ${before.name}` : "changed"}</dt>
            <dd>
              {before && changed.length
                ? changed.map((d) => `${degreeLabels(before)[d]}→${notes[d].label}`).join(" ")
                : "—"}
            </dd>
          </div>
        </dl>
      </div>

      <FromMajor
        className="mt-para"
        major={major}
        mode={mode}
        notes={notes}
        majorNotes={majorNotes}
      />

      <ModeGrid index={index} notes={notes} onSelect={select} />

      <PlayablePiano
        className="mt-para"
        range={[from, to]}
        marks={marks}
        down={sounding}
        short
        bar={false}
      />
    </section>
  );
}

const TOP_Y = 14;
const BOTTOM_Y = 62;
const FROM_HEIGHT = BOTTOM_Y + 14;

/**
 * The major scale on the tonic above the chosen mode, column for column: an
 * arrow from each note the mode moves to where it lands, ♭ for down a half
 * step, ♯ for up.
 */
function FromMajor({
  major,
  mode,
  notes,
  majorNotes,
  className,
}: {
  major: Key;
  mode: Mode;
  notes: ScaleNote[];
  majorNotes: ScaleNote[];
  className?: string;
}) {
  const semis = [...modeScale(mode), 12];
  const majorSemis = [...MAJOR_SCALE, 12];
  const shift = [...shifts(mode), 0];
  const dot = (k: number, y: number, label: string, spelled: string) => (
    <g key={`${y}-${k}`}>
      <circle cx={centre(k)} cy={y} r={8} fill={roleColor(k)} />
      <text
        x={centre(k)}
        y={y + 3}
        textAnchor="middle"
        style={{ fontSize: 8, fontWeight: 700, fill: "#fff" }}
      >
        {label}
      </text>
      <title>{spelled}</title>
    </g>
  );
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${FROM_HEIGHT}`}
      className={clsx(styles.svg, "mx-auto max-w-[480px]", className)}
      role="img"
      aria-label={`${major.tonic} major to ${mode.name}: ${
        shift
          .slice(0, 7)
          .flatMap((s, d) => (s ? [notes[d].label] : []))
          .join(", ") || "no notes moved"
      }`}
    >
      <text
        x={NAME_W - 4}
        y={TOP_Y + 4}
        textAnchor="end"
        style={{ fontSize: 12, fill: "var(--muted)" }}
      >
        {`${major.tonic} major`}
      </text>
      <text
        x={NAME_W - 4}
        y={BOTTOM_Y + 4}
        textAnchor="end"
        style={{ fontSize: 12, fontWeight: 700 }}
      >
        {mode.name}
      </text>
      {majorSemis.map((k, d) => {
        const target = semis[d];
        const moved = shift[d] !== 0;
        const x1 = centre(k);
        const x2 = centre(target);
        const y1 = TOP_Y + 10;
        const y2 = BOTTOM_Y - 11;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const head = (turn: number) =>
          `${x2 - 6 * Math.cos(angle + turn)},${y2 - 6 * Math.sin(angle + turn)}`;
        return (
          <g key={k}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={moved ? "var(--accent)" : "var(--line)"}
              strokeWidth={moved ? 2 : 1}
            />
            {moved && (
              <>
                <polygon points={`${x2},${y2} ${head(0.45)} ${head(-0.45)}`} fill="var(--accent)" />
                <text
                  x={(x1 + x2) / 2 + (shift[d] < 0 ? -9 : 9)}
                  y={(y1 + y2) / 2 + 4}
                  textAnchor="middle"
                  style={{ fontSize: 13, fontWeight: 700, fill: "var(--accent)" }}
                >
                  {shift[d] < 0 ? "♭" : "♯"}
                </text>
              </>
            )}
          </g>
        );
      })}
      {majorSemis.map((k, d) =>
        dot(k, TOP_Y, d === 7 ? "1" : String(d + 1), majorNotes[d % 7].spelled),
      )}
      {semis.map((k, d) => dot(k, BOTTOM_Y, d === 7 ? "1" : notes[d].label, notes[d % 7].spelled))}
    </svg>
  );
}

/**
 * One row per mode, one column per half step above the tonic: a dot where the
 * mode has a note. Under the chosen mode, its whole and half steps.
 */
function ModeGrid({
  index,
  notes,
  onSelect,
}: {
  index: number;
  notes: ScaleNote[];
  onSelect: (i: number) => void;
}) {
  const current = MODES_BRIGHT_TO_DARK[index];
  const semis = modeScale(current);
  const steps = modeSteps(current);
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={clsx(styles.svg, "mx-auto mt-para max-w-[480px]")}
      role="group"
      aria-label="Modes, brightest first"
    >
      {MODES_BRIGHT_TO_DARK.map((m, r) => {
        const y = r * ROW + ROW / 2;
        const isCurrent = r === index;
        const scale = [...modeScale(m), 12];
        return (
          // biome-ignore lint/a11y/useSemanticElements: an SVG row cannot be a <button>
          <g
            key={m.name}
            role="button"
            tabIndex={0}
            aria-label={m.name}
            aria-pressed={isCurrent}
            onClick={() => onSelect(r)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(r);
              }
            }}
            style={{ cursor: "pointer", outline: "none" }}
            className={styles.svgRow}
          >
            <rect
              x={0}
              y={r * ROW + 1}
              width={WIDTH}
              height={ROW - 2}
              rx={8}
              fill={isCurrent ? "var(--track)" : "transparent"}
              stroke={isCurrent ? "var(--accent)" : "none"}
              strokeWidth={1.5}
            />
            <text
              x={NAME_W - 4}
              y={y + 4}
              textAnchor="end"
              style={{
                fontSize: 12,
                fontWeight: isCurrent ? 700 : 500,
                fill: isCurrent ? "var(--ink)" : "var(--muted)",
              }}
            >
              {m.name}
            </text>
            {Array.from({ length: 13 }, (_, k) => (
              <circle
                // biome-ignore lint/suspicious/noArrayIndexKey: one cell per half step
                key={k}
                cx={centre(k)}
                cy={y}
                r={1.5}
                fill="var(--line)"
              />
            ))}
            {scale.map((k, d) =>
              isCurrent ? null : (
                <circle
                  key={k}
                  cx={centre(k)}
                  cy={y}
                  r={4}
                  fill="var(--muted)"
                  opacity={d === 0 || d === 7 ? 0.6 : 0.4}
                />
              ),
            )}
          </g>
        );
      })}

      {/* The chosen mode: dots in the colour of each degree. */}
      {[...semis, 12].map((k, d) => {
        const y = index * ROW + ROW / 2;
        const n = notes[d % 7];
        return (
          <g key={k} pointerEvents="none">
            <circle cx={centre(k)} cy={y} r={8} fill={roleColor(k)} />
            <text
              x={centre(k)}
              y={y + 3}
              textAnchor="middle"
              style={{ fontSize: 8, fontWeight: 700, fill: "#fff" }}
            >
              {d === 7 ? "1" : n.label}
            </text>
          </g>
        );
      })}

      {steps.map((step, i) => {
        const x = centre(semis[i]) + 1.5;
        const w = step * CELL - 3;
        return (
          <g key={`${i}-${step}`}>
            <rect
              x={x}
              y={STRIP_Y}
              width={w}
              height={18}
              rx={4}
              fill={step === 1 ? "var(--accent)" : "var(--track)"}
              stroke="var(--line)"
            />
            <text
              x={x + w / 2}
              y={STRIP_Y + 13}
              textAnchor="middle"
              style={{
                fontSize: 11,
                fontWeight: 700,
                fill: step === 1 ? "var(--accent-ink)" : "var(--ink)",
              }}
            >
              {step === 1 ? "H" : "W"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
