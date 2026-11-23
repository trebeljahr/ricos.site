// A baked signed distance field of everything a fish must not swim through.
// Each voxel holds the distance to the nearest surface and the direction away
// from it, so the simulation asks "how close, and which way out?" with one
// texture read, whatever the geometry is. The same arrays answer on the CPU
// for predators and school leaders.

import type { SwarmBounds, Vec3 } from "./swarmConfig";

export type FieldObstacle =
  | { kind: "sphere"; x: number; y: number; z: number; radius: number }
  | { kind: "cylinder"; x: number; z: number; radius: number; minY?: number; maxY?: number }
  | {
      /** Half torus standing in the XY plane, rotated by `yaw` around Y. */
      kind: "arch";
      x: number;
      y: number;
      z: number;
      majorRadius: number;
      tubeRadius: number;
      yaw?: number;
    };

/** Signed distance from a point to any shape; negative inside. */
export type DistanceFunction = (x: number, y: number, z: number) => number;

export interface FieldSource {
  obstacles?: readonly FieldObstacle[];
  /** Seabed height at (x, z). Water is above it. */
  floor?: (x: number, z: number) => number;
  /** Water surface height. Water is below it. */
  ceiling?: number;
  /** Extra shapes, for example meshes through `meshDistance`. */
  distances?: readonly DistanceFunction[];
}

export function obstacleDistance(x: number, y: number, z: number, o: FieldObstacle): number {
  if (o.kind === "sphere") {
    return Math.hypot(x - o.x, y - o.y, z - o.z) - o.radius;
  }
  if (o.kind === "cylinder") {
    const radial = Math.hypot(x - o.x, z - o.z) - o.radius;
    const minY = o.minY ?? Number.NEGATIVE_INFINITY;
    const maxY = o.maxY ?? Number.POSITIVE_INFINITY;
    const vertical = Math.max(minY - y, y - maxY);
    if (radial <= 0 && vertical <= 0) return Math.max(radial, vertical);
    return Math.hypot(Math.max(radial, 0), Math.max(vertical, 0));
  }
  const yaw = o.yaw ?? 0;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const dx = x - o.x;
  const dz = z - o.z;
  const lx = dx * c + dz * s;
  const lz = -dx * s + dz * c;
  const ly = y - o.y;
  // Below the springing line the nearest ring point is one of the two feet.
  let px: number;
  let py: number;
  if (ly < 0) {
    px = lx >= 0 ? o.majorRadius : -o.majorRadius;
    py = 0;
  } else {
    const ring = Math.hypot(lx, ly);
    if (ring > 1e-6) {
      px = (lx / ring) * o.majorRadius;
      py = (ly / ring) * o.majorRadius;
    } else {
      px = o.majorRadius;
      py = 0;
    }
  }
  return Math.hypot(lx - px, ly - py, lz) - o.tubeRadius;
}

function sourceDistance(x: number, y: number, z: number, source: FieldSource): number {
  let d = Number.POSITIVE_INFINITY;
  const obstacles = source.obstacles;
  if (obstacles) {
    for (let i = 0; i < obstacles.length; i++) {
      const od = obstacleDistance(x, y, z, obstacles[i]);
      if (od < d) d = od;
    }
  }
  const floor = source.floor;
  if (floor) {
    // Height above a sloped floor overstates the distance; the slope fixes it.
    const e = 0.25;
    const h = floor(x, z);
    const gx = (floor(x + e, z) - floor(x - e, z)) / (2 * e);
    const gz = (floor(x, z + e) - floor(x, z - e)) / (2 * e);
    const fd = (y - h) / Math.sqrt(1 + gx * gx + gz * gz);
    if (fd < d) d = fd;
  }
  if (source.ceiling !== undefined) {
    const cd = source.ceiling - y;
    if (cd < d) d = cd;
  }
  const distances = source.distances;
  if (distances) {
    for (let i = 0; i < distances.length; i++) {
      const md = distances[i](x, y, z);
      if (md < d) d = md;
    }
  }
  return d;
}

export interface FieldSample {
  distance: number;
  nx: number;
  ny: number;
  nz: number;
}

export class ObstacleField {
  readonly min: Vec3;
  readonly size: Vec3;
  readonly dim: readonly [number, number, number];
  /** Four floats per voxel: outward normal xyz, signed distance. */
  readonly data: Float32Array;
  /** Bumped by every bake, so users know when to upload again. */
  version = 0;

  constructor(bounds: SwarmBounds, voxel = 0.75, maxAxis = 96) {
    this.min = bounds.min;
    const size: [number, number, number] = [
      bounds.max[0] - bounds.min[0],
      bounds.max[1] - bounds.min[1],
      bounds.max[2] - bounds.min[2],
    ];
    this.size = size;
    this.dim = size.map((s) => Math.min(maxAxis, Math.max(2, Math.ceil(s / voxel) + 1))) as [
      number,
      number,
      number,
    ];
    this.data = new Float32Array(this.dim[0] * this.dim[1] * this.dim[2] * 4);
    this.clear();
  }

  /** Open water: far from everything, pointing up. */
  clear(): void {
    const far = Math.max(this.size[0], this.size[1], this.size[2]);
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i] = 0;
      this.data[i + 1] = 1;
      this.data[i + 2] = 0;
      this.data[i + 3] = far;
    }
    this.version++;
  }

  bake(source: FieldSource): void {
    const [nx, ny, nz] = this.dim;
    const data = this.data;
    const sx = this.size[0] / (nx - 1);
    const sy = this.size[1] / (ny - 1);
    const sz = this.size[2] / (nz - 1);
    for (let k = 0; k < nz; k++) {
      const z = this.min[2] + k * sz;
      for (let j = 0; j < ny; j++) {
        const y = this.min[1] + j * sy;
        let o = (k * ny + j) * nx * 4 + 3;
        for (let i = 0; i < nx; i++, o += 4) {
          data[o] = sourceDistance(this.min[0] + i * sx, y, z, source);
        }
      }
    }
    // Normals from central differences of the baked distances.
    const at = (i: number, j: number, k: number) =>
      data[
        ((k < 0 ? 0 : k >= nz ? nz - 1 : k) * ny + (j < 0 ? 0 : j >= ny ? ny - 1 : j)) * nx * 4 +
          (i < 0 ? 0 : i >= nx ? nx - 1 : i) * 4 +
          3
      ];
    for (let k = 0; k < nz; k++) {
      for (let j = 0; j < ny; j++) {
        let o = (k * ny + j) * nx * 4;
        for (let i = 0; i < nx; i++, o += 4) {
          const gx = (at(i + 1, j, k) - at(i - 1, j, k)) / sx;
          const gy = (at(i, j + 1, k) - at(i, j - 1, k)) / sy;
          const gz = (at(i, j, k + 1) - at(i, j, k - 1)) / sz;
          const len = Math.hypot(gx, gy, gz);
          if (len > 1e-6) {
            data[o] = gx / len;
            data[o + 1] = gy / len;
            data[o + 2] = gz / len;
          } else {
            data[o] = 0;
            data[o + 1] = 1;
            data[o + 2] = 0;
          }
        }
      }
    }
    this.version++;
  }

  /** Trilinear read, clamped to the volume like the texture is. */
  sample(x: number, y: number, z: number, out: FieldSample): FieldSample {
    const [nx, ny, nz] = this.dim;
    const fx = clamp(((x - this.min[0]) / this.size[0]) * (nx - 1), 0, nx - 1);
    const fy = clamp(((y - this.min[1]) / this.size[1]) * (ny - 1), 0, ny - 1);
    const fz = clamp(((z - this.min[2]) / this.size[2]) * (nz - 1), 0, nz - 1);
    const i0 = Math.min(nx - 2, Math.floor(fx));
    const j0 = Math.min(ny - 2, Math.floor(fy));
    const k0 = Math.min(nz - 2, Math.floor(fz));
    const tx = fx - i0;
    const ty = fy - j0;
    const tz = fz - k0;
    const data = this.data;
    let d = 0;
    let ax = 0;
    let ay = 0;
    let az = 0;
    for (let c = 0; c < 8; c++) {
      const di = c & 1;
      const dj = (c >> 1) & 1;
      const dk = c >> 2;
      const w = (di ? tx : 1 - tx) * (dj ? ty : 1 - ty) * (dk ? tz : 1 - tz);
      const o = (((k0 + dk) * ny + j0 + dj) * nx + i0 + di) * 4;
      ax += data[o] * w;
      ay += data[o + 1] * w;
      az += data[o + 2] * w;
      d += data[o + 3] * w;
    }
    const len = Math.hypot(ax, ay, az) || 1;
    out.distance = d;
    out.nx = ax / len;
    out.ny = ay / len;
    out.nz = az / len;
    return out;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
