// Shared types and layout maths for the GPU boid swarm. No three.js, no DOM:
// everything here runs in a unit test.

export const MAX_SPECIES = 8;
export const MAX_PREDATORS = 8;
export const MAX_DYNAMIC_OBSTACLES = 8;
/** Texels a grid cell owns: each holds one boid. Niagara's "max per cell". */
export const SLOT_COLUMNS = 4;
export const SLOT_ROWS = 2;
export const SLOTS_PER_CELL = SLOT_COLUMNS * SLOT_ROWS;

export type Vec3 = readonly [number, number, number];

/** How the swim wave moves the body. */
export type SwimStyle = "fish" | "cetacean" | "ray";

export interface SwarmSpecies {
  name: string;
  count: number;
  /** Body length in world units. */
  size: number;
  cruiseSpeed: number;
  maxSpeed: number;
  /** Radians per second at cruise; avoidance and panic raise it. */
  turnRate: number;
  separation: number;
  alignment: number;
  cohesion: number;
  /** How far an individual strays from the school's destination. */
  schoolRadius: number;
  swimStyle?: SwimStyle;
  /** Scales the swim wave. Long stiff bodies want less. */
  swimAmplitude?: number;
  /** Scales how far the body curls into a turn. */
  bend?: number;
}

export interface SwarmBehavior {
  /** Neighbour search radius; also the grid cell size. */
  perception: number;
  /** Personal space in body lengths. */
  separationDistance: number;
  /** Neighbours behind this cosine are ignored for alignment and cohesion. */
  fovCos: number;
  /** Largest |y| of the heading: fish do not swim straight up or down. */
  maxPitch: number;
  goalWeight: number;
  obstacleWeight: number;
  /** Distance at which a surface starts to steer a fish, in body lengths. */
  obstacleRange: number;
  predatorWeight: number;
  /** Position drift from low-frequency noise, world units per second. */
  flow: number;
  /** How much a fish matches the speed of its neighbours, 0..1. */
  speedMatch: number;
  /** Width of the soft wall inside the bounds. */
  boundsMargin: number;
}

export const DEFAULT_BEHAVIOR: SwarmBehavior = {
  perception: 1.4,
  separationDistance: 1.6,
  fovCos: -0.3,
  maxPitch: 0.55,
  goalWeight: 0.9,
  obstacleWeight: 2.4,
  obstacleRange: 3.2,
  predatorWeight: 3.2,
  flow: 0.25,
  speedMatch: 0.5,
  boundsMargin: 4,
};

export interface SwarmBounds {
  min: Vec3;
  max: Vec3;
}

export interface SimLayout {
  width: number;
  height: number;
  total: number;
  /** First boid index of each species; species i owns [start[i], start[i+1]). */
  starts: number[];
}

/** Species occupy contiguous index ranges in a near-square texture. */
export function computeSimLayout(species: readonly Pick<SwarmSpecies, "count">[]): SimLayout {
  if (species.length > MAX_SPECIES) {
    throw new Error(`At most ${MAX_SPECIES} species, got ${species.length}`);
  }
  const starts: number[] = [0];
  for (const s of species) {
    starts.push(starts[starts.length - 1] + Math.max(0, Math.floor(s.count)));
  }
  const total = starts[starts.length - 1];
  const width = Math.max(1, Math.ceil(Math.sqrt(total)));
  const height = Math.max(1, Math.ceil(total / width));
  return { width, height, total, starts };
}

export interface GridLayout {
  cell: number;
  dim: [number, number, number];
  /** Z slices are laid out as tiles in a 2D texture. */
  tiles: [number, number];
  texWidth: number;
  texHeight: number;
}

const MAX_GRID_AXIS = 96;

/**
 * Uniform grid over the bounds with cells one perception radius wide, so a
 * boid finds every neighbour in the 27 cells around it. Cells grow when the
 * bounds would need more than MAX_GRID_AXIS of them on one axis.
 */
export function computeGridLayout(bounds: SwarmBounds, perception: number): GridLayout {
  const size = [0, 1, 2].map((a) => Math.max(1e-3, bounds.max[a] - bounds.min[a]));
  let cell = Math.max(1e-3, perception);
  cell = Math.max(cell, ...size.map((s) => s / MAX_GRID_AXIS));
  const dim = size.map((s) => Math.max(1, Math.ceil(s / cell))) as [number, number, number];
  const tilesX = Math.max(1, Math.ceil(Math.sqrt((dim[2] * dim[1]) / dim[0])));
  const tilesY = Math.ceil(dim[2] / tilesX);
  return {
    cell,
    dim,
    tiles: [tilesX, tilesY],
    texWidth: dim[0] * SLOT_COLUMNS * tilesX,
    texHeight: dim[1] * SLOT_ROWS * tilesY,
  };
}

/** Texel of a cell slot. The same maths is in the grid shaders. */
export function gridTexel(
  layout: GridLayout,
  cx: number,
  cy: number,
  cz: number,
  slot: number,
): [number, number] {
  const tileX = cz % layout.tiles[0];
  const tileY = Math.floor(cz / layout.tiles[0]);
  return [
    (tileX * layout.dim[0] + cx) * SLOT_COLUMNS + (slot % SLOT_COLUMNS),
    (tileY * layout.dim[1] + cy) * SLOT_ROWS + Math.floor(slot / SLOT_COLUMNS),
  ];
}

/** Small deterministic generator, so a seed gives the same swarm every time. */
export function createRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
