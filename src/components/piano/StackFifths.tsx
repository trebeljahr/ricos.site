import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { whiteAtOrAbove, whiteAtOrBelow } from "src/lib/piano/keys";
import {
  FLAT_NAMES,
  isBlack,
  pitchClass,
  pitchColor,
  roleColor,
  SHARP_NAMES,
} from "src/lib/piano/notes";
import {
  type ChainNote,
  countFifth,
  type Direction,
  distinctNotes,
  type FifthCount,
  fifthsChain,
  MAX_FIFTHS,
  pitchOrder,
  startKey,
} from "src/lib/piano/stackFifths";
import { PianoSelect, PianoSwitch, usePianoPlayer } from "./controls";
import type { KeyMark } from "./Keyboard";
import { PlayablePiano } from "./PlayablePiano";
import styles from "./piano.module.css";

const SIZE = 300;
const C = SIZE / 2;
const R = 104;
/** Milliseconds per letter, per half step, and the pause between the two counts. */
const LETTER_MS = 150;
const HALF_MS = 95;
const PAUSE_MS = 350;
const HOLD_MS = 700;
/** Seconds between notes when the chain plays. */
const RUN = 0.15;

const DIRECTIONS = [
  { value: "up", label: "Fifths up" },
  { value: "down", label: "Fifths down" },
] as const;

/** Frames of the count: 1–5 letters, then 1–7 half steps. */
const LETTER_FRAMES = 5;
const HALF_FRAMES = 7;

const point = (step: number, radius = R) => {
  const angle = (step / 12) * 2 * Math.PI;
  const round = (v: number) => Math.round(v * 100) / 100;
  return { x: round(C + radius * Math.sin(angle)), y: round(C - radius * Math.cos(angle)) };
};

const FIFTH = roleColor(7);
const ROOT = roleColor(0);

/**
 * Fifths stacked one on another, folded back into one octave. Each new fifth
 * is counted out on the keys: five letter names, which take seven half steps.
 */
export function StackFifths() {
  const [startPc, setStartPc] = useState(5);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [count, setCount] = useState(0);
  /** The fifth being counted out, and how far the count has got. */
  const [counting, setCounting] = useState<{ fifth: FifthCount; frame: number } | null>(null);
  const timers = useRef<number[]>([]);
  const { play, sounding } = usePianoPlayer();

  const dir: Direction = direction === "up" ? 1 : -1;
  const start = startKey(startPc, dir);
  const chain = useMemo(() => fifthsChain(start, dir), [start, dir]);
  const shown = chain.slice(0, count + 1);
  const last = shown[shown.length - 1];

  const clearTimers = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const reset = (pc = startPc, d = direction) => {
    clearTimers();
    setCounting(null);
    setCount(0);
    setStartPc(pc);
    setDirection(d);
  };

  const stack = () => {
    if (count >= MAX_FIFTHS) return;
    const from = chain[count];
    const fifth = countFifth(from.midi, from.letter, dir);
    // The fifth itself, unfolded: the last note, then the note a fifth from it.
    play([from.midi, fifth.target], { spread: 0.14, duration: 0.9, velocity: 0.6 });
    setCount((c) => c + 1);
    clearTimers();
    setCounting({ fifth, frame: 0 });
    const times: number[] = [];
    for (let f = 1; f < LETTER_FRAMES; f++) times.push(f * LETTER_MS);
    const halves = (LETTER_FRAMES - 1) * LETTER_MS + PAUSE_MS;
    for (let f = 0; f < HALF_FRAMES; f++) times.push(halves + f * HALF_MS);
    times.forEach((t, i) => {
      timers.current.push(window.setTimeout(() => setCounting({ fifth, frame: i + 1 }), t));
    });
    const end = halves + (HALF_FRAMES - 1) * HALF_MS + HOLD_MS;
    timers.current.push(window.setTimeout(() => setCounting(null), end));
  };

  const back = () => {
    clearTimers();
    setCounting(null);
    setCount((c) => Math.max(0, c - 1));
  };

  const playChain = () =>
    play(
      shown.map((n) => n.midi),
      { spread: RUN, duration: 0.5 },
    );
  const playPitchOrder = () =>
    play(pitchOrder(chain, count, start, dir), { spread: 0.26, duration: 0.5 });

  // The keys: two octaves on the side the chain grows towards, so every
  // fifth can be counted out before it folds back.
  const lo = dir === 1 ? start : start - 23;
  const hi = dir === 1 ? start + 23 : start;
  const range: [number, number] = [whiteAtOrBelow(lo), whiteAtOrAbove(hi)];

  const marks: Record<number, KeyMark> = {};
  // While a fifth is counted out, its folded key waits until the count is over.
  for (const n of counting ? shown.slice(0, -1) : shown)
    marks[n.midi] = { label: n.index, ring: n === last && count > 0 };
  if (counting) Object.assign(marks, countMarks(counting.fifth, counting.frame));

  const nameOptions = (dir === 1 ? FLAT_NAMES : SHARP_NAMES).map((name, pc) => ({
    value: String(pc),
    label: name,
  }));

  return (
    <section className={clsx(styles.panel, "not-prose")} aria-label="Stacking fifths">
      <div className="flex flex-wrap items-end gap-tight">
        <PianoSelect
          label="start on"
          value={String(startPc)}
          options={nameOptions}
          onChange={(v) => reset(Number(v))}
        />
        <PianoSwitch
          label="Direction"
          value={direction}
          options={DIRECTIONS}
          onChange={(d) => reset(startPc, d)}
        />
      </div>

      <div className="mt-para grid gap-para md:grid-cols-[minmax(0,300px)_1fr] md:items-start">
        <Circle chain={chain} shown={shown} start={start} />

        <div className="min-w-0">
          <dl className="grid grid-cols-3 gap-label">
            <div className={styles.readout}>
              <dt>fifths stacked</dt>
              <dd>{count}</dd>
            </div>
            <div className={styles.readout}>
              <dt>different notes</dt>
              <dd>{distinctNotes(chain, count)}</dd>
            </div>
            <div className={styles.readout}>
              <dt>last note</dt>
              <dd aria-live="polite">{last.name}</dd>
            </div>
          </dl>
          <div className="mt-para flex flex-wrap gap-tight">
            <button
              type="button"
              className={clsx(styles.button, styles.primary)}
              onClick={stack}
              disabled={count >= MAX_FIFTHS}
            >
              Stack a fifth
            </button>
            <button type="button" className={styles.button} onClick={back} disabled={count === 0}>
              Back
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => reset()}
              disabled={count === 0}
            >
              Reset
            </button>
          </div>
          <div className="mt-tight flex flex-wrap gap-tight">
            <button
              type="button"
              className={clsx(styles.button, styles.small)}
              onClick={playChain}
              disabled={count === 0}
            >
              Play the fifths
            </button>
            <button
              type="button"
              className={clsx(styles.button, styles.small)}
              onClick={playPitchOrder}
              disabled={count === 0}
            >
              Play in pitch order
            </button>
          </div>

          <ol className="mt-para flex list-none flex-wrap gap-hair p-0" aria-label="The chain">
            {shown.map((n) => (
              <li
                key={n.index}
                className={clsx(styles.mono, "rounded-md px-tight py-hair text-sm font-semibold")}
                style={{
                  color: pitchColor(pitchClass(n.midi), 0.5, 0.16),
                  background: n.index === count ? "var(--track)" : undefined,
                  boxShadow: n.index === count ? "inset 0 0 0 1.5px var(--line)" : undefined,
                }}
              >
                {n.name}
              </li>
            ))}
          </ol>

          {counting && <CountStrip count={counting.fifth} frame={counting.frame} dir={dir} />}
        </div>
      </div>
      <PlayablePiano
        className="mt-para"
        range={range}
        marks={marks}
        down={sounding}
        short
        bar={false}
      />
    </section>
  );
}

/**
 * The count on the keys: first the five letter names (1–5, the start and the
 * fifth in their role colours), then the seven half steps (0–7) as outlines.
 */
function countMarks(fifth: FifthCount, frame: number) {
  const out: Record<number, KeyMark> = {};
  if (frame < LETTER_FRAMES) {
    fifth.letters.slice(0, frame + 1).forEach((l, k) => {
      out[l.midi] = {
        label: k + 1,
        color: k === 0 ? ROOT : k === 4 ? FIFTH : "var(--muted)",
        ring: k === 4,
      };
    });
    return out;
  }
  const halves = frame - LETTER_FRAMES + 1;
  fifth.halfSteps.slice(0, halves + 1).forEach((m, j) => {
    out[m] =
      j === 0
        ? { label: 0, color: ROOT }
        : { label: j, ghost: j < 7, ring: j === 7, color: j === 7 ? FIFTH : "var(--muted)" };
  });
  return out;
}

const CELL = 34;

/** The count beside the keys: letter names above, half steps below, the same eight keys. */
function CountStrip({ count, frame, dir }: { count: FifthCount; frame: number; dir: Direction }) {
  const letters = frame < LETTER_FRAMES ? frame + 1 : LETTER_FRAMES;
  const halves = frame < LETTER_FRAMES ? 0 : frame - LETTER_FRAMES + 1;
  // Low to high from left to right, whichever way the fifth goes.
  const x = (j: number) => (dir === 1 ? j : 7 - j) * CELL;
  const width = 8 * CELL;
  const summary = `${count.letters.map((l) => l.name).join(" ")}: 5 letter names, 7 half steps`;
  return (
    <svg
      viewBox={`-2 0 ${width + 4} 92`}
      className={clsx(styles.svg, "mt-para max-w-[340px]")}
      role="img"
      aria-label={summary}
    >
      {count.halfSteps.map((m, j) => {
        const letter = count.letters.findIndex((l) => l.midi === m);
        const isLetter = letter >= 0 && letter < letters;
        const isHalf = j > 0 && j <= halves;
        return (
          <g key={m}>
            {letter >= 0 && (
              <text
                x={x(j) + CELL / 2}
                y={14}
                textAnchor="middle"
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  opacity: isLetter ? 1 : 0.2,
                  fill: letter === 4 ? FIFTH : letter === 0 ? ROOT : "var(--ink)",
                }}
              >
                {count.letters[letter].name}
              </text>
            )}
            {letter >= 0 && (
              <text
                x={x(j) + CELL / 2}
                y={28}
                textAnchor="middle"
                style={{ fontSize: 10, fill: "var(--muted)", opacity: isLetter ? 1 : 0.2 }}
              >
                {letter + 1}
              </text>
            )}
            <rect
              x={x(j) + 1}
              y={34}
              width={CELL - 2}
              height={30}
              rx={4}
              fill={isBlack(m) ? "var(--ink)" : "var(--paper)"}
              stroke={j === 7 && halves === 7 ? FIFTH : "var(--line)"}
              strokeWidth={j === 7 && halves === 7 ? 2.5 : 1}
              opacity={isLetter || isHalf || j === 0 ? 1 : 0.45}
            />
            <text
              x={x(j) + CELL / 2}
              y={82}
              textAnchor="middle"
              style={{
                fontSize: 11,
                fontWeight: 600,
                fill: j === 7 ? FIFTH : "var(--muted)",
                opacity: j <= halves ? 1 : 0.2,
              }}
            >
              {j}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** The twelve keys of an octave as a clock, the chain drawn as lines from note to note. */
function Circle({
  chain,
  shown,
  start,
}: {
  chain: ChainNote[];
  shown: ChainNote[];
  start: number;
}) {
  const last = shown[shown.length - 1];
  /** Half steps above the start, 0–11, clockwise. */
  const step = (n: ChainNote) => (((n.midi - start) % 12) + 12) % 12;
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={clsx(styles.svg, "mx-auto max-w-[300px]")}
      role="img"
      aria-label={`${shown.length - 1} fifths stacked: ${shown.map((s) => s.name).join(", ")}`}
    >
      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--line)" strokeWidth={2} />
      {Array.from({ length: 12 }, (_, k) => {
        const p = point(k, R + 22);
        const t1 = point(k, R - 6);
        const t2 = point(k, R + 6);
        const reached = shown.find((s) => step(s) === k);
        const any = chain.find((s) => step(s) === k);
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: the twelve fixed places on the clock
          <g key={k}>
            <line x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y} stroke="var(--muted)" strokeWidth={1.5} />
            <text
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize: 12,
                fontWeight: 700,
                fill: reached ? pitchColor(pitchClass(start + k), 0.58, 0.16) : "var(--muted)",
                opacity: reached ? 1 : 0.5,
              }}
            >
              {(reached ?? any)?.name ?? ""}
            </text>
          </g>
        );
      })}
      {shown.slice(1).map((s, i) => {
        const a = point(step(shown[i]));
        const b = point(step(s));
        return (
          <line
            key={s.index}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={pitchColor(pitchClass(s.midi), 0.62, 0.15)}
            strokeWidth={2}
            strokeOpacity={0.85}
          />
        );
      })}
      {shown.map((s) => {
        const p = point(step(s));
        return (
          <circle
            key={s.index}
            cx={p.x}
            cy={p.y}
            r={s === last ? 8 : 6}
            fill={pitchColor(pitchClass(s.midi), 0.62, 0.16)}
            stroke={s === last ? "var(--ink)" : "var(--paper)"}
            strokeWidth={2}
          />
        );
      })}
    </svg>
  );
}
