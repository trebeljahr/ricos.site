// The lagoon's solid shapes, described once and used twice: drawn by the
// scene, and baked into the obstacle field the fish swarm steers by.

import {
  type FieldObstacle,
  ObstacleField,
  obstacleDistance,
} from "../Particles/BoidSwarm/obstacleField";
import type { SwarmBounds } from "../Particles/BoidSwarm/swarmConfig";
import { WATER_LEVEL } from "./waterPresets";

export function sampleSeabedHeight(x: number, z: number): number {
  const distCenter = Math.hypot(x * 0.85, (z - 8) * 0.9);
  const lagoonShelf = 31.2 - Math.min(18.5, Math.max(0.0, (distCenter - 16.0) * 0.32));

  const trenchCoord = (x + 28) * 0.55 + (z + 25) * 0.75;
  const trenchDrop = -15.5 * (1.0 - 1.0 / (1.0 + Math.exp(-trenchCoord * 0.08)));

  const ridge1 = Math.sin(x * 0.065 + Math.cos(z * 0.055) * 1.4) * 2.2;
  const ridge2 = Math.cos(z * 0.08 - x * 0.045) * 1.6;
  const ripples = Math.sin(x * 0.38 + z * 0.22) * 0.18 + Math.cos(z * 0.52 - x * 0.3) * 0.14;

  // Emergent sea-stack mounds at (-22, -16) and (24, -20)
  const dSpire1 = Math.hypot(x + 22, z + 16);
  const spire1 = 28.5 * Math.exp(-(dSpire1 * dSpire1) / 50.0);

  const dSpire2 = Math.hypot(x - 24, z + 20);
  const spire2 = 30.5 * Math.exp(-(dSpire2 * dSpire2) / 58.0);

  // Smooth reef knolls
  const dKnoll1 = Math.hypot(x - 14, z - 10);
  const knoll1 = 5.0 * Math.exp(-(dKnoll1 * dKnoll1) / 55.0);

  const dKnoll2 = Math.hypot(x + 15, z - 12);
  const knoll2 = 4.5 * Math.exp(-(dKnoll2 * dKnoll2) / 48.0);

  return Math.max(
    2.0,
    lagoonShelf + trenchDrop + ridge1 + ridge2 + ripples + spire1 + spire2 + knoll1 + knoll2,
  );
}

/** Temple colonnade pillars: a unit cylinder scaled to `rTop` wide and `h` tall. */
export const PILLARS = [
  { pos: [-11, 29, 4], rTop: 1.15, h: 38 },
  { pos: [11, 28, 4], rTop: 1.15, h: 38 },
  { pos: [-14, 24, -22], rTop: 1.35, h: 48 },
  { pos: [15, 25, -24], rTop: 1.25, h: 46 },
  { pos: [0, 32, -32], rTop: 1.65, h: 40 },
  { pos: [-8, 16, -36], rTop: 1.25, h: 26 },
] as const satisfies readonly { pos: readonly [number, number, number]; rTop: number; h: number }[];
/** The pillar cylinder is this much wider at its foot. */
export const PILLAR_FOOT = 1.22;

/** The stone arch: half a torus in the XY plane, stretched by `scale`. */
export const ARCH = {
  position: [0, 25.5, -8],
  majorRadius: 12.2,
  tubeRadius: 2.45,
  scale: [1.0, 1.22, 0.95],
} as const;

export interface ReefFormation {
  id: string;
  kind: "boulder" | "table" | "crown";
  pos: [number, number, number];
  rot: [number, number, number];
  scale: [number, number, number];
  color: string;
  emissive: string;
  emissiveIntensity: number;
}

/** Craggy boulders, table corals and fluted reef crowns on the seabed. */
export const REEF_FORMATIONS: readonly ReefFormation[] = (() => {
  const list: ReefFormation[] = [];
  const palette = [
    { color: "#d96b78", emissive: "#b82840", glow: 0.25 },
    { color: "#e09f5a", emissive: "#b5651d", glow: 0.2 },
    { color: "#48b890", emissive: "#168060", glow: 0.3 },
    { color: "#4f8fc9", emissive: "#1c5a99", glow: 0.35 },
    { color: "#9c6ade", emissive: "#6236a8", glow: 0.32 },
  ];

  for (let i = 0; i < 44; i++) {
    const a = i * 2.39996;
    const r = 6 + Math.sqrt(i / 44) * 44;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r + 3;
    const y = sampleSeabedHeight(x, z);
    if (y < 38.5) {
      const pal = palette[i % palette.length];
      // Subtle bioluminescence only in the deep abyssal trench (y < 20)
      const depthGlowBoost = y < 20 ? 1.1 : 0.22;
      const sz = 0.65 + (i % 5) * 0.28;
      const kind = i % 3 === 0 ? "table" : i % 3 === 1 ? "crown" : "boulder";
      list.push({
        id: `reef-${i}`,
        kind,
        pos: [x, y + sz * 0.22, z],
        rot: [(i % 5) * 0.08 - 0.16, (i * 1.3) % (Math.PI * 2), ((i + 2) % 5) * 0.06 - 0.12],
        scale:
          kind === "table"
            ? [sz * 1.6, sz * 0.38, sz * 1.5]
            : kind === "crown"
              ? [sz * 0.95, sz * 0.85, sz * 0.95]
              : [sz * 1.35, sz * 0.75, sz * 1.15],
        color: kind === "boulder" ? "#6c7a76" : pal.color,
        emissive: kind === "boulder" ? "#000000" : pal.emissive,
        emissiveIntensity: kind === "boulder" ? 0 : pal.glow * depthGlowBoost,
      });
    }
  }
  return list;
})();

// ─── What the fish swarm steers by ──────────────────────────────

/** The water the swarm lives in: the lagoon, the arch and the near trench. */
export const LAGOON_BOUNDS: SwarmBounds = {
  min: [-46, 10, -50],
  max: [46, WATER_LEVEL - 1, 42],
};
/** Fish stay this far below the resting surface, under the wave troughs. */
const SURFACE_CLEARANCE = 1.8;

const ARCH_OBSTACLE: FieldObstacle = {
  kind: "arch",
  x: 0,
  y: 0,
  z: 0,
  majorRadius: ARCH.majorRadius,
  tubeRadius: ARCH.tubeRadius,
};

/** Distance to the stretched arch: exact in its unstretched space, never too large. */
function archDistance(x: number, y: number, z: number): number {
  const [sx, sy, sz] = ARCH.scale;
  return (
    obstacleDistance(
      (x - ARCH.position[0]) / sx,
      (y - ARCH.position[1]) / sy,
      (z - ARCH.position[2]) / sz,
      ARCH_OBSTACLE,
    ) * Math.min(sx, sy, sz)
  );
}

/** Half-axes of a reef formation's mesh; its small tilt is ignored. */
function formationRadii(f: ReefFormation): [number, number, number] {
  // The crown is a flat ring, the others a noisy ball of radius about 1.2.
  const [kx, ky, kz] = f.kind === "crown" ? [1.25, 0.6, 1.25] : [1.2, 1.15, 1.2];
  return [f.scale[0] * kx, f.scale[1] * ky, f.scale[2] * kz];
}

function reefDistance(x: number, y: number, z: number): number {
  // Math.sqrt, not Math.hypot: this runs 44 times per voxel of the bake.
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < REEF_ELLIPSOIDS.length; i++) {
    const e = REEF_ELLIPSOIDS[i];
    const dx = x - e.x;
    const dy = y - e.y;
    const dz = z - e.z;
    const far = Math.sqrt(dx * dx + dy * dy + dz * dz) - e.reach;
    if (far > best) continue;
    if (far > 4) {
      best = far;
      continue;
    }
    // Ellipsoid distance after Quilez: good near the surface, where it counts.
    const ux = dx / e.rx;
    const uy = dy / e.ry;
    const uz = dz / e.rz;
    const k0 = Math.sqrt(ux * ux + uy * uy + uz * uz);
    const k1 = Math.sqrt((ux / e.rx) ** 2 + (uy / e.ry) ** 2 + (uz / e.rz) ** 2);
    const d = k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(e.rx, e.ry, e.rz);
    if (d < best) best = d;
  }
  return best;
}

const REEF_ELLIPSOIDS = REEF_FORMATIONS.map((f) => {
  const [rx, ry, rz] = formationRadii(f);
  return { x: f.pos[0], y: f.pos[1], z: f.pos[2], rx, ry, rz, reach: Math.max(rx, ry, rz) };
});

export const LAGOON_OBSTACLES: readonly FieldObstacle[] = PILLARS.map((p) => ({
  kind: "cylinder",
  x: p.pos[0],
  z: p.pos[2],
  radius: p.rTop * PILLAR_FOOT,
  minY: p.pos[1] - p.h / 2,
  maxY: p.pos[1] + p.h / 2,
}));

/** Seabed, sea stacks, pillars, arch and reef, baked for the swarm. */
export function createLagoonField(voxel = 1): ObstacleField {
  const field = new ObstacleField(LAGOON_BOUNDS, voxel);
  field.bake({
    obstacles: LAGOON_OBSTACLES,
    floor: sampleSeabedHeight,
    ceiling: WATER_LEVEL - SURFACE_CLEARANCE,
    distances: [archDistance, reefDistance],
  });
  return field;
}
