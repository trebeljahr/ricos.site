import { FLAT_NAMES, pitchColor, SHARP_NAMES } from "src/lib/piano/notes";
import styles from "./piano.module.css";

const C2 = 65.406;
const OCTAVES = 5;
const SIZE = 320;
const CENTRE = SIZE / 2;
const INNER = 34;
const STEP = 25; // radius gained per octave

export type SpiralDot = { hz: number; color: string; label?: string; ring?: boolean };

/** Angle (0 at the top, clockwise) and radius of a frequency on the spiral. */
function place(hz: number) {
  const octaves = Math.log2(hz / C2);
  const angle = (octaves % 1) * 2 * Math.PI;
  const radius = INNER + octaves * STEP;
  return {
    x: CENTRE + radius * Math.sin(angle),
    y: CENTRE - radius * Math.cos(angle),
    inside: octaves >= -0.02 && octaves <= OCTAVES + 0.02,
  };
}

/**
 * Pitch as a spiral: one turn per octave, from C2 outwards. Notes an octave
 * apart sit on the same spoke.
 */
export function PitchSpiral({
  dots,
  lines = [],
}: {
  dots: SpiralDot[];
  lines?: [number, number][];
}) {
  const path: string[] = [];
  for (let i = 0; i <= OCTAVES * 96; i++) {
    const { x, y } = place(C2 * 2 ** (i / 96));
    path.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  const outer = INNER + OCTAVES * STEP + 14;
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={styles.svg}
      role="img"
      aria-label={`Pitch spiral, one turn per octave. ${dots
        .map((d) => d.label)
        .filter(Boolean)
        .join(", ")}`}
    >
      {SHARP_NAMES.map((name, pc) => {
        const angle = (pc / 12) * 2 * Math.PI;
        const x = CENTRE + outer * Math.sin(angle);
        const y = CENTRE - outer * Math.cos(angle);
        return (
          <g key={name}>
            <line
              x1={CENTRE + (INNER - 10) * Math.sin(angle)}
              y1={CENTRE - (INNER - 10) * Math.cos(angle)}
              x2={CENTRE + (outer - 10) * Math.sin(angle)}
              y2={CENTRE - (outer - 10) * Math.cos(angle)}
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
      <path
        d={path.join(" ")}
        fill="none"
        stroke="var(--muted)"
        strokeOpacity={0.5}
        strokeWidth={1.5}
      />
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
