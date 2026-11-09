import clsx from "clsx";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { pitchClass, pitchColor } from "src/lib/piano/notes";
import {
  enharmonicFifths,
  fifthsSpan,
  keyFromFifths,
  keyName,
  keyPitchClasses,
  keySignature,
  MINOR,
  scaleNotes,
  sharedNotes,
  turnFifths,
} from "src/lib/piano/scales";
import { usePianoPlayer } from "./controls";
import type { KeyMark } from "./Keyboard";
import { PlayablePiano } from "./PlayablePiano";
import styles from "./piano.module.css";

const SIZE = 320;
const C = SIZE / 2;
const R_OUT = 150;
const R_MID = 98;
const R_IN = 64;
const RANGE: [number, number] = [53, 77]; // F3–F5
const mod = (n: number, m: number) => ((n % m) + m) % m;

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

function sector(degrees: number, inner: number, outer: number) {
  const a = polar(degrees - 15, outer);
  const b = polar(degrees + 15, outer);
  const c = polar(degrees + 15, inner);
  const d = polar(degrees - 15, inner);
  return `M${a.x} ${a.y} A${outer} ${outer} 0 0 1 ${b.x} ${b.y} L${c.x} ${c.y} A${inner} ${inner} 0 0 0 ${d.x} ${d.y} Z`;
}

/** The key printed at a wheel position (C 0, G 1 … F 11) when it is not the chosen one. */
const defaultFifths = (position: number, sharpSide: boolean) =>
  position < 6 ? position : position === 6 ? (sharpSide ? 6 : -6) : position - 12;

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * A circle of fifths you can turn: the chosen key at the top, its seven notes
 * shaded on the wheel and marked on the keyboard, its signature on a staff.
 */
export function CircleOfFifths() {
  const [state, setState] = useState({ fifths: 0, turn: 0, previous: null as number | null });
  const [display, setDisplay] = useState(0);
  const [dragging, setDragging] = useState(false);
  const shown = useRef(0);
  const live = useRef(state);
  live.current = state;
  const drag = useRef<{ last: number; rotated: number; startTurn: number; start: number } | null>(
    null,
  );
  const svg = useRef<SVGSVGElement>(null);
  const { play } = usePianoPlayer();

  const { fifths, turn, previous } = state;
  const key = keyFromFifths(fifths);
  const before = previous === null ? null : keyFromFifths(previous);
  const span = new Set(fifthsSpan(fifths));
  const spanBefore = previous === null ? span : new Set(fifthsSpan(previous));
  const position = mod(fifths, 12);

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

  const sound = (f: number) => {
    const chord = scaleNotes(keyFromFifths(f), 60);
    play([chord[0].midi, chord[2].midi, chord[4].midi], { spread: 0.02, duration: 1.2 });
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

  const goTo = (target: number) => {
    const delta = mod(target - mod(live.current.turn, 12) + 6, 12) - 6;
    if (delta !== 0) sound(stepBy(delta));
    else sound(live.current.fifths);
  };

  const respell = () => {
    const alt = enharmonicFifths(fifths);
    if (alt === null) return;
    const next = { ...state, fifths: alt, previous: fifths };
    live.current = next;
    setState(next);
    sound(alt);
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
      if (at) goTo(mod(Math.round(at.angle / 30 + shown.current), 12));
      return;
    }
    if (live.current.turn !== d.startTurn) sound(live.current.fifths);
  };

  const sharpSide = fifths >= 0;
  const labelFifths = (p: number) => (p === position ? fifths : defaultFifths(p, sharpSide));
  const notes = scaleNotes(key, 60);
  const pcs = keyPitchClasses(key);
  const entering = before ? [...pcs].filter((pc) => !keyPitchClasses(before).has(pc)) : [];
  const leaving = before ? [...keyPitchClasses(before)].filter((pc) => !pcs.has(pc)) : [];

  const marks: Record<number, KeyMark> = {};
  for (let m = RANGE[0]; m <= RANGE[1]; m++) {
    const pc = pitchClass(m);
    const note = notes.find((n) => n.pc === pc);
    if (note) marks[m] = { label: note.degree + 1, ring: entering.includes(pc) };
    else if (leaving.includes(pc))
      marks[m] = { ghost: true, color: pitchColor(pc, 0.6, 0.16), label: "" };
  }

  const alt = enharmonicFifths(fifths);
  const neighbour = (dir: 1 | -1) => keyFromFifths(turnFifths(fifths, dir)).tonic;

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
            const isTonic = p === position;
            const pc = pitchClass(7 * p);
            const name = polar(angle, 126);
            const sig = polar(angle, 106);
            const minor = polar(angle, 81);
            const count = Math.abs(f);
            return (
              <g key={p}>
                <path
                  d={sector(angle, R_MID, R_OUT)}
                  fill={
                    inKey
                      ? pitchColor(pc, isTonic ? 0.66 : 0.82, isTonic ? 0.16 : 0.08)
                      : "var(--track)"
                  }
                  stroke={before && !spanBefore.has(p) && inKey ? "var(--ink)" : "var(--paper)"}
                  strokeWidth={before && !spanBefore.has(p) && inKey ? 2.5 : 2}
                />
                {before && spanBefore.has(p) && !inKey && (
                  <path
                    d={sector(angle, R_MID + 3, R_OUT - 3)}
                    fill="none"
                    stroke="var(--muted)"
                    strokeWidth={1.2}
                    strokeDasharray="4 3"
                  />
                )}
                <path d={sector(angle, R_IN, R_MID)} fill="var(--paper)" stroke="var(--line)" />
                <text
                  x={name.x}
                  y={name.y + 6}
                  textAnchor="middle"
                  style={{
                    fontSize: isTonic ? 19 : 16,
                    fontWeight: 700,
                    fill: inKey && isTonic ? "#fff" : inKey ? "#2a241e" : "var(--muted)",
                  }}
                >
                  {keyFromFifths(f).tonic}
                </text>
                <text
                  x={sig.x}
                  y={sig.y + 3}
                  textAnchor="middle"
                  style={{ fontSize: 9, fontWeight: 600, fill: inKey ? "#4a4036" : "var(--muted)" }}
                >
                  {count === 0 ? "0" : `${count}${f > 0 ? "♯" : "♭"}`}
                </text>
                <text
                  x={minor.x}
                  y={minor.y + 4}
                  textAnchor="middle"
                  style={{ fontSize: 12, fontWeight: 600, fill: "var(--muted)" }}
                >
                  {keyFromFifths(f, MINOR).tonic.toLowerCase()}
                </text>
              </g>
            );
          })}
          <circle cx={C} cy={C} r={R_IN - 1} fill="var(--paper)" stroke="var(--line)" />
          <text x={C} y={C - 4} textAnchor="middle" style={{ fontSize: 15, fontWeight: 700 }}>
            {keyName(key)}
          </text>
          <text x={C} y={C + 14} textAnchor="middle" style={{ fontSize: 12, fill: "var(--muted)" }}>
            {keyName(keyFromFifths(fifths, MINOR))}
          </text>
          <path d={`M${C - 7} -8 L${C + 7} -8 L${C} 3 Z`} fill="var(--accent)" />
        </svg>

        <div className="min-w-0">
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
            <button
              type="button"
              className={styles.button}
              onClick={() => sound(stepBy(-1))}
              aria-label={`Turn to ${neighbour(-1)} major`}
            >
              ◀ {neighbour(-1)}
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => sound(stepBy(1))}
              aria-label={`Turn to ${neighbour(1)} major`}
            >
              {neighbour(1)} ▶
            </button>
            {alt !== null && (
              <button type="button" className={clsx(styles.button, styles.small)} onClick={respell}>
                {key.tonic} = {keyFromFifths(alt).tonic}
              </button>
            )}
            <button
              type="button"
              className={clsx(styles.button, styles.small)}
              onClick={() =>
                play([...notes.map((n) => n.midi), notes[0].midi + 12], {
                  spread: 0.16,
                  duration: 0.45,
                })
              }
            >
              Play scale
            </button>
          </div>
        </div>
      </div>
      <PlayablePiano className="mt-para" range={RANGE} marks={marks} short bar={false} />
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
