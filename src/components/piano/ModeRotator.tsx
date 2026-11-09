import clsx from "clsx";
import { useState } from "react";
import { stepWhite, whiteAtOrBelow } from "src/lib/piano/keys";
import { pitchClass, pitchColor } from "src/lib/piano/notes";
import {
  atOrAbove,
  changedDegrees,
  degreeLabels,
  type Key,
  keyFromFifths,
  keyName,
  keyOn,
  MAJOR,
  MODES_BRIGHT_TO_DARK,
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

/**
 * The seven modes on one tonic, brightest to darkest: each step down lowers
 * one note by a half step.
 */
export function ModeRotator() {
  const [tonicPc, setTonicPc] = useState(0);
  const [index, setIndex] = useState(1); // Ionian
  const [previous, setPrevious] = useState<number | null>(null);
  const { play } = usePianoPlayer();

  const mode = MODES_BRIGHT_TO_DARK[index];
  const key = modeOn(tonicPc, mode);
  const tonic = atOrAbove(tonicPc, 60);
  const notes = scaleNotes(key, tonic);
  const before = previous === null ? null : MODES_BRIGHT_TO_DARK[previous];
  const changed = before ? changedDegrees(before, mode) : [];
  const parent = keyFromFifths(key.fifths, MAJOR);
  const from = stepWhite(whiteAtOrBelow(tonic), -1);
  const to = stepWhite(from, 10);

  const run = (k: Key) => {
    const scale = scaleNotes(k, tonic);
    play([...scale.map((n) => n.midi), tonic + 12], { spread: 0.16, duration: 0.45 });
  };

  const select = (i: number) => {
    const next = Math.min(6, Math.max(0, i));
    if (next !== index) {
      setPrevious(index);
      setIndex(next);
    }
    run(modeOn(tonicPc, MODES_BRIGHT_TO_DARK[next]));
  };

  const marks: Record<number, KeyMark> = {};
  if (before) {
    for (const d of changed) {
      const old = tonic + modeScale(before)[d];
      marks[old] = {
        label: degreeLabels(before)[d],
        ghost: true,
        color: pitchColor(pitchClass(old), 0.6, 0.16),
      };
    }
  }
  for (const n of [...notes, { ...notes[0], midi: tonic + 12 }]) {
    marks[n.midi] = { label: n.label, ring: n.degree === 0 || changed.includes(n.degree) };
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
        <div className="flex flex-wrap gap-tight">
          <button
            type="button"
            className={styles.button}
            onClick={() => select(index - 1)}
            disabled={index === 0}
          >
            ◀ Brighter
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => select(index + 1)}
            disabled={index === 6}
          >
            Darker ▶
          </button>
        </div>
      </div>

      <div className="mt-para grid gap-para md:grid-cols-[minmax(0,1fr)_minmax(0,15rem)] md:items-start">
        <ModeGrid index={index} before={before} changed={changed} notes={notes} onSelect={select} />
        <div className="min-w-0">
          <p className="text-3xl font-semibold tracking-tight sm:text-4xl" aria-live="polite">
            {keyName(key)}
          </p>
          <p className={clsx(styles.mono, "mt-hair text-sm")}>
            {notes.map((n) => n.label).join(" ")}
          </p>
          <p className={clsx(styles.mono, "text-sm")}>{notes.map((n) => n.spelled).join(" ")}</p>
          <dl className="mt-label grid grid-cols-2 gap-label">
            <div className={clsx(styles.readout, styles.wordy)}>
              <dt>same notes as</dt>
              <dd>{keyName(parent)}</dd>
            </div>
            <div className={clsx(styles.readout, styles.wordy)}>
              <dt>changed</dt>
              <dd>
                {changed.length
                  ? changed
                      .map((d) => `${degreeLabels(before as typeof mode)[d]}→${notes[d].label}`)
                      .join(" ")
                  : "—"}
              </dd>
            </div>
          </dl>
          <button
            type="button"
            className={clsx(styles.button, styles.primary, "mt-para")}
            onClick={() => run(key)}
          >
            Play
          </button>
        </div>
      </div>

      <PlayablePiano className="mt-para" range={[from, to]} marks={marks} short bar={false} />
    </section>
  );
}

/**
 * One row per mode, one column per half step above the tonic: a dot where the
 * mode has a note. Under the chosen mode, its whole and half steps.
 */
function ModeGrid({
  index,
  before,
  changed,
  notes,
  onSelect,
}: {
  index: number;
  before: (typeof MODES_BRIGHT_TO_DARK)[number] | null;
  changed: number[];
  notes: ScaleNote[];
  onSelect: (i: number) => void;
}) {
  const current = MODES_BRIGHT_TO_DARK[index];
  const semis = modeScale(current);
  const steps = modeSteps(current);
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={clsx(styles.svg, "mx-auto max-w-[480px]")}
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

      {/* The chosen mode: coloured dots, the changed notes ringed, where they came from dashed. */}
      {before &&
        changed.map((d) => {
          const y = index * ROW + ROW / 2;
          return (
            <circle
              key={`was-${d}`}
              cx={centre(modeScale(before)[d])}
              cy={y}
              r={7}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={1.2}
              strokeDasharray="2 2"
              pointerEvents="none"
            />
          );
        })}
      {[...semis, 12].map((k, d) => {
        const y = index * ROW + ROW / 2;
        const n = notes[d % 7];
        const ringed = d < 7 && changed.includes(d);
        return (
          <g key={k} pointerEvents="none">
            <circle
              cx={centre(k)}
              cy={y}
              r={8}
              fill={pitchColor(pitchClass(n.midi + (d === 7 ? 12 : 0)), 0.62, 0.16)}
              stroke={ringed ? "var(--ink)" : "none"}
              strokeWidth={2}
            />
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
