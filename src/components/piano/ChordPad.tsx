import clsx from "clsx";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import {
  chordName,
  chordTones,
  fingersMoved,
  nextChords,
  PROGRESSIONS,
  type Progression,
  progressionLabel,
  suggested,
  type Tones,
} from "src/lib/piano/chordPadProgressions";
import { typingInField } from "src/lib/piano/input";
import { intervalNumber, noteName, pitchClass, roleColor } from "src/lib/piano/notes";
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
import padStyles from "./ChordPad.module.css";
import { KeyPicker, PianoCheck, PianoSwitch, usePianoPlayer } from "./controls";
import type { KeyMark } from "./Keyboard";
import { PlayablePiano } from "./PlayablePiano";
import styles from "./piano.module.css";

const BASS: [number, number] = [45, 56]; // A2–G♯3
const UPPER: [number, number] = [57, 79]; // A3–G5
const RANGE: [number, number] = [BASS[0], UPPER[1]];
/** Where the voices start: C E G around middle C. */
const HOME = [60, 64, 67];
const HISTORY = 8;
/** Seconds per chord when a progression plays. */
const GAP = 0.85;

export const FUNCTION_COLORS: Record<ChordFunction, string> = {
  tonic: "oklch(0.66 0.12 235)",
  predominant: "oklch(0.76 0.14 85)",
  dominant: "oklch(0.63 0.18 30)",
};

type Voicing = "nearest" | "root";
const VOICINGS = [
  { value: "nearest", label: "Nearest notes" },
  { value: "root", label: "Root position" },
] as const;

type Played = {
  degree: number;
  roman: string;
  symbol: string;
  /** The upper voices, low to high. */
  upper: number[];
  /** Half steps above the root of each upper voice: its role in the chord. */
  roles: number[];
  /** The spelled name of each upper voice. */
  names: string[];
  bass: number | null;
};

/**
 * The seven chords of a key as pads. Each new chord takes the nearest notes
 * to the one before, the pads that move the fewest fingers next are marked,
 * and the last few chords are drawn as moving voices.
 */
export function ChordPad() {
  const [key, setKey] = useState<Key>(() => keyOn(0));
  const [tones, setTones] = useState<Tones>({ third: true, fifth: true, seventh: false });
  const [voicing, setVoicing] = useState<Voicing>("nearest");
  const [withBass, setWithBass] = useState(true);
  const [history, setHistory] = useState<Played[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const { playChords, stop, sounding } = usePianoPlayer();
  const timers = useRef<number[]>([]);

  const chords = diatonicChords(key, 4);
  const names = chords.map((chord) => chordName(chord, tones));
  const last = history[history.length - 1];
  const before = history[history.length - 2];

  const clearTimers = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  /** The chord on a degree, voiced from the notes held before. */
  const voice = (degree: number, held: number[] | undefined): Played => {
    const chord = chords[degree];
    const { pcs, semitones } = chordTones(chord, tones);
    const upper =
      voicing === "nearest"
        ? leadVoices(held ?? HOME, pcs, UPPER)
        : semitones.map((s) => atOrAbove(pcs[0], UPPER[0]) + s);
    const roles = upper.map((m) => semitones[pcs.indexOf(pitchClass(m))] ?? 0);
    const spelled = upper.map(
      (m) => chord.notes.find((n) => pitchClass(n.midi) === pitchClass(m))?.spelled ?? noteName(m),
    );
    return {
      degree,
      ...names[degree],
      upper,
      roles,
      names: spelled,
      bass: withBass ? atOrAbove(pcs[0], BASS[0]) : null,
    };
  };

  const keysOf = (p: Played) => (p.bass === null ? p.upper : [p.bass, ...p.upper]);

  const strike = (degree: number) => {
    clearTimers();
    setPlaying(null);
    const played = voice(degree, last?.upper);
    setHistory((h) => [...h.slice(-(HISTORY - 1)), played]);
    playChords([keysOf(played)], 1.9, 0.58);
  };

  const playProgression = (progression: Progression) => {
    clearTimers();
    if (playing === progression.name) {
      stop();
      setPlaying(null);
      return;
    }
    const steps: Played[] = [];
    let held = last?.upper;
    for (const degree of progression.degrees) {
      const step = voice(degree, held);
      steps.push(step);
      held = step.upper;
    }
    playChords(steps.map(keysOf), GAP, 0.58);
    setPlaying(progression.name);
    steps.forEach((step, i) => {
      timers.current.push(
        window.setTimeout(
          () => setHistory((h) => [...h.slice(-(HISTORY - 1)), step]),
          i * GAP * 1000,
        ),
      );
    });
    timers.current.push(window.setTimeout(() => setPlaying(null), steps.length * GAP * 1000));
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
    clearTimers();
    stop();
    setPlaying(null);
    setKey(next);
    setHistory([]);
  };

  const next = last ? nextChords(last.upper, chords, tones, UPPER) : null;
  const best = next && last ? suggested(next, last.degree) : new Set<number>();

  const marks: Record<number, KeyMark> = {};
  if (last) {
    const chord = chords[last.degree];
    last.upper.forEach((m, i) => {
      const note = chord.notes.find((n) => n.semitones === last.roles[i]);
      marks[m] = { label: note?.label ?? "", color: roleColor(last.roles[i]) };
    });
    if (last.bass !== null) marks[last.bass] = { label: "1", ring: true, color: roleColor(0) };
  }

  const moved = last && before ? movement(before.upper, last.upper) : null;
  const fingers = last && before ? fingersMoved(before.upper, last.upper) : null;
  const voiceMoves =
    last && before && before.upper.length === last.upper.length
      ? last.upper.map((m, i) => {
          const d = m - before.upper[i];
          return `${before.names[i]}→${last.names[i]} ${d > 0 ? "+" : d < 0 ? "−" : "±"}${Math.abs(d)}`;
        })
      : null;

  const toggle = (tone: keyof Tones) => (on: boolean) => setTones((t) => ({ ...t, [tone]: on }));

  return (
    <section className={clsx(styles.panel, "not-prose")} aria-label="Chord pad">
      <div className="flex flex-wrap items-end gap-tight">
        <KeyPicker value={key} modes={[MAJOR, MINOR]} onChange={changeKey} />
        <PianoSwitch
          label="Voice leading"
          value={voicing}
          options={VOICINGS}
          onChange={setVoicing}
        />
        <PianoCheck label="Bass" checked={withBass} onChange={setWithBass} />
      </div>
      <fieldset className="mt-tight flex flex-wrap items-center gap-x-para gap-y-hair border-0 p-0">
        <legend className="sr-only">Chord tones</legend>
        <PianoCheck label="Root" checked onChange={() => {}} color={roleColor(0)} disabled />
        <PianoCheck
          label="Third"
          checked={tones.third}
          onChange={toggle("third")}
          color={roleColor(4)}
        />
        <PianoCheck
          label="Fifth"
          checked={tones.fifth}
          onChange={toggle("fifth")}
          color={roleColor(7)}
        />
        <PianoCheck
          label="Seventh"
          checked={tones.seventh}
          onChange={toggle("seventh")}
          color={roleColor(11)}
        />
      </fieldset>

      <div className="mt-para grid grid-cols-4 gap-tight sm:grid-cols-7">
        {chords.map((chord, d) => (
          <Pad
            key={chord.degree}
            chord={chord}
            name={names[d]}
            active={last?.degree === d}
            suggested={best.has(d)}
            fingers={next && last?.degree !== d ? next[d].fingers : null}
            onStrike={() => strike(d)}
          />
        ))}
      </div>

      <fieldset className="mt-tight flex flex-wrap gap-tight border-0 p-0">
        <legend className="sr-only">Progressions</legend>
        {PROGRESSIONS.map((p) => (
          <button
            key={p.name}
            type="button"
            className={clsx(styles.button, styles.small)}
            aria-pressed={playing === p.name}
            onClick={() => playProgression(p)}
          >
            <span className={padStyles.preset}>
              <span>{p.name}</span>
              <span className={padStyles.presetRoman}>
                {progressionLabel(
                  p,
                  names.map((n) => n.roman),
                )}
              </span>
            </span>
          </button>
        ))}
      </fieldset>

      <div className="mt-para grid gap-para md:grid-cols-[minmax(0,1fr)_minmax(0,14rem)] md:items-start">
        <VoiceGraph history={history} />
        <div className="min-w-0">
          <p className="text-3xl font-semibold tracking-tight" aria-live="polite">
            {last ? `${last.roman} · ${last.symbol}` : "—"}
          </p>
          <dl className="mt-label grid grid-cols-2 gap-label">
            <div className={styles.readout}>
              <dt>fingers moved</dt>
              <dd>{fingers ?? "—"}</dd>
            </div>
            <div className={styles.readout}>
              <dt>half steps moved</dt>
              <dd>{moved ?? "—"}</dd>
            </div>
            <div className={clsx(styles.readout, styles.wordy)}>
              <dt>function</dt>
              <dd>{last ? chords[last.degree].function : "—"}</dd>
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
            onClick={() => {
              clearTimers();
              stop();
              setPlaying(null);
              setHistory([]);
            }}
            disabled={history.length === 0}
          >
            Clear
          </button>
        </div>
      </div>

      <PlayablePiano
        className="mt-para"
        range={RANGE}
        marks={marks}
        down={sounding}
        short
        bar={false}
      />
    </section>
  );
}

function Pad({
  chord,
  name,
  active,
  suggested: isSuggested,
  fingers,
  onStrike,
}: {
  chord: DiatonicChord;
  name: { roman: string; symbol: string };
  active: boolean;
  suggested: boolean;
  /** Fingers that move to reach this chord from the one held now. */
  fingers: number | null;
  onStrike: () => void;
}) {
  const moves =
    fingers === null ? "" : `, ${fingers} ${fingers === 1 ? "finger moves" : "fingers move"}`;
  return (
    <button
      type="button"
      className={clsx(styles.pad, isSuggested && padStyles.suggested)}
      aria-pressed={active}
      aria-label={`${name.roman}, ${name.symbol}, ${chord.function}${moves}${isSuggested ? ", suggested next" : ""}`}
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
      {fingers !== null && (
        <span aria-hidden className={padStyles.fingers}>
          {Array.from({ length: fingers }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: one dot per finger
            <span key={i} className={padStyles.finger} />
          ))}
        </span>
      )}
      <span className={styles.padRoman}>{name.roman}</span>
      <span className={styles.padSymbol}>{name.symbol}</span>
      <span className={styles.padFunction}>{chord.function}</span>
    </button>
  );
}

const GRAPH_W = 400;
const COL_LEFT = 34;
const COL_RIGHT = GRAPH_W - 40;
const PLOT_TOP = 12;
const PLOT_BOTTOM = 150;
const BASS_Y = 176;
const GRAPH_H = 212;
const DOT = 7;

/**
 * The last chords left to right. Each finger is one grey line, flat while
 * it holds its key; the dots on it take the colour of the role the note has
 * in that chord, so a held note that turns from root into fifth shows it.
 */
function VoiceGraph({ history }: { history: Played[] }) {
  const all = history.flatMap((h) => h.upper);
  let low = all.length ? Math.min(...all) - 1 : 58;
  let high = all.length ? Math.max(...all) + 1 : 70;
  if (high - low < 12) {
    const pad = (12 - (high - low)) / 2;
    low -= Math.floor(pad);
    high += Math.ceil(pad);
  }
  const y = (m: number) => PLOT_BOTTOM - ((m - low) / (high - low)) * (PLOT_BOTTOM - PLOT_TOP);
  const x = (i: number) => COL_LEFT + (i * (COL_RIGHT - COL_LEFT)) / (HISTORY - 1);
  const guides: number[] = [];
  for (let m = Math.ceil(low); m <= high; m++) if (pitchClass(m) === 0) guides.push(m);

  /** Pairs each note of `to` with the note of `from` it came from. */
  const pairs = (from: number[], to: number[]) =>
    from.length === to.length
      ? to.map((m, v) => [from[v], m] as const)
      : to.map(
          (m) => [from.reduce((a, b) => (Math.abs(b - m) < Math.abs(a - m) ? b : a)), m] as const,
        );

  return (
    <svg
      viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`}
      className={clsx(styles.svg, "mx-auto max-w-[560px] rounded-lg")}
      role="img"
      aria-label={
        history.length ? `Last chords: ${history.map((h) => h.roman).join(", ")}` : "No chords yet"
      }
    >
      <rect x={0} y={0} width={GRAPH_W} height={GRAPH_H} rx={10} fill="var(--track)" />
      {guides.map((c) => (
        <g key={c}>
          <line x1={28} x2={GRAPH_W - 8} y1={y(c)} y2={y(c)} stroke="var(--line)" />
          <text x={6} y={y(c) + 4} style={{ fontSize: 9, fill: "var(--muted)" }}>
            {noteName(c)}
          </text>
        </g>
      ))}
      <line
        x1={28}
        x2={GRAPH_W - 8}
        y1={(PLOT_BOTTOM + BASS_Y) / 2 + 2}
        y2={(PLOT_BOTTOM + BASS_Y) / 2 + 2}
        stroke="var(--line)"
        strokeDasharray="2 4"
      />
      {history.slice(1).map((h, i) => {
        const a = history[i];
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: one group per column of the graph
          <g key={`lines-${i}-${h.roman}`}>
            {pairs(a.upper, h.upper).map(([from, to]) => {
              const d = to - from;
              return (
                <g key={`${from}-${to}`}>
                  <line
                    x1={x(i)}
                    y1={y(from)}
                    x2={x(i + 1)}
                    y2={y(to)}
                    stroke="var(--ink)"
                    strokeOpacity={d === 0 ? 0.6 : 0.4}
                    strokeWidth={d === 0 ? 3.5 : 2}
                    strokeLinecap="round"
                  />
                  {d !== 0 && (
                    <text
                      x={(x(i) + x(i + 1)) / 2}
                      y={(y(from) + y(to)) / 2 - 4}
                      textAnchor="middle"
                      style={{ fontSize: 9, fill: "var(--muted)" }}
                    >
                      {d > 0 ? `+${d}` : `−${-d}`}
                    </text>
                  )}
                </g>
              );
            })}
            {a.bass !== null && h.bass !== null && (
              <line
                x1={x(i)}
                y1={BASS_Y}
                x2={x(i + 1)}
                y2={BASS_Y}
                stroke="var(--muted)"
                strokeWidth={1.4}
                strokeDasharray="3 3"
              />
            )}
          </g>
        );
      })}
      {history.map((h, i) => {
        const current = i === history.length - 1;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: one group per column of the graph
          <g key={`notes-${i}-${h.roman}`}>
            {h.upper.map((m, v) => (
              <g key={m}>
                <circle
                  cx={x(i)}
                  cy={y(m)}
                  r={DOT}
                  fill={roleColor(h.roles[v])}
                  stroke={current ? "var(--ink)" : "var(--paper)"}
                  strokeWidth={1.4}
                />
                <text
                  x={x(i)}
                  y={y(m) + 3}
                  textAnchor="middle"
                  style={{ fontSize: 8.5, fontWeight: 700, fill: "#fff" }}
                >
                  {intervalNumber(h.roles[v])}
                </text>
                {current && (
                  <text x={x(i) + DOT + 4} y={y(m) + 3.5} style={{ fontSize: 10, fontWeight: 600 }}>
                    {h.names[v]}
                  </text>
                )}
              </g>
            ))}
            {h.bass !== null && (
              <g>
                <circle
                  cx={x(i)}
                  cy={BASS_Y}
                  r={DOT}
                  fill={roleColor(0)}
                  stroke={current ? "var(--ink)" : "var(--paper)"}
                  strokeWidth={1.4}
                />
                <text
                  x={x(i)}
                  y={BASS_Y + 3}
                  textAnchor="middle"
                  style={{ fontSize: 8.5, fontWeight: 700, fill: "#fff" }}
                >
                  1
                </text>
              </g>
            )}
            <text
              x={x(i)}
              y={GRAPH_H - 8}
              textAnchor="middle"
              style={{ fontSize: 11, fontWeight: current ? 700 : 500 }}
            >
              {h.roman}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
