import clsx from "clsx";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { pitchClass, pitchColor, roleColor } from "src/lib/piano/notes";
import {
  atOrAbove,
  enharmonicFifths,
  fifthsSpan,
  type Key,
  keyFromFifths,
  keyName,
  keyOn,
  keyPitchClasses,
  keySignature,
  MAJOR,
  MINOR,
  relativeKey,
  scaleNotes,
  sharedNotes,
  turnFifths,
} from "src/lib/piano/scales";
import { PianoSwitch, usePianoPlayer } from "./controls";
import type { KeyMark } from "./Keyboard";
import { PlayablePiano } from "./PlayablePiano";
import styles from "./piano.module.css";

const SIZE = 320;
const C = SIZE / 2;
const R_OUT = 150;
const R_MID = 98;
const R_IN = 64;
const RANGE: [number, number] = [53, 77]; // F3–F5
/** A key picked on the wheel starts its scale in G3–F♯4. */
const LOW = 55;
const mod = (n: number, m: number) => ((n % m) + m) % m;

type Ring = "major" | "minor";
const RINGS = [
  { value: "major", label: "Major" },
  { value: "minor", label: "Minor" },
] as const satisfies readonly { value: Ring; label: string }[];
const modeOf = (ring: Ring) => (ring === "minor" ? MINOR : MAJOR);

/**
 * Screen point at a clockwise angle from the top, in degrees. Rounded, so the
 * server and the browser print the same numbers (their sines differ in the
 * last digit, which React reports as a hydration mismatch).
 */
const polar = (degrees: number, radius: number) => {
  const a = (degrees * Math.PI) / 180;
  const round = (n: number) => Math.round(n * 100) / 100;
  return { x: round(C + radius * Math.sin(a)), y: round(C - radius * Math.cos(a)) };
};

/** A ring segment from one angle to another, clockwise. */
function band(start: number, end: number, inner: number, outer: number) {
  const a = polar(start, outer);
  const b = polar(end, outer);
  const c = polar(end, inner);
  const d = polar(start, inner);
  const large = end - start > 180 ? 1 : 0;
  return `M${a.x} ${a.y} A${outer} ${outer} 0 ${large} 1 ${b.x} ${b.y} L${c.x} ${c.y} A${inner} ${inner} 0 ${large} 0 ${d.x} ${d.y} Z`;
}

const sector = (degrees: number, inner: number, outer: number) =>
  band(degrees - 15, degrees + 15, inner, outer);

/** The key printed at a wheel position (C 0, G 1 … F 11) when it is not the chosen one. */
const defaultFifths = (position: number, sharpSide: boolean) =>
  position < 6 ? position : position === 6 ? (sharpSide ? 6 : -6) : position - 12;

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * A circle of fifths you can turn: the chosen key, major on the outer ring or
 * minor on the inner one, at the top. Its seven notes are the seven
 * neighbouring note names inside one outline, coloured by their role in the
 * key, and marked on the keyboard; its signature is on a staff.
 */
export function CircleOfFifths() {
  const [state, setState] = useState({ fifths: 0, turn: 0, previous: null as number | null });
  const [ring, setRing] = useState<Ring>("major");
  const [picked, setPicked] = useState<number | null>(null);
  const [display, setDisplay] = useState(0);
  const [dragging, setDragging] = useState(false);
  const shown = useRef(0);
  const live = useRef(state);
  live.current = state;
  const drag = useRef<{ last: number; rotated: number; startTurn: number; start: number } | null>(
    null,
  );
  const svg = useRef<SVGSVGElement>(null);
  const { play, playChords, sounding } = usePianoPlayer();

  const { fifths, turn, previous } = state;
  const mode = modeOf(ring);
  const key = keyFromFifths(fifths, mode);
  const before = previous === null ? null : keyFromFifths(previous, mode);
  const span = new Set(fifthsSpan(fifths));
  const position = mod(fifths, 12);
  // A key pressed on the keyboard starts the scale there; otherwise it sits low on the keyboard.
  const tonicOf = (k: Key) => atOrAbove(k.tonicPc, LOW);
  const tonic = picked !== null && pitchClass(picked) === key.tonicPc ? picked : tonicOf(key);

  // Ease the wheel to its resting angle, unless a finger is turning it.
  useEffect(() => {
    if (dragging) return;
    const from = shown.current;
    if (from === turn) return;
    if (reducedMotion()) {
      shown.current = turn;
      setDisplay(turn);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 320);
      const value = from + (turn - from) * (1 - (1 - t) ** 3);
      shown.current = value;
      setDisplay(value);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [turn, dragging]);

  /** The key's triad. */
  const sound = (f: number, r: Ring = ring) => {
    const k = keyFromFifths(f, modeOf(r));
    const chord = scaleNotes(k, tonicOf(k));
    play([chord[0].midi, chord[2].midi, chord[4].midi], { spread: 0.02, duration: 1.2 });
  };

  /** The key's scale up to the octave, one note at a time. */
  const playScale = (k: Key, from: number) => {
    const scale = scaleNotes(k, from);
    playChords(
      [...scale.map((n) => n.midi), from + 12].map((m) => [m]),
      0.18,
    );
  };

  /** Turns by whole steps; `previous` stays where the gesture began. */
  const stepBy = (steps: number, from = live.current.fifths) => {
    let { fifths: f, turn: t } = live.current;
    const dir = steps > 0 ? 1 : -1;
    for (let i = 0; i < Math.abs(steps); i++) {
      f = turnFifths(f, dir);
      t += dir;
    }
    const next = { fifths: f, turn: t, previous: from };
    live.current = next;
    setState(next);
    return f;
  };

  /** Turns to a wheel position, the short way round; `exact` picks its spelling. */
  const goTo = (target: number, exact?: number) => {
    const delta = mod(target - mod(live.current.turn, 12) + 6, 12) - 6;
    if (delta !== 0) stepBy(delta);
    if (exact !== undefined && exact !== live.current.fifths) {
      const next = { ...live.current, fifths: exact };
      live.current = next;
      setState(next);
    }
    return live.current.fifths;
  };

  const respell = () => {
    const alt = enharmonicFifths(fifths);
    if (alt === null) return;
    const next = { ...state, fifths: alt, previous: fifths };
    live.current = next;
    setState(next);
    sound(alt);
  };

  const chooseRing = (r: Ring) => {
    if (r === ring) return;
    setRing(r);
    sound(live.current.fifths, r);
  };

  /** A key pressed on the keyboard: its scale in the chosen ring, from that key. */
  const pickKey = (midi: number) => {
    const k = keyOn(pitchClass(midi), mode);
    setPicked(midi);
    goTo(mod(k.fifths, 12), k.fifths);
    playScale(k, midi);
  };

  const angleAt = (event: PointerEvent) => {
    const box = svg.current?.getBoundingClientRect();
    if (!box) return null;
    const scale = SIZE / box.width;
    const dx = (event.clientX - box.left) * scale - C;
    const dy = (event.clientY - box.top) * scale - C;
    return { angle: (Math.atan2(dx, -dy) * 180) / Math.PI, radius: Math.hypot(dx, dy) };
  };

  const down = (event: PointerEvent<SVGSVGElement>) => {
    const at = angleAt(event);
    if (!at || at.radius < R_IN || at.radius > R_OUT + 8) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the browser no longer tracks: turn without capture.
    }
    drag.current = {
      last: at.angle,
      rotated: 0,
      startTurn: live.current.turn,
      start: live.current.fifths,
    };
    shown.current = live.current.turn;
    setDragging(true);
  };

  const move = (event: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    const at = angleAt(event);
    if (!d || !at) return;
    d.rotated += mod(at.angle - d.last + 180, 360) - 180;
    d.last = at.angle;
    const value = d.startTurn - d.rotated / 30;
    shown.current = value;
    setDisplay(value);
    const target = Math.round(value);
    if (target !== live.current.turn) stepBy(target - live.current.turn, d.start);
  };

  const up = (event: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setDragging(false);
    if (Math.abs(d.rotated) < 4) {
      const at = angleAt(event);
      if (!at) return;
      // A tap picks the ring it lands on, and the key under it.
      const r: Ring = at.radius < R_MID ? "minor" : "major";
      setRing(r);
      sound(goTo(mod(Math.round(at.angle / 30 + shown.current), 12)), r);
      return;
    }
    if (live.current.turn !== d.startTurn) sound(live.current.fifths);
  };

  const sharpSide = fifths >= 0;
  const labelFifths = (p: number) => (p === position ? fifths : defaultFifths(p, sharpSide));
  const notes = scaleNotes(key, tonic);
  const pcs = keyPitchClasses(key);
  const entering = before ? [...pcs].filter((pc) => !keyPitchClasses(before).has(pc)) : [];
  const leaving = before ? [...keyPitchClasses(before)].filter((pc) => !pcs.has(pc)) : [];
  const isMinor = ring === "minor";

  const marks: Record<number, KeyMark> = {};
  for (const pc of leaving)
    marks[atOrAbove(pc, tonic)] = { ghost: true, color: pitchColor(pc, 0.6, 0.16), label: "" };
  for (const n of notes)
    marks[n.midi] = {
      label: n.label,
      ring: entering.includes(n.pc),
      color: roleColor(n.midi - tonic),
    };
  marks[tonic + 12] = { label: "1", color: roleColor(0) };

  const alt = enharmonicFifths(fifths);
  const neighbour = (dir: 1 | -1) => keyFromFifths(turnFifths(fifths, dir), mode);
  // The seven note names of the key: one fifth below the major tonic to five above.
  const arcStart = (position - 1 - display) * 30 - 15;

  return (
    <section className={clsx(styles.panel, "not-prose")} aria-label="Circle of fifths">
      <div className="grid gap-para md:grid-cols-[minmax(0,320px)_1fr] md:items-center">
        <svg
          ref={svg}
          viewBox={`-4 -10 ${SIZE + 8} ${SIZE + 14}`}
          className={clsx(styles.svg, "mx-auto max-w-[320px] select-none")}
          style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
          role="img"
          aria-label={`Circle of fifths turned to ${keyName(key)}`}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          {Array.from({ length: 12 }, (_, p) => {
            const angle = (p - display) * 30;
            const f = labelFifths(p);
            const inKey = span.has(p);
            const isTop = p === position;
            const pc = pitchClass(7 * p);
            const isRoot = inKey && pc === key.tonicPc;
            const name = polar(angle, 126);
            const sig = polar(angle, 106);
            const minor = polar(angle, 81);
            const count = Math.abs(f);
            const minorChosen = isMinor && isTop;
            return (
              <g key={p}>
                <path
                  d={sector(angle, R_MID, R_OUT)}
                  fill={
                    inKey
                      ? roleColor(
                          mod(pc - key.tonicPc, 12),
                          isRoot ? 0.66 : 0.86,
                          isRoot ? 0.16 : 0.07,
                        )
                      : "var(--track)"
                  }
                  stroke="var(--paper)"
                  strokeWidth={2}
                />
                <path
                  d={sector(angle, R_IN, R_MID)}
                  fill={minorChosen ? roleColor(0, 0.66, 0.16) : "var(--paper)"}
                  stroke="var(--line)"
                />
                <text
                  x={name.x}
                  y={name.y + 6}
                  textAnchor="middle"
                  style={{
                    fontSize: isTop && !isMinor ? 19 : 16,
                    fontWeight: 700,
                    fill: isRoot ? "#fff" : inKey ? "#2a241e" : "var(--muted)",
                  }}
                >
                  {keyFromFifths(f).tonic}
                </text>
                <text
                  x={sig.x}
                  y={sig.y + 3}
                  textAnchor="middle"
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    fill: isRoot ? "#fff" : inKey ? "#4a4036" : "var(--muted)",
                  }}
                >
                  {count === 0 ? "0" : `${count}${f > 0 ? "♯" : "♭"}`}
                </text>
                <text
                  x={minor.x}
                  y={minor.y + 4}
                  textAnchor="middle"
                  style={{
                    fontSize: minorChosen ? 15 : 12,
                    fontWeight: isMinor ? 700 : 500,
                    fill: minorChosen ? "#fff" : isMinor ? "var(--ink)" : "var(--muted)",
                  }}
                >
                  {keyFromFifths(f, MINOR).tonic.toLowerCase()}
                </text>
              </g>
            );
          })}
          <path
            d={band(arcStart, arcStart + 210, R_MID, R_OUT)}
            fill="none"
            stroke="var(--ink)"
            strokeWidth={2.5}
            strokeLinejoin="round"
            pointerEvents="none"
          />
          <circle cx={C} cy={C} r={R_IN - 1} fill="var(--paper)" stroke="var(--line)" />
          <text x={C} y={C - 4} textAnchor="middle" style={{ fontSize: 15, fontWeight: 700 }}>
            {keyName(key)}
          </text>
          <text x={C} y={C + 14} textAnchor="middle" style={{ fontSize: 12, fill: "var(--muted)" }}>
            {keyName(relativeKey(key))}
          </text>
          <path d={`M${C - 7} -8 L${C + 7} -8 L${C} 3 Z`} fill="var(--accent)" />
        </svg>

        <div className="min-w-0">
          <PianoSwitch label="Ring" value={ring} options={RINGS} onChange={chooseRing} />
          <KeySignatureStaff fifths={fifths} />
          <p className={clsx(styles.mono, "mt-hair text-sm")} aria-live="polite">
            {keySignature(fifths)
              .map((s) => s.name)
              .join(" ") || "no sharps or flats"}
          </p>
          <dl className="mt-label grid grid-cols-2 gap-label">
            <div className={clsx(styles.readout, styles.wordy)}>
              <dt>notes</dt>
              <dd className={styles.mono}>{notes.map((n) => n.spelled).join(" ")}</dd>
            </div>
            <div className={styles.readout}>
              <dt>{before ? `shared with ${keyName(before)}` : "shared with the last key"}</dt>
              <dd>{before ? `${sharedNotes(before, key)} of 7` : "—"}</dd>
            </div>
          </dl>
          <div className="mt-para flex flex-wrap gap-tight">
            {([-1, 1] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                className={styles.button}
                onClick={() => sound(stepBy(dir))}
                aria-label={`Turn to ${keyName(neighbour(dir))}`}
              >
                {dir < 0 ? `◀ ${neighbour(dir).tonic}` : `${neighbour(dir).tonic} ▶`}
              </button>
            ))}
            {alt !== null && (
              <button type="button" className={clsx(styles.button, styles.small)} onClick={respell}>
                {key.tonic} = {keyFromFifths(alt, mode).tonic}
              </button>
            )}
            <button
              type="button"
              className={clsx(styles.button, styles.small)}
              onClick={() => playScale(key, tonic)}
            >
              Play scale
            </button>
          </div>
        </div>
      </div>
      <PlayablePiano
        className="mt-para"
        range={RANGE}
        marks={marks}
        down={sounding}
        sound={false}
        onNoteOn={pickKey}
        short
        bar={false}
      />
    </section>
  );
}

const STAFF_BOTTOM = 70;
const STEP = 5;

/** A treble staff with a key signature's sharps or flats in their usual places. */
function KeySignatureStaff({ fifths }: { fifths: number }) {
  const marks = keySignature(fifths);
  const y = (step: number) => STAFF_BOTTOM - step * STEP;
  return (
    <svg
      viewBox="0 0 200 96"
      className={clsx(styles.svg, "max-w-[260px]")}
      role="img"
      aria-label={`Key signature: ${marks.length ? marks.map((m) => m.name).join(", ") : "none"}`}
    >
      {[0, 2, 4, 6, 8].map((step) => (
        <line
          key={step}
          x1={4}
          x2={196}
          y1={y(step)}
          y2={y(step)}
          stroke="var(--ink)"
          strokeWidth={1}
          opacity={0.7}
        />
      ))}
      <text
        x={6}
        y={78}
        style={{
          fontSize: 95,
          fill: "var(--ink)",
          fontFamily: '"Noto Music", "Apple Symbols", "Segoe UI Symbol", "Bravura Text", serif',
        }}
      >
        𝄞
      </text>
      {marks.map((m, i) => (
        <text
          key={m.name}
          x={50 + i * 13}
          y={y(m.step) + (m.accidental === "♭" ? 3 : 6)}
          textAnchor="middle"
          style={{ fontSize: m.accidental === "♭" ? 22 : 20, fontWeight: 500, fill: "var(--ink)" }}
        >
          {m.accidental}
        </text>
      ))}
    </svg>
  );
}
