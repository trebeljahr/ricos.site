import clsx from "clsx";
import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useWidth } from "src/hooks/usePianoInput";
import { formatHz, midiToHz } from "src/lib/piano/notes";
import {
  classifyPair,
  DIPS,
  dipsAt,
  HARMONIC_COUNT,
  harmonics,
  roughnessCurve,
  snapCents,
  TONE_HARMONICS,
  tickStates,
  toneRoughness,
} from "src/lib/piano/roughness";
import { type HeldTone, holdTone } from "src/lib/piano/synth";
import { PianoCheck } from "./controls";
import styles from "./piano.module.css";
import { r2, r3 } from "./svgNumbers";

const BASE_HZ = midiToHz(60);
const RED = "oklch(0.62 0.21 27)";
const GREEN = "oklch(0.66 0.17 150)";
const LEVEL = 0.16;

// Tick plot: the upper note's harmonics stand up from one line, the lower
// note's hang down from the next, on one frequency axis.
const TICKS_H = 128;
const UPPER_BASE = 64;
const LOWER_BASE = 78;
const TICK_LEN = 40;
const AXIS_MAX = (2 * HARMONIC_COUNT + 0.6) * BASE_HZ;

// Curve plot.
const CURVE_H = 170;
const PLOT_TOP = 12;
const PLOT_BOTTOM = 150;
const LABEL_ROW = 15;
const LABEL_TOP = CURVE_H + 8;

const labelWidth = (text: string) => text.length * 6.3 + 6;

/** Rows for the dip labels under the curve, fixed for all six, so a label never moves when another appears. */
function labelRows(xOf: (cents: number) => number, width: number) {
  const ends: number[] = [];
  return DIPS.map((dip) => {
    const w = labelWidth(dip.name);
    const centre = Math.min(width - w / 2, Math.max(w / 2, xOf(dip.cents)));
    const left = centre - w / 2;
    let row = ends.findIndex((end) => end < left);
    if (row === -1) row = ends.length;
    ends[row] = left + w;
    return { ...dip, centre: r2(centre), row };
  });
}

/**
 * Two notes, the upper one dragged over an octave. Their harmonics show as
 * two rows of ticks that rub or line up, and the curve below adds up the rubbing.
 */
export function Consonance() {
  const box = useRef<HTMLDivElement>(null);
  const W = Math.max(300, Math.round(useWidth(box, 640)));
  const left = 10;
  const right = W - 10;
  const xOf = (c: number) => r2(left + (c / 1200) * (right - left));
  const centsOf = (x: number) => ((x - left) / (right - left)) * 1200;
  const xOfHz = (hz: number) => r2(left + (hz / AXIS_MAX) * (right - left));

  const [cents, setCents] = useState(120);
  const [snap, setSnap] = useState(false);
  const [latched, setLatched] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [visited, setVisited] = useState<ReadonlySet<string>>(new Set());
  const tones = useRef<[HeldTone, HeldTone] | null>(null);
  const ratio = 2 ** (cents / 1200);
  const sounding = latched || dragging;

  const curve = useMemo(() => roughnessCurve(BASE_HZ), []);
  const peak = useMemo(() => Math.max(...curve.map((p) => p.roughness)), [curve]);
  const yOf = (r: number) => r2(PLOT_BOTTOM - (r / peak) * (PLOT_BOTTOM - PLOT_TOP));
  const rows = labelRows(xOf, W);
  const rowCount = Math.max(...rows.map((r) => r.row)) + 1;
  const height = LABEL_TOP + rowCount * LABEL_ROW + 4;

  useEffect(() => {
    tones.current?.[1].setFrequency(BASE_HZ * ratio, 0.01);
    const reached = dipsAt(cents);
    if (reached.length)
      setVisited((v) =>
        reached.every((d) => v.has(d.name)) ? v : new Set([...v, ...reached.map((d) => d.name)]),
      );
  }, [cents, ratio]);

  useEffect(() => {
    if (sounding && !tones.current) {
      tones.current = [
        holdTone(BASE_HZ, TONE_HARMONICS, LEVEL),
        holdTone(BASE_HZ * 2 ** (cents / 1200), TONE_HARMONICS, LEVEL),
      ];
    } else if (!sounding && tones.current) {
      for (const tone of tones.current) tone.stop();
      tones.current = null;
    }
  }, [sounding, cents]);

  useEffect(
    () => () => {
      tones.current?.forEach((tone) => {
        tone.stop();
      });
      tones.current = null;
    },
    [],
  );

  const toggleSnap = (on: boolean) => {
    setSnap(on);
    if (on) setCents((c) => snapCents(c, true));
  };

  const pick = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * W;
    setCents(Math.round(snapCents(centsOf(x), snap) * 2) / 2);
  };

  const ticks = tickStates(BASE_HZ, ratio);
  const lowerHz = harmonics(BASE_HZ);
  const upperHz = harmonics(BASE_HZ * ratio);
  const links: {
    key: string;
    x1: number;
    x2: number;
    state: "together" | "rubbing";
    strength: number;
  }[] = [];
  lowerHz.forEach((lo, i) => {
    upperHz.forEach((up, j) => {
      const pair = classifyPair(lo, up);
      const { state, strength } = pair;
      if (state === "apart") return;
      links.push({ key: `${i}-${j}`, x1: xOfHz(lo), x2: xOfHz(up), state, strength });
    });
  });
  const together = ticks.upper.filter((t) => t.state === "together").length;
  const rubbing = links.filter((l) => l.state === "rubbing").length;

  const tickColor = (state: string) =>
    state === "together" ? GREEN : state === "rubbing" ? RED : "var(--ink)";

  const path = curve
    .map(
      (p, i) => `${i === 0 ? "M" : "L"}${xOf(p.cents).toFixed(1)} ${yOf(p.roughness).toFixed(1)}`,
    )
    .join(" ");
  const here = toneRoughness(BASE_HZ, ratio);

  return (
    <section className={clsx(styles.panel, "not-prose")} aria-label="Why two notes clash">
      <div ref={box} className="min-w-0">
        <svg
          viewBox={`0 0 ${W} ${TICKS_H}`}
          className={styles.svg}
          role="img"
          aria-label={`Harmonics of both notes: ${together} land together, ${rubbing} pairs rub.`}
        >
          <text x={left} y={12} style={{ fontSize: 11, fill: "var(--muted)" }}>
            upper note
          </text>
          <text x={left} y={TICKS_H - 4} style={{ fontSize: 11, fill: "var(--muted)" }}>
            lower note
          </text>
          <line
            x1={left}
            x2={right}
            y1={UPPER_BASE}
            y2={UPPER_BASE}
            className={styles.faint}
            strokeWidth={1}
          />
          <line
            x1={left}
            x2={right}
            y1={LOWER_BASE}
            y2={LOWER_BASE}
            className={styles.faint}
            strokeWidth={1}
          />
          {links.map((link) =>
            link.state === "together" ? (
              <line
                key={link.key}
                x1={link.x1}
                x2={link.x2}
                y1={LOWER_BASE}
                y2={UPPER_BASE}
                stroke={GREEN}
                strokeWidth={3}
              />
            ) : (
              <polygon
                key={link.key}
                points={`${link.x1 - 2},${LOWER_BASE} ${link.x1 + 2},${LOWER_BASE} ${link.x2 + 2},${UPPER_BASE} ${link.x2 - 2},${UPPER_BASE}`}
                fill={RED}
                opacity={r3(0.25 + 0.6 * link.strength)}
              />
            ),
          )}
          {(
            [
              [ticks.upper, UPPER_BASE, -1],
              [ticks.lower, LOWER_BASE, 1],
            ] as const
          ).map(([row, base, dir]) =>
            row.map((tick) => {
              const x = xOfHz(tick.hz);
              if (x > right + 1) return null;
              const len = r2(TICK_LEN * (0.35 + 0.65 * TONE_HARMONICS[tick.harmonic - 1]));
              const color = tickColor(tick.state);
              return (
                <g key={`${dir}-${tick.harmonic}`}>
                  {tick.state !== "apart" && (
                    <line
                      x1={x}
                      x2={x}
                      y1={base}
                      y2={r2(base + dir * len)}
                      stroke={color}
                      strokeWidth={9}
                      strokeLinecap="round"
                      opacity={tick.state === "together" ? 0.3 : r3(0.15 + 0.35 * tick.strength)}
                    />
                  )}
                  <line
                    x1={x}
                    x2={x}
                    y1={base}
                    y2={r2(base + dir * len)}
                    stroke={color}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                </g>
              );
            }),
          )}
        </svg>
      </div>

      <div
        className="mt-label min-w-0 cursor-ew-resize touch-none select-none"
        role="slider"
        tabIndex={0}
        aria-label="Upper note"
        aria-valuemin={BASE_HZ}
        aria-valuemax={BASE_HZ * 2}
        aria-valuenow={Math.round(BASE_HZ * ratio)}
        aria-valuetext={[formatHz(BASE_HZ * ratio), ...dipsAt(cents).map((d) => d.name)].join(", ")}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          setDragging(true);
          pick(event);
        }}
        onPointerMove={(event) => {
          if (dragging) pick(event);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onLostPointerCapture={() => setDragging(false)}
        onKeyDown={(event) => {
          const step = snap ? 100 : event.shiftKey ? 1 : 10;
          let next: number;
          if (event.key === "ArrowRight" || event.key === "ArrowUp") next = cents + step;
          else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = cents - step;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = 1200;
          else return;
          event.preventDefault();
          setCents(snapCents(next, snap));
        }}
      >
        <svg viewBox={`0 0 ${W} ${height}`} className={styles.svg} aria-hidden="true">
          <rect
            x={left}
            y={PLOT_TOP}
            width={right - left}
            height={PLOT_BOTTOM - PLOT_TOP}
            rx={8}
            fill="var(--track)"
          />
          <text x={left + 6} y={PLOT_TOP + 14} style={{ fontSize: 11, fill: "var(--muted)" }}>
            rough
          </text>
          <text x={left + 6} y={PLOT_BOTTOM - 6} style={{ fontSize: 11, fill: "var(--muted)" }}>
            smooth
          </text>
          {snap &&
            Array.from({ length: 13 }, (_, k) => {
              const c = k * 100;
              const y = yOf(toneRoughness(BASE_HZ, 2 ** (c / 1200)));
              return (
                <g key={c}>
                  <line
                    x1={xOf(c)}
                    x2={xOf(c)}
                    y1={PLOT_BOTTOM}
                    y2={PLOT_BOTTOM + 8}
                    stroke="var(--muted)"
                    strokeWidth={1.5}
                  />
                  <circle cx={xOf(c)} cy={y} r={3} fill="var(--muted)" />
                </g>
              );
            })}
          <path d={path} fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" />
          {rows
            .filter((dip) => visited.has(dip.name))
            .map((dip) => {
              const x = xOf(dip.cents);
              const y = LABEL_TOP + dip.row * LABEL_ROW;
              return (
                <g key={dip.name}>
                  <line
                    x1={x}
                    x2={x}
                    y1={yOf(toneRoughness(BASE_HZ, dip.ratio[0] / dip.ratio[1])) + 4}
                    y2={y - 4}
                    stroke="var(--accent)"
                    strokeWidth={1}
                    strokeDasharray="2 3"
                  />
                  <text
                    x={dip.centre}
                    y={y + 6}
                    textAnchor="middle"
                    style={{ fontSize: 11, fontWeight: 700, fill: "var(--accent)" }}
                  >
                    {dip.name}
                  </text>
                </g>
              );
            })}
          <line
            x1={xOf(cents)}
            x2={xOf(cents)}
            y1={PLOT_TOP}
            y2={PLOT_BOTTOM}
            stroke="var(--accent)"
            strokeWidth={2}
          />
          <circle
            cx={xOf(cents)}
            cy={yOf(here)}
            r={dragging ? 11 : 9}
            fill="var(--accent)"
            stroke="var(--paper)"
            strokeWidth={2.5}
          />
        </svg>
      </div>

      <div className="mt-para flex flex-wrap items-center gap-label">
        <button
          type="button"
          className={clsx(styles.button, styles.primary)}
          aria-pressed={sounding}
          onClick={() => {
            if (sounding) {
              setLatched(false);
              setDragging(false);
            } else setLatched(true);
          }}
        >
          {sounding ? "Stop" : "Play both"}
        </button>
        <PianoCheck label="Snap to the piano keys" checked={snap} onChange={toggleSnap} />
      </div>
    </section>
  );
}
