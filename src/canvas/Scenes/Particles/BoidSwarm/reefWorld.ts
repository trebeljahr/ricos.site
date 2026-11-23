// The demo's world: a seabed, pillars, an arch, boulders and one free-form
// mesh, described once and used twice — baked into the obstacle field the
// fish steer by, and drawn by the scene.

import { type BufferGeometry, Matrix4, TorusKnotGeometry } from "three";
import { meshDistance } from "./meshDistance";
import { type FieldObstacle, ObstacleField } from "./obstacleField";
import type { SwarmBounds, SwarmSpecies } from "./swarmConfig";

export const REEF_BOUNDS: SwarmBounds = { min: [-34, -12, -34], max: [34, 12, 34] };
export const REEF_SURFACE = 11.5;

export function reefFloor(x: number, z: number): number {
  return (
    -9.6 +
    1.5 * Math.sin(x * 0.11) * Math.cos(z * 0.09) +
    0.8 * Math.sin(x * 0.23 + 1.3) * Math.sin(z * 0.19 + 0.4) +
    2.2 * Math.exp(-((x + 16) ** 2 + (z - 14) ** 2) / 90)
  );
}

export const REEF_OBSTACLES: readonly FieldObstacle[] = [
  { kind: "cylinder", x: -14, z: -10, radius: 1.5, maxY: 8 },
  { kind: "cylinder", x: -9, z: -15, radius: 1.1, maxY: 5 },
  { kind: "cylinder", x: 12, z: -14, radius: 1.8, maxY: 9.5 },
  { kind: "cylinder", x: 18, z: -6, radius: 1.2, maxY: 4 },
  { kind: "cylinder", x: -20, z: 8, radius: 1.3, maxY: 6.5 },
  { kind: "cylinder", x: 4, z: 18, radius: 1.6, maxY: 7.5 },
  { kind: "arch", x: 0, y: -9.5, z: -2, majorRadius: 8, tubeRadius: 1.4, yaw: 0.35 },
  { kind: "sphere", x: -6, y: -8.6, z: 9, radius: 3.2 },
  { kind: "sphere", x: 22, y: -8.8, z: 16, radius: 4 },
  { kind: "sphere", x: -24, y: -8.2, z: -20, radius: 3.6 },
];

export interface ReefMesh {
  geometry: BufferGeometry;
  matrix: Matrix4;
}

export interface ReefWorld {
  bounds: SwarmBounds;
  field: ObstacleField;
  obstacles: readonly FieldObstacle[];
  /** Free-form geometry, baked from its triangles. */
  meshes: readonly ReefMesh[];
}

export function createReefWorld(): ReefWorld {
  const knot: ReefMesh = {
    geometry: new TorusKnotGeometry(2.4, 0.75, 48, 6),
    matrix: new Matrix4().makeTranslation(15, -3.5, 8),
  };
  const field = new ObstacleField(REEF_BOUNDS, 0.72);
  field.bake({
    obstacles: REEF_OBSTACLES,
    floor: reefFloor,
    ceiling: REEF_SURFACE,
    distances: [
      meshDistance(
        {
          positions: knot.geometry.getAttribute("position").array,
          index: knot.geometry.index?.array,
          matrix: knot.matrix.elements,
        },
        3,
      ),
    ],
  });
  return { bounds: REEF_BOUNDS, field, obstacles: REEF_OBSTACLES, meshes: [knot] };
}

/** The models of the fish pack, in the order of `reefSpecies`. */
export const REEF_MODELS = ["Fish1", "Fish2", "Fish3", "Dolphin", "Manta_ray"] as const;

/** Room for a school of `count` fish about a body length and a half apart. */
function schoolRadius(count: number, size: number): number {
  return Math.min(12, Math.max(3.5, Math.cbrt(count) * size * 1.1));
}

/** Three schools of small fish and two kinds of large swimmers. */
export function reefSpecies(fishCount: number): SwarmSpecies[] {
  const a = Math.round(fishCount * 0.4);
  const b = Math.round(fishCount * 0.33);
  const c = Math.max(0, fishCount - a - b);
  return [
    {
      name: "Fish1",
      count: a,
      size: 0.5,
      cruiseSpeed: 2.6,
      maxSpeed: 7,
      turnRate: 2.8,
      separation: 1.7,
      alignment: 1.0,
      cohesion: 0.9,
      schoolRadius: schoolRadius(a, 0.5),
    },
    {
      name: "Fish2",
      count: b,
      size: 0.42,
      cruiseSpeed: 2.2,
      maxSpeed: 6.5,
      turnRate: 3.2,
      separation: 1.6,
      alignment: 1.2,
      cohesion: 1.1,
      schoolRadius: schoolRadius(b, 0.42),
    },
    {
      name: "Fish3",
      count: c,
      size: 0.3,
      cruiseSpeed: 1.8,
      maxSpeed: 6,
      turnRate: 3.6,
      separation: 1.9,
      alignment: 0.8,
      cohesion: 0.8,
      schoolRadius: schoolRadius(c, 0.3),
    },
    {
      name: "Dolphin",
      count: 9,
      size: 2.6,
      cruiseSpeed: 3.6,
      maxSpeed: 8,
      turnRate: 1.5,
      separation: 1.2,
      alignment: 0.9,
      cohesion: 0.7,
      schoolRadius: 6,
      swimStyle: "cetacean",
      swimAmplitude: 0.8,
      bend: 1.2,
    },
    {
      name: "Manta_ray",
      count: 5,
      size: 3.2,
      cruiseSpeed: 1.7,
      maxSpeed: 4,
      turnRate: 0.9,
      separation: 1.2,
      alignment: 0.5,
      cohesion: 0.4,
      schoolRadius: 9,
      swimStyle: "ray",
      swimAmplitude: 1,
      bend: 0.5,
    },
  ];
}
