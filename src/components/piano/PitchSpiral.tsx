import type { PointerEvent } from "react";
import { FLAT_NAMES, pitchColor, SHARP_NAMES } from "src/lib/piano/notes";
import styles from "./piano.module.css";
import { r2 } from "./svgNumbers";

const C2 = 65.406;
const OCTAVES = 5;
const SIZE = 320;
const CENTRE = SIZE / 2;
const INNER = 34;
const STEP = 25; // radius gained per octave
const SAMPLES_PER_OCTAVE = 240;
/** How far from the spiral line, in drawing units, a tap still counts. */
const REACH = 14;

export type SpiralDot = { hz: number; color: string; label?: string; ring?: boolean };

/** Angle (0 at the top, clockwise) and radius of a frequency on the spiral. */
function place(hz: number) {
  const octaves = Math.log2(hz / C2);
  const angle = (octaves % 1) * 2 * Math.PI;
  const radius = INNER + octaves * STEP;
  return {
    x: r2(CENTRE + radius * Math.sin(angle)),
    y: r2(CENTRE - radius * Math.cos(angle)),
    inside: octaves >= -0.02 && octaves <= OCTAVES + 0.02,
  };
}

const SAMPLES = Array.from({ length: OCTAVES * SAMPLES_PER_OCTAVE + 1 }, (_, i) => {
  const hz = C2 * 2 ** (i / SAMPLES_PER_OCTAVE);
  return { hz, ...place(hz) };
});

/** The frequency on the spiral line nearest to a point, or null when the point is off the line. */
export function spiralFrequencyAt(x: number, y: number) {
  let best: (typeof SAMPLES)[number] | null = null;
  let bestDistance = REACH;
  for (const s of SAMPLES) {
    const d = Math.hypot(s.x - x, s.y - y);
    if (d < bestDistance) {
      best = s;
      bestDistance = d;
    }
  }
  return best?.hz ?? null;
}

/**
 * Pitch as a spiral: one turn per octave, from C2 outwards. Notes an octave
 * apart sit on the same spoke. With `onPick`, tapping the line picks the
 * frequency under the finger.
 */
export function PitchSpiral({
  dots,
  lines = [],
  onPick,
}: {
  dots: SpiralDot[];
  lines?: [number, number][];
  onPick?: (hz: number) => void;
}) {
  const path = SAMPLES.filter((_, i) => i % 3 === 0)
    .map((s, i) => `${i === 0 ? "M" : "L"}${s.x.toFixed(1)} ${s.y.toFixed(1)}`)
    .join(" ");
  const outer = INNER + OCTAVES * STEP + 14;

  const pick = (event: PointerEvent<SVGSVGElement>) => {
    if (!onPick) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * SIZE;
    const y = ((event.clientY - rect.top) / rect.height) * SIZE;
    const hz = spiralFrequencyAt(x, y);
    if (hz) onPick(hz);
  };

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={styles.svg}
      style={onPick ? { cursor: "pointer", touchAction: "manipulation" } : undefined}
      role="img"
      aria-label={`Pitch spiral, one turn per octave. ${dots
        .map((d) => d.label)
        .filter(Boolean)
        .join(", ")}`}
      onPointerDown={onPick ? pick : undefined}
    >
      {SHARP_NAMES.map((name, pc) => {
        const angle = (pc / 12) * 2 * Math.PI;
        const x = r2(CENTRE + outer * Math.sin(angle));
        const y = r2(CENTRE - outer * Math.cos(angle));
        return (
          <g key={name}>
            <line
              x1={r2(CENTRE + (INNER - 10) * Math.sin(angle))}
              y1={r2(CENTRE - (INNER - 10) * Math.cos(angle))}
              x2={r2(CENTRE + (outer - 10) * Math.sin(angle))}
              y2={r2(CENTRE - (outer - 10) * Math.cos(angle))}
              className={styles.faint}
              strokeWidth={1}
            />
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fill: pitchColor(pc, 0.62, 0.15), fontWeight: 700, fontSize: 12 }}
            >
              {name.length > 1 ? FLAT_NAMES[pc] : name}
            </text>
          </g>
        );
      })}
      {onPick && (
        // A wide, invisible copy of the line, so a finger does not have to hit it exactly.
        <path d={path} fill="none" stroke="transparent" strokeWidth={REACH * 2} />
      )}
      <path d={path} fill="none" stroke="var(--muted)" strokeOpacity={0.5} strokeWidth={1.5} />
      {lines.map(([a, b]) => {
        const p = place(a);
        const q = place(b);
        return (
          <line
            key={`${a}-${b}`}
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            stroke="var(--ink)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        );
      })}
      {dots.map((dot, i) => {
        const p = place(dot.hz);
        if (!p.inside) return null;
        return (
          <circle
            // biome-ignore lint/suspicious/noArrayIndexKey: dots can share a frequency
            key={i}
            cx={p.x}
            cy={p.y}
            r={dot.ring ? 8 : 6.5}
            fill={dot.color}
            stroke={dot.ring ? "var(--ink)" : "var(--paper)"}
            strokeWidth={2}
          />
        );
      })}
    </svg>
  );
}
