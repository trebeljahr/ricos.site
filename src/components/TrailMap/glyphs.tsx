import type { Glyph, MarkKind } from "./routes";

/**
 * Line drawings in the style of an old map, centred on 0 0: peaks shaded by
 * hatching on their right flanks, marsh grass over short strokes of water, a
 * river as two banks, and the sea.
 */
const GLYPHS: Record<Glyph, { d: string; width?: number }[]> = {
  range: [
    {
      d: "M -19 6 L -10 -6 L -5 0 M -8 6 L 1 -11 L 10 6 M 7 1 L 12 -5 L 19 6 M -7.6 -3.5 L -8.2 0 M 3.6 -6.5 L 2.6 -1.5 M 6 -2.5 L 5 2 M 8.2 1.5 L 7.6 4.5 M 14 -2.2 L 13.5 1.5 M 16.2 1 L 15.8 4.2",
    },
  ],
  peaks: [
    {
      d: "M -14 6 L -5 -9 L 3 4 M 0 0 L 6 -6 L 14 6 M -2.8 -5.5 L -3.6 -1 M -0.6 -1.8 L -1.4 2.5 M 8 -3.5 L 7.4 0.5 M 10.3 -0.2 L 9.8 3.4",
    },
  ],
  marsh: [
    {
      d: "M -16 2 L -8 2 M -12 2 L -12 -4 M -14 2 L -15.5 -2 M -10 2 L -8.5 -2 M 0 -4 L 8 -4 M 4 -4 L 4 -10 M 2 -4 L 0.5 -8 M 6 -4 L 7.5 -8 M 6 7 L 14 7 M 10 7 L 10 1 M 8 7 L 6.5 3 M 12 7 L 13.5 3 M -6 8 L -1 8 M 15 -1 L 19 -1 M -20 -5 L -17 -5",
    },
  ],
  river: [
    { d: "M -26 -10 C -18 -14, -14 -2, -7 -4 S 2 -12, 8 -5 S 14 6, 24 3" },
    { d: "M -24 -6.5 C -17 -10, -14 1, -7 -0.5 S 2 -8.5, 8 -1.5 S 14 9.5, 24 6.6", width: 0.7 },
  ],
  waves: [
    {
      d: "M -18 -3 q 4.5 -4 9 0 t 9 0 t 9 0 t 9 0 M -9 6 q 4.5 -4 9 0 t 9 0 t 9 0",
      width: 1.25,
    },
  ],
};

const CARDINALS = [0, 90, 180, 270];
const DIAGONALS = [45, 135, 225, 315];

/** `delay` plays the entrance after that many ms; without it the marker is simply there. */
const entrance = (className: string, delay?: number) =>
  delay === undefined ? {} : { className, style: { animationDelay: `${Math.round(delay)}ms` } };

/** An eight-point compass rose. The star swings in and settles on north like a needle. */
const Compass = ({ r, delay }: { r: number; delay?: number }) => {
  const tick = (angle: number, from: number, to: number) => {
    const rad = (angle * Math.PI) / 180;
    return `M ${from * Math.sin(rad)} ${-from * Math.cos(rad)} L ${to * Math.sin(rad)} ${-to * Math.cos(rad)}`;
  };
  // One point of the star, split down the middle: one half filled, one outlined.
  const point = (angle: number, length: number, half: number) => (
    <g key={angle} transform={`rotate(${angle})`}>
      <path d={`M 0 ${-length} L ${half} ${-half} L 0 0 Z`} fill="currentColor" />
      <path d={`M 0 ${-length} L ${-half} ${-half} L 0 0 Z`} fill="none" />
    </g>
  );
  return (
    <g stroke="currentColor" strokeLinejoin="round">
      <g {...entrance("trail-fade", delay)} fill="none">
        <circle r={r * 0.66} strokeWidth={1.25} />
        <circle r={r * 0.58} strokeWidth={0.75} />
        <path
          d={Array.from({ length: 32 }, (_, i) =>
            tick(i * 11.25, r * 0.58, r * (i % 4 === 0 ? 0.66 : 0.62)),
          ).join(" ")}
          strokeWidth={0.75}
        />
        <text
          y={-r * 0.74}
          textAnchor="middle"
          stroke="none"
          fill="currentColor"
          className="font-serif italic"
          fontSize={r * 0.29}
        >
          N
        </text>
      </g>
      <g {...entrance("trail-needle", delay)} strokeWidth={0.9}>
        {DIAGONALS.map((angle) => point(angle, r * 0.4, r * 0.072))}
        {CARDINALS.map((angle) => point(angle, r * 0.63, r * 0.105))}
        <circle r={r * 0.05} fill="currentColor" stroke="none" />
      </g>
    </g>
  );
};

type MarkerProps = {
  kind: MarkKind;
  x: number;
  y: number;
  compassRadius: number;
  delay?: number;
};

export const Marker = ({ kind, x, y, compassRadius, delay }: MarkerProps) => (
  <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
    {kind === "compass" ? (
      <Compass r={compassRadius} delay={delay} />
    ) : (
      <g
        {...entrance("trail-fade", delay)}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {GLYPHS[kind].map(({ d, width = 1.2 }) => (
          <path key={d} d={d} strokeWidth={width} />
        ))}
      </g>
    )}
  </g>
);
