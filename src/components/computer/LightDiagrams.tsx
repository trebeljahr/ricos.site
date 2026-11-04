import { dot, normalize, scaled, subtract, type Vec3 } from "src/lib/computer/graphics/matrix";
import { type Material, sample } from "src/lib/computer/graphics/shading";
import styles from "./Graphics.module.css";
import { fixed } from "./GraphicsParts";

const shadeOf = (level: number) => {
  const value = Math.round(30 + Math.max(0, Math.min(1, level)) * 225);
  return `rgb(${value},${value},${Math.round(value * 0.96)})`;
};

/**
 * A slice through the surface, with its normals. The outline never changes, only
 * the arrows do, and the brightness along the outline follows the arrows.
 */
export function NormalProfile({
  segments,
  mode,
  light,
  mat,
  useMap,
}: {
  /** How many flat pieces make the curve. Zero for a flat wall. */
  segments: number;
  mode: "face" | "corner" | "pixel";
  light: Vec3;
  mat: Material;
  useMap: boolean;
}) {
  const width = 520;
  const height = 190;
  const centerX = width / 2;
  const baseY = height - 18;
  const radius = 135;
  const flat = segments === 0;
  const pieces = flat ? 1 : segments;
  const corner = (i: number) => {
    if (flat) return { x: 40 + (i / pieces) * (width - 80), y: baseY - 40, nx: 0, ny: 1 };
    const angle = Math.PI - (i / pieces) * Math.PI;
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    return { x: centerX + nx * radius, y: baseY - ny * radius, nx, ny };
  };
  const lightDirection = normalize([light[0], light[1], 0]);
  const samplesPerPiece = Math.max(2, Math.ceil(72 / pieces));
  const texel = [0, 0, 0];
  const segmentsOut: { x0: number; y0: number; x1: number; y1: number; level: number }[] = [];
  const arrows: { x: number; y: number; nx: number; ny: number; key: string }[] = [];
  const arrowEvery = Math.max(1, Math.round((pieces * samplesPerPiece) / 22));
  let counter = 0;
  for (let piece = 0; piece < pieces; piece++) {
    const a = corner(piece);
    const b = corner(piece + 1);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy) || 1;
    for (let s = 0; s < samplesPerPiece; s++) {
      const t = (s + 0.5) / samplesPerPiece;
      const along = (piece + t) / pieces;
      // Screen rows count down, so the outward side of a left-to-right edge is this.
      let nx = dy / length;
      let ny = dx / length;
      if (mode !== "face") {
        nx = a.nx + (b.nx - a.nx) * t;
        ny = a.ny + (b.ny - a.ny) * t;
        const l = Math.hypot(nx, ny) || 1;
        nx /= l;
        ny /= l;
      }
      if (useMap) {
        // One row of the real normal map, leaning this slice's arrow along the surface.
        sample(mat.normal, along * 2, 0.3, false, texel);
        const tangentX = ny;
        const tangentY = -nx;
        const bentX = tangentX * texel[0] + nx * texel[2];
        const bentY = tangentY * texel[0] + ny * texel[2];
        const l = Math.hypot(bentX, bentY) || 1;
        nx = bentX / l;
        ny = bentY / l;
      }
      let level = Math.max(0, nx * lightDirection[0] + ny * lightDirection[1]);
      if (mode === "corner") {
        // The light was worked out at the two corners, and slides between them.
        const la = Math.max(0, a.nx * lightDirection[0] + a.ny * lightDirection[1]);
        const lb = Math.max(0, b.nx * lightDirection[0] + b.ny * lightDirection[1]);
        level = la + (lb - la) * t;
      }
      const x0 = a.x + (dx * s) / samplesPerPiece;
      const y0 = a.y + (dy * s) / samplesPerPiece;
      const x1 = a.x + (dx * (s + 1)) / samplesPerPiece;
      const y1 = a.y + (dy * (s + 1)) / samplesPerPiece;
      segmentsOut.push({ x0, y0, x1, y1, level });
      const showArrow =
        mode === "pixel"
          ? counter % arrowEvery === 0
          : mode === "face"
            ? s === Math.floor(samplesPerPiece / 2)
            : false;
      if (showArrow && pieces <= 40) {
        arrows.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, nx, ny, key: `${piece}-${s}` });
      }
      counter++;
    }
    if (mode === "corner") {
      arrows.push({ x: a.x, y: a.y, nx: a.nx, ny: a.ny, key: `c${piece}` });
      if (piece === pieces - 1) arrows.push({ x: b.x, y: b.y, nx: b.nx, ny: b.ny, key: "last" });
    }
  }
  const sourceX = centerX + lightDirection[0] * (radius + 26);
  const sourceY = Math.min(height - 8, baseY - lightDirection[1] * (radius + 26));
  return (
    <svg
      className={styles.diagram}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`A slice through the surface with one normal per ${mode === "corner" ? "vertex" : mode}.`}
    >
      {segmentsOut.map((segment, i) => (
        <line
          key={i}
          x1={segment.x0}
          y1={segment.y0}
          x2={segment.x1}
          y2={segment.y1}
          stroke={shadeOf(segment.level)}
          strokeWidth={7}
          strokeLinecap="round"
        />
      ))}
      {arrows.map(({ x, y, nx, ny, key }) => (
        <line
          key={key}
          x1={x}
          y1={y}
          x2={x + nx * 24}
          y2={y - ny * 24}
          stroke="#ffd166"
          strokeWidth={1.4}
        />
      ))}
      <g>
        <line
          x1={sourceX}
          y1={sourceY}
          x2={sourceX - lightDirection[0] * 30}
          y2={sourceY + lightDirection[1] * 30}
          stroke="#fff6c4"
          strokeWidth={2}
        />
        <circle cx={sourceX} cy={sourceY} r={7} fill="#fff6c4" stroke="#f4b13e" strokeWidth={1.5} />
      </g>
    </svg>
  );
}

/**
 * One point of the surface from the side, with the surface laid flat. The same
 * beam of light lands wider the more it slants, and so lights each bit of surface
 * less; that spreading is the N·L in the sum.
 */
export function LightBeam({
  normal,
  toLight,
  toEye,
  halfway,
  nDotL,
  shininess,
}: {
  normal: Vec3;
  toLight: Vec3;
  toEye: Vec3;
  halfway: Vec3;
  nDotL: number;
  shininess: number;
}) {
  const width = 520;
  const height = 210;
  const centerX = width / 2;
  const baseY = height - 34;
  const length = 130;
  const across = subtract(toLight, scaled(normal, dot(toLight, normal)));
  const side = dot(across, across) > 1e-6 ? normalize(across) : ([1, 0, 0] as Vec3);
  // Every direction seen in the plane of the normal and the light.
  const flatten = (v: Vec3) => {
    const x = dot(v, side);
    const y = dot(v, normal);
    const l = Math.hypot(x, y) || 1;
    return { x: x / l, y: y / l };
  };
  const toScreen = (d: { x: number; y: number }, r = length) => ({
    x: centerX + d.x * r,
    y: baseY - d.y * r,
  });
  const L = flatten(toLight);
  const V = flatten(toEye);
  const H = flatten(halfway);
  const lit = nDotL > 0;

  // The beam has a fixed width across itself. Where it lands, it is 1 ÷ N·L as wide.
  const beamHalf = 34;
  const landed = lit ? Math.min(240, beamHalf / Math.max(nDotL, 0.1)) : 0;
  const beamPoints = lit
    ? [
        `${centerX - landed},${baseY}`,
        `${centerX + landed},${baseY}`,
        `${centerX + landed + L.x * 300},${baseY - L.y * 300}`,
        `${centerX - landed + L.x * 300},${baseY - L.y * 300}`,
      ].join(" ")
    : "";
  // The highlight's shape: how much shine each direction of H around the normal would give.
  const lobe: string[] = [];
  for (let degrees = -90; degrees <= 90; degrees += 3) {
    const a = (degrees * Math.PI) / 180;
    const r = Math.cos(a) ** shininess * 90;
    lobe.push(`${(centerX + Math.sin(a) * r).toFixed(1)},${(baseY - Math.cos(a) * r).toFixed(1)}`);
  }
  const arrows = [
    { name: "N", d: { x: 0, y: 1 }, color: "#ffd166" },
    { name: "L", d: L, color: "#fff6c4" },
    { name: "V", d: V, color: "#6cb8ff" },
    { name: "H", d: H, color: "#38e1ff" },
  ];
  return (
    <svg
      className={styles.diagram}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Light meets this pixel's surface with N dot L of ${fixed(nDotL)}.`}
    >
      {lit && <polygon points={beamPoints} fill="#fff6c41f" stroke="none" />}
      <polygon points={lobe.join(" ")} fill="#38e1ff26" stroke="#38e1ff" strokeWidth={1} />
      <line x1={20} x2={width - 20} y1={baseY} y2={baseY} stroke="#5a6580" strokeWidth={3} />
      {lit && (
        <line
          x1={centerX - landed}
          x2={centerX + landed}
          y1={baseY}
          y2={baseY}
          stroke={shadeOf(nDotL)}
          strokeWidth={7}
        />
      )}
      {arrows.map(({ name, d, color }) => {
        const tip = toScreen(d);
        return (
          <g key={name}>
            <line x1={centerX} y1={baseY} x2={tip.x} y2={tip.y} stroke={color} strokeWidth={2} />
            <circle cx={tip.x} cy={tip.y} r={3} fill={color} />
            <text x={tip.x + 6} y={tip.y - 2} fill={color}>
              {name}
            </text>
          </g>
        );
      })}
      <text x={20} y={height - 10} fill="#8d97ad">
        N·L {fixed(nDotL)} · WIDTH ×{lit ? fixed(1 / Math.max(nDotL, 0.01), 1) : "—"}
      </text>
    </svg>
  );
}
