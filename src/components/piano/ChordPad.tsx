import clsx from "clsx";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { typingInField } from "src/lib/piano/input";
import { noteName, pitchClass, pitchColor } from "src/lib/piano/notes";
import {
  atOrAbove,
  type ChordFunction,
  type DiatonicChord,
  diatonicChords,
  type Key,
  keyOn,
  leadVoices,
  MAJOR,
  MINOR,
  movement,
} from "src/lib/piano/scales";
import { KeyPicker, usePianoPlayer } from "./controls";
import type { KeyMark } from "./Keyboard";
import { PlayablePiano } from "./PlayablePiano";
import styles from "./piano.module.css";

const BASS: [number, number] = [45, 56]; // A2–G♯3
const UPPER: [number, number] = [57, 79]; // A3–G5
const RANGE: [number, number] = [BASS[0], UPPER[1]];
/** Where the voices start: C E G around middle C. */
const HOME = [60, 64, 67];
const HISTORY = 8;

export const FUNCTION_COLORS: Record<ChordFunction, string> = {
  tonic: "oklch(0.66 0.12 235)",
  predominant: "oklch(0.76 0.14 85)",
  dominant: "oklch(0.63 0.18 30)",
};

type Played = {
  degree: number;
  roman: string;
  symbol: string;
  /** The upper voices, low to high. */
  upper: number[];
  /** The spelled name of each upper voice. */
  names: string[];
  bass: number | null;
};

/**
 * The seven chords of a key as pads. Each new chord takes the nearest notes
 * to the one before, and the last few chords are drawn as moving voices.
 */
export function ChordPad() {
  const [key, setKey] = useState<Key>(() => keyOn(0));
  const [size, setSize] = useState<3 | 4>(3);
  const [smooth, setSmooth] = useState(true);
  const [withBass, setWithBass] = useState(true);
  const [history, setHistory] = useState<Played[]>([]);
  const { play } = usePianoPlayer();

  const chords = diatonicChords(key, size);
  const last = history[history.length - 1];
  const before = history[history.length - 2];

  const strike = (degree: number) => {
    const chord = chords[degree];
    const pcs = chord.notes.map((n) => pitchClass(n.midi));
    const upper = smooth
      ? leadVoices(last?.upper ?? HOME, pcs, UPPER)
      : chord.notes.map((n) => atOrAbove(pcs[0], UPPER[0]) + n.semitones);
    const bass = withBass ? atOrAbove(pcs[0], BASS[0]) : null;
    const names = upper.map((m) => chord.notes[pcs.indexOf(pitchClass(m))]?.spelled ?? noteName(m));
    setHistory((h) => [
      ...h.slice(-(HISTORY - 1)),
      { degree, roman: chord.roman, symbol: chord.symbol, upper, names, bass },
    ]);
    play(bass === null ? upper : [bass, ...upper], {
      spread: 0.008,
      duration: 1.8,
      velocity: 0.58,
    });
  };

  // The number keys 1–7 play the pads, so a progression can be played by hand.
  const latest = useRef(strike);
  latest.current = strike;
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (typingInField(event.target)) return;
      const digit = Number(event.key);
      if (Number.isInteger(digit) && digit >= 1 && digit <= 7) {
        event.preventDefault();
        latest.current(digit - 1);
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);

  const changeKey = (next: Key) => {
    setKey(next);
    setHistory([]);
  };

  const current = last ? chords[last.degree] : null;
  const marks: Record<number, KeyMark> = {};
  if (last && current) {
    const pcs = current.notes.map((n) => pitchClass(n.midi));
    for (const m of last.upper)
      marks[m] = { label: current.notes[pcs.indexOf(pitchClass(m))]?.label };
    if (last.bass !== null) marks[last.bass] = { label: "1", ring: true };
  }

  const moved = last && before ? movement(before.upper, last.upper) : null;
  const voiceMoves =
    last && before && before.upper.length === last.upper.length
      ? last.upper.map((m, i) => {
          const d = m - before.upper[i];
          return `${before.names[i]}→${last.names[i]} ${d > 0 ? "+" : d < 0 ? "−" : "±"}${Math.abs(d)}`;
        })
      : null;

  return (
    <section className={clsx(styles.panel, "not-prose")} aria-label="Chord pad">
      <div className="flex flex-wrap items-end gap-tight">
        <KeyPicker value={key} modes={[MAJOR, MINOR]} onChange={changeKey} />
        <span className={styles.segmented} role="group" aria-label="Chord size">
          <button
            type="button"
            className={clsx(styles.button, styles.small)}
            aria-pressed={size === 3}
            onClick={() => setSize(3)}
          >
            Triads
          </button>
          <button
            type="button"
            className={clsx(styles.button, styles.small)}
            aria-pressed={size === 4}
            onClick={() => setSize(4)}
          >
            Sevenths
          </button>
        </span>
        <span className={styles.segmented} role="group" aria-label="Voice leading">
          <button
            type="button"
            className={clsx(styles.button, styles.small)}
            aria-pressed={smooth}
            onClick={() => setSmooth(true)}
          >
            Nearest notes
          </button>
          <button
            type="button"
            className={clsx(styles.button, styles.small)}
            aria-pressed={!smooth}
            onClick={() => setSmooth(false)}
          >
            Root position
          </button>
        </span>
        <button
          type="button"
          className={clsx(styles.button, styles.small)}
          aria-pressed={withBass}
          onClick={() => setWithBass((b) => !b)}
        >
          Bass
        </button>
      </div>

      <div className="mt-para grid grid-cols-4 gap-tight sm:grid-cols-7">
        {chords.map((chord, d) => (
          <Pad
            key={chord.degree}
            chord={chord}
            active={last?.degree === d}
            onStrike={() => strike(d)}
          />
        ))}
      </div>

      <div className="mt-para grid gap-para md:grid-cols-[minmax(0,1fr)_minmax(0,14rem)] md:items-start">
        <VoiceGraph history={history} />
        <div className="min-w-0">
          <p className="text-3xl font-semibold tracking-tight" aria-live="polite">
            {last ? `${last.roman} · ${last.symbol}` : "—"}
          </p>
          <dl className="mt-label grid grid-cols-2 gap-label">
            <div className={styles.readout}>
              <dt>half steps moved</dt>
              <dd>{moved ?? "—"}</dd>
            </div>
            <div className={clsx(styles.readout, styles.wordy)}>
              <dt>function</dt>
              <dd>{current?.function ?? "—"}</dd>
            </div>
          </dl>
          {voiceMoves && (
            <ul className={clsx(styles.mono, "mt-label list-none p-0 text-sm")}>
              {voiceMoves
                .slice()
                .reverse()
                .map((move) => (
                  <li key={move}>{move}</li>
                ))}
            </ul>
          )}
          <button
            type="button"
            className={clsx(styles.button, styles.small, "mt-label")}
            onClick={() => setHistory([])}
            disabled={history.length === 0}
          >
            Clear
          </button>
        </div>
      </div>

      <PlayablePiano className="mt-para" range={RANGE} marks={marks} short bar={false} />
    </section>
  );
}

function Pad({
  chord,
  active,
  onStrike,
}: {
  chord: DiatonicChord;
  active: boolean;
  onStrike: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.pad}
      aria-pressed={active}
      aria-label={`${chord.roman}, ${chord.symbol}, ${chord.function}`}
      style={{ "--pad-color": FUNCTION_COLORS[chord.function] } as CSSProperties}
      // Pads sound on touch-down, like keys; Enter and Space go through onClick.
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        event.preventDefault();
        onStrike();
      }}
      onClick={(event) => {
        if (event.detail === 0) onStrike();
      }}
    >
      <span className={styles.hint}>{chord.degree + 1}</span>
      <span className={styles.padRoman}>{chord.roman}</span>
      <span className={styles.padSymbol}>{chord.symbol}</span>
      <span className={styles.padFunction}>{chord.function}</span>
    </button>
  );
}

const GRAPH_W = 320;
const GRAPH_H = 156;
const PLOT_TOP = 8;
const PLOT_BOTTOM = 128;

/** The last chords left to right, each voice a line through its notes. */
function VoiceGraph({ history }: { history: Played[] }) {
  const y = (m: number) =>
    PLOT_BOTTOM - ((m - RANGE[0]) / (RANGE[1] - RANGE[0])) * (PLOT_BOTTOM - PLOT_TOP);
  const x = (i: number) => 34 + (i * (GRAPH_W - 50)) / (HISTORY - 1);
  return (
    <svg
      viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`}
      className={clsx(styles.svg, "mx-auto max-w-[480px] rounded-lg")}
      role="img"
      aria-label={
        history.length ? `Last chords: ${history.map((h) => h.roman).join(", ")}` : "No chords yet"
      }
    >
      <rect x={0} y={0} width={GRAPH_W} height={GRAPH_H} rx={10} fill="var(--track)" />
      {[48, 60, 72].map((c) => (
        <g key={c}>
          <line x1={28} x2={GRAPH_W - 8} y1={y(c)} y2={y(c)} stroke="var(--line)" />
          <text x={6} y={y(c) + 4} style={{ fontSize: 9, fill: "var(--muted)" }}>
            {noteName(c)}
          </text>
        </g>
      ))}
      {history.slice(1).map((h, i) => {
        const a = history[i];
        return (
          <g key={`lines-${i}-${h.roman}`}>
            {a.upper.length === h.upper.length &&
              h.upper.map((m, v) => (
                <line
                  // biome-ignore lint/suspicious/noArrayIndexKey: one line per voice
                  key={v}
                  x1={x(i)}
                  y1={y(a.upper[v])}
                  x2={x(i + 1)}
                  y2={y(m)}
                  stroke="var(--ink)"
                  strokeOpacity={0.45}
                  strokeWidth={1.6}
                />
              ))}
            {a.bass !== null && h.bass !== null && (
              <line
                x1={x(i)}
                y1={y(a.bass)}
                x2={x(i + 1)}
                y2={y(h.bass)}
                stroke="var(--muted)"
                strokeWidth={1.4}
                strokeDasharray="3 3"
              />
            )}
          </g>
        );
      })}
      {history.map((h, i) => (
        <g key={`notes-${i}-${h.roman}`}>
          {[...(h.bass === null ? [] : [h.bass]), ...h.upper].map((m) => (
            <circle
              key={m}
              cx={x(i)}
              cy={y(m)}
              r={4.5}
              fill={pitchColor(pitchClass(m), 0.62, 0.16)}
              stroke="var(--paper)"
              strokeWidth={1.2}
            />
          ))}
          <text
            x={x(i)}
            y={GRAPH_H - 10}
            textAnchor="middle"
            style={{ fontSize: 11, fontWeight: i === history.length - 1 ? 700 : 500 }}
          >
            {h.roman}
          </text>
        </g>
      ))}
    </svg>
  );
}
