import clsx from "clsx";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useWidth } from "src/hooks/usePianoInput";
import {
  chordSymbol,
  INTERVALS,
  MAJOR_THIRD,
  MINOR_THIRD,
  pitchClass,
  roleColor,
  type StackedNote,
  stackThirds,
} from "src/lib/piano/notes";
import {
  atOrAbove,
  bassTone,
  figuredBass,
  INVERSION_NAMES,
  invert,
  openVoicing,
} from "src/lib/piano/scales";
import styles from "./ChordInversions.module.css";
import { PianoSwitch, PLAY_STYLES, type PlayStyle, usePianoPlayer } from "./controls";
import type { KeyMark } from "./Keyboard";
import { PlayablePiano } from "./PlayablePiano";
import piano from "./piano.module.css";

const NARROW: [number, number] = [48, 79]; // C3–G5
const WIDE: [number, number] = [36, 84]; // C2–C6
const MAX_THIRDS = 3;

type Spacing = "close" | "open" | "spread";
const SPACINGS: { id: Spacing; label: string }[] = [
  { id: "close", label: "Close" },
  { id: "open", label: "Open" },
  { id: "spread", label: "Bass apart" },
];

/** One MIDI number per chord tone, in stacking order: root, third, fifth, seventh. */
type Placement = number[];

const sorted = (notes: number[]) => [...notes].sort((a, b) => a - b);
const fits = (notes: number[], [low, high]: [number, number]) =>
  notes.every((m) => m >= low && m <= high);

/** Moves a placement by whole octaves into the range, as near its middle as it goes. */
function fitRange(notes: Placement, range: [number, number]): Placement {
  const centre = (range[0] + range[1]) / 2;
  let best: Placement | null = null;
  let distance = Number.POSITIVE_INFINITY;
  for (let k = -4; k <= 4; k++) {
    const shifted = notes.map((m) => m + 12 * k);
    if (!fits(shifted, range)) continue;
    const mean = shifted.reduce((s, m) => s + m, 0) / shifted.length;
    if (Math.abs(mean - centre) < distance) {
      best = shifted;
      distance = Math.abs(mean - centre);
    }
  }
  if (best) return best;
  return notes.map((m) => {
    let n = m;
    while (n < range[0]) n += 12;
    while (n > range[1]) n -= 12;
    return n;
  });
}

/** A sorted voicing turned back into one note per chord tone. */
const byTone = (voicing: number[], tonePcs: number[]) =>
  tonePcs.map((pc) => voicing.find((m) => pitchClass(m) === pc) ?? pc);

function preset(rootPosition: number[], inversion: number, spacing: Spacing) {
  const close = invert(rootPosition, inversion);
  if (spacing === "open") return openVoicing(close);
  if (spacing === "spread") return [close[0] - 12, ...close.slice(1)];
  return close;
}

const COMPOUND_NAMES = [
  "Minor ninth",
  "Major ninth",
  "Minor tenth",
  "Major tenth",
  "Perfect eleventh",
  "Augmented eleventh",
  "Perfect twelfth",
  "Minor thirteenth",
  "Major thirteenth",
  "Minor fourteenth",
  "Major fourteenth",
  "Two octaves",
];

/** The written-out name of an interval in half steps, up to two octaves. */
export function intervalName(semitones: number) {
  const s = Math.abs(semitones);
  if (s <= 12) return INTERVALS[s].name;
  return COMPOUND_NAMES[s - 13] ?? `${s} half steps`;
}

/** A chord tone that moved from one key to another, drawn as an arrow over the keys. */
type Move = { from: number; to: number; color: string };

/** True when two voicings are the same shape, one possibly whole octaves above the other. */
function sameShape(a: number[], b: number[]) {
  const x = sorted(a);
  const y = sorted(b);
  if (x.length !== y.length) return false;
  const shift = x[0] - y[0];
  return shift % 12 === 0 && x.every((m, i) => m - y[i] === shift);
}

/**
 * Stack thirds into a chord, then move its notes around the keyboard: tap any
 * key with one of the chord's note names to move that note there.
 */
export function ChordInversions() {
  const box = useRef<HTMLElement>(null);
  const width = useWidth(box);
  const range = width >= 640 ? WIDE : NARROW;
  const [chord, setChord] = useState(() => ({
    root: 0,
    thirds: [MAJOR_THIRD, MINOR_THIRD],
    placed: [60, 64, 67] as Placement,
  }));
  const { play, sounding } = usePianoPlayer();
  const [playStyle, setPlayStyle] = useState<PlayStyle>("together");
  const [moves, setMoves] = useState<{ id: number; list: Move[] }>({ id: 0, list: [] });

  const notes = stackThirds(60 + chord.root, chord.thirds);
  const tonePcs = notes.map((n) => pitchClass(n.midi));
  const rootPosition = notes.map((n) => n.midi);
  const placed = useMemo(
    () => (fits(chord.placed, range) ? chord.placed : fitRange(chord.placed, range)),
    [chord.placed, range],
  );
  const voicing = sorted(placed);
  const bass = Math.max(0, bassTone(placed, tonePcs));
  const symbol = chordSymbol(notes[0].spelled, chord.thirds);
  const slash = bass > 0 ? `${symbol}/${notes[bass].spelled}` : symbol;
  const toneAt = (m: number) => tonePcs.indexOf(pitchClass(m));

  const strum = useCallback(
    (next: number[], style: PlayStyle = playStyle) =>
      play(sorted(next), { spread: style === "apart" ? 0.3 : 0.03, duration: 1.8 }),
    [play, playStyle],
  );

  const set = (next: Partial<typeof chord> & { placed: Placement }) => {
    // Notes that changed key get an arrow, unless the whole chord moved by one
    // amount (a new root): then nothing was rearranged.
    const changed = next.placed
      .map((to, tone) => ({ from: placed[tone], to, tone }))
      .filter((m) => m.from !== undefined && m.from !== m.to);
    const shifts = new Set(changed.map((m) => m.to - m.from));
    const rearranged = !(changed.length === placed.length && shifts.size === 1);
    if (next.thirds === undefined && rearranged && changed.length > 0) {
      setMoves((m) => ({
        id: m.id + 1,
        list: changed.map(({ from, to, tone }) => ({
          from,
          to,
          color: roleColor(notes[tone].semitones),
        })),
      }));
    }
    setChord((c) => ({ ...c, ...next }));
    strum(next.placed);
  };

  const applyPreset = (inversion: number, spacing: Spacing) => {
    const next = byTone(preset(rootPosition, inversion, spacing), tonePcs);
    set({ placed: fitRange(next, range) });
  };

  const moveRoot = (step: -1 | 1) => {
    const next = placed.map((m) => m + step);
    set({
      root: (chord.root + step + 12) % 12,
      placed: fits(next, range) ? next : fitRange(next, range),
    });
  };

  const nextPc = (size: number) => (chord.root + notes[notes.length - 1].semitones + size) % 12;
  const canAdd = (size: number) =>
    chord.thirds.length < MAX_THIRDS && !tonePcs.includes(nextPc(size));

  const addThird = (size: number) => {
    if (!canAdd(size)) return;
    let top = atOrAbove(nextPc(size), Math.max(...placed) + 1);
    while (top > range[1]) top -= 12;
    set({ thirds: [...chord.thirds, size], placed: [...placed, top] });
  };

  const removeTop = () => {
    if (chord.thirds.length === 0) return;
    set({ thirds: chord.thirds.slice(0, -1), placed: placed.slice(0, -1) });
  };

  // Only keys that hold one of the chord's notes do anything: they move that note there.
  const onNoteOn = (m: number) => {
    const tone = toneAt(m);
    if (tone < 0) return;
    const next = [...placed];
    next[tone] = m;
    set({ placed: next });
  };

  const marks: Record<number, KeyMark> = {};
  for (let m = range[0]; m <= range[1]; m++) {
    const tone = toneAt(m);
    if (tone >= 0) marks[m] = { ghost: true, color: roleColor(notes[tone].semitones) };
  }
  placed.forEach((m, tone) => {
    marks[m] = {
      label: notes[tone].label,
      ring: tone === 0,
      color: roleColor(notes[tone].semitones),
    };
  });

  const spacing = SPACINGS.find((s) => sameShape(placed, preset(rootPosition, bass, s.id)))?.id;

  return (
    <section ref={box} className={clsx(piano.panel, "not-prose")} aria-label="Chord inversions">
      <div className="grid gap-para sm:grid-cols-[minmax(0,272px)_1fr] sm:items-start">
        <GapTower voicing={voicing} notes={notes} tonePcs={tonePcs} />
        <div className="min-w-0">
          <p className={clsx(piano.muted, "text-xs")}>chord symbol</p>
          <p className="text-4xl font-semibold tracking-tight sm:text-5xl" aria-live="polite">
            {slash}
          </p>
          <p className={clsx(piano.mono, "mt-tight text-sm")}>
            {voicing.map((m) => notes[toneAt(m)]?.spelled).join(" · ")}
          </p>
          <dl className="mt-label grid grid-cols-2 gap-label">
            <div className={clsx(piano.readout, piano.wordy)}>
              <dt>
                {notes.length >= 3 ? `figured bass ${figuredBass(notes.length, bass)}` : "bass"}
              </dt>
              <dd>{INVERSION_NAMES[bass] ?? "—"}</dd>
            </div>
            <div className={piano.readout}>
              <dt>half steps, bottom to top</dt>
              <dd>{voicing[voicing.length - 1] - voicing[0]}</dd>
            </div>
          </dl>

          <div className="mt-para flex flex-wrap items-center gap-tight">
            <span className={piano.segmented} role="group" aria-label="Root">
              <button
                type="button"
                className={clsx(piano.button, piano.small)}
                onClick={() => moveRoot(-1)}
                aria-label="Root a half step down"
              >
                ◀
              </button>
              <span
                className={clsx(
                  piano.mono,
                  "inline-flex min-w-12 items-center justify-center font-semibold",
                )}
              >
                {notes[0].spelled}
              </span>
              <button
                type="button"
                className={clsx(piano.button, piano.small)}
                onClick={() => moveRoot(1)}
                aria-label="Root a half step up"
              >
                ▶
              </button>
            </span>
            <button
              type="button"
              className={clsx(piano.button, piano.small)}
              onClick={() => addThird(MINOR_THIRD)}
              disabled={!canAdd(MINOR_THIRD)}
            >
              + minor third
            </button>
            <button
              type="button"
              className={clsx(piano.button, piano.small)}
              onClick={() => addThird(MAJOR_THIRD)}
              disabled={!canAdd(MAJOR_THIRD)}
            >
              + major third
            </button>
            <button
              type="button"
              className={clsx(piano.button, piano.small)}
              onClick={removeTop}
              disabled={chord.thirds.length === 0}
            >
              Remove top
            </button>
          </div>

          <div
            className="mt-tight flex flex-wrap gap-tight"
            role="group"
            aria-label="Note in the bass"
          >
            {notes.map((n, k) => (
              <button
                key={n.degree}
                type="button"
                className={clsx(piano.button, piano.small)}
                aria-pressed={bass === k}
                onClick={() => applyPreset(k, spacing ?? "close")}
              >
                {INVERSION_NAMES[k]}
              </button>
            ))}
          </div>
          <div className="mt-tight flex flex-wrap gap-tight">
            <span className={piano.segmented} role="group" aria-label="Spacing">
              {SPACINGS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={clsx(piano.button, piano.small)}
                  aria-pressed={spacing === s.id}
                  disabled={s.id !== "close" && notes.length < (s.id === "open" ? 3 : 2)}
                  onClick={() => applyPreset(bass, s.id)}
                >
                  {s.label}
                </button>
              ))}
            </span>
          </div>
          <div className="mt-tight flex flex-wrap items-center gap-tight">
            <button
              type="button"
              className={clsx(piano.button, piano.small)}
              onClick={() => strum(placed)}
            >
              Play
            </button>
            <PianoSwitch
              label="Play the notes"
              value={playStyle}
              options={PLAY_STYLES}
              onChange={(style) => {
                setPlayStyle(style);
                strum(placed, style);
              }}
            />
          </div>
        </div>
      </div>
      <MovingKeys moves={moves} className="mt-label">
        <PlayablePiano
          range={range}
          marks={marks}
          down={sounding}
          sound={false}
          onNoteOn={onNoteOn}
          short
          bar={false}
        />
      </MovingKeys>
    </section>
  );
}

const STRIP = 34; // room above the keys for the arrows, in pixels
const ARROW_MS = 2200;

/**
 * The keyboard with a strip above it, where an arrow arcs from each moved
 * note's old key to its new one.
 */
function MovingKeys({
  moves,
  className,
  children,
}: {
  moves: { id: number; list: Move[] };
  className?: string;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [arcs, setArcs] = useState<{ id: number; width: number; paths: Arc[] }>({
    id: 0,
    width: 1,
    paths: [],
  });

  useLayoutEffect(() => {
    const node = box.current;
    if (!node || moves.id === 0) return;
    const frame = node.getBoundingClientRect();
    const centre = (m: number) => {
      const key = node.querySelector<HTMLElement>(`[data-midi="${m}"]`);
      if (!key) return null;
      const r = key.getBoundingClientRect();
      return r.left + r.width / 2 - frame.left;
    };
    const paths: Arc[] = [];
    for (const move of moves.list) {
      const x1 = centre(move.from);
      const x2 = centre(move.to);
      if (x1 === null || x2 === null) continue;
      paths.push({ x1, x2, color: move.color });
    }
    setArcs({ id: moves.id, width: Math.max(1, frame.width), paths });
  }, [moves]);

  useEffect(() => {
    if (arcs.paths.length === 0) return;
    const timer = window.setTimeout(() => setArcs((a) => ({ ...a, paths: [] })), ARROW_MS);
    return () => window.clearTimeout(timer);
  }, [arcs]);

  return (
    <div ref={box} className={clsx("relative", className)} style={{ paddingTop: STRIP }}>
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 overflow-visible"
        width="100%"
        height={STRIP + 6}
        viewBox={`0 0 ${arcs.width} ${STRIP + 6}`}
      >
        {arcs.paths.map((arc) => (
          <MoveArc key={`${arcs.id}-${arc.x1}-${arc.x2}`} arc={arc} />
        ))}
      </svg>
      {children}
    </div>
  );
}

type Arc = { x1: number; x2: number; color: string };

/** One arrow: drawn from the old key to the new, then faded out. */
function MoveArc({ arc }: { arc: Arc }) {
  const base = STRIP + 4;
  const lift = Math.min(STRIP - 4, 10 + Math.abs(arc.x2 - arc.x1) * 0.12);
  const cx = (arc.x1 + arc.x2) / 2;
  const cy = base - lift * 2;
  // The tangent at the end of a quadratic curve points from the control point to the end.
  const angle = Math.atan2(base - cy, arc.x2 - cx);
  const head = 7;
  const tip = { x: arc.x2, y: base };
  const wing = (a: number) =>
    `${tip.x - head * Math.cos(angle + a)},${tip.y - head * Math.sin(angle + a)}`;
  return (
    <g className={styles.arrow} style={{ color: arc.color }}>
      <circle cx={arc.x1} cy={base} r={3} fill="currentColor" className={styles.arrowStart} />
      <path
        d={`M ${arc.x1} ${base} Q ${cx} ${cy} ${arc.x2} ${base}`}
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        className={styles.arrowLine}
      />
      <polygon
        points={`${tip.x},${tip.y} ${wing(0.45)} ${wing(-0.45)}`}
        fill="currentColor"
        className={styles.arrowHead}
      />
    </g>
  );
}

/**
 * The voicing from the bottom up: each block is the gap between two
 * neighbouring notes, as tall as its half steps, named by its interval. Notes
 * too close to stack (seconds) sit side by side, as in engraved music.
 */
function GapTower({
  voicing,
  notes,
  tonePcs,
}: {
  voicing: number[];
  notes: StackedNote[];
  tonePcs: number[];
}) {
  const span = Math.max(1, voicing[voicing.length - 1] - voicing[0]);
  const unit = Math.min(9, 236 / Math.max(span, 12));
  const total = Math.max(12, span) * unit + 28;
  const y = (m: number) => total - 14 - (m - voicing[0]) * unit;
  const chip = 22;
  const chipWidth = 40;
  const tone = (m: number) => notes[tonePcs.indexOf(pitchClass(m))];
  // Column 1 for a note too close to the one below it, when that one is in column 0.
  const columns: number[] = [];
  voicing.forEach((m, i) => {
    const close = i > 0 && (m - voicing[i - 1]) * unit < chip + 2;
    columns.push(close && columns[i - 1] === 0 ? 1 : 0);
  });
  const chipX = [4, 48];
  const labelX = [216, 244];
  return (
    <svg
      viewBox={`0 0 272 ${total}`}
      className={clsx(piano.svg, "mx-auto max-w-[272px]")}
      role="img"
      aria-label={`From the bottom: ${voicing.map((m) => tone(m)?.spelled).join(", ")}`}
    >
      {voicing.slice(1).map((m, i) => {
        const low = voicing[i];
        const gap = m - low;
        const top = y(m);
        const height = gap * unit;
        return (
          <g key={`${low}-${m}`}>
            <rect
              x={96}
              y={top + 1}
              width={112}
              height={Math.max(2, height - 2)}
              rx={5}
              fill={gap <= 4 ? "var(--accent)" : "var(--muted)"}
              opacity={gap <= 4 ? 0.7 : 0.4}
            />
            {height >= 14 && (
              <text
                x={152}
                y={top + height / 2 + 4}
                textAnchor="middle"
                style={{ fontSize: 10.5, fontWeight: 700, fill: "var(--paper)" }}
              >
                {intervalName(gap)}
              </text>
            )}
          </g>
        );
      })}
      {voicing.map((m, i) => {
        const n = tone(m);
        const x = chipX[columns[i]];
        return (
          <g key={m}>
            <line
              x1={x + chipWidth}
              x2={212}
              y1={y(m)}
              y2={y(m)}
              stroke="var(--ink)"
              strokeWidth={1.5}
            />
            <rect
              x={x}
              y={y(m) - chip / 2}
              width={chipWidth}
              height={chip}
              rx={chip / 2}
              fill={roleColor(n?.semitones ?? 0)}
            />
            <text
              x={x + chipWidth / 2}
              y={y(m) + 4}
              textAnchor="middle"
              style={{ fontSize: 12, fontWeight: 700, fill: "#fff" }}
            >
              {n?.spelled}
            </text>
            <text x={labelX[columns[i]]} y={y(m) + 4} style={{ fontSize: 12, fontWeight: 600 }}>
              {n?.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
