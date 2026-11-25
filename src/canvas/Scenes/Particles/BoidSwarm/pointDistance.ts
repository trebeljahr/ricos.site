// Distance to a mesh that need not be closed: the hull of a wreck, a sail, a
// fence. The triangles are covered with sample points and the distance to
// the nearest point, less a skin thickness, stands in for the surface. Fish
// keep off every face and may still swim through real openings.

import type { TriangleSoup } from "./meshDistance";
import type { DistanceFunction } from "./obstacleField";
import type { SwarmBounds } from "./swarmConfig";

/** World-space points at most about `spacing` apart on every triangle. */
export function surfacePoints(soups: readonly TriangleSoup[], spacing = 0.5): Float32Array {
  const out: number[] = [];
  const corner = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const { positions, index, matrix } of soups) {
    const triCount = Math.floor((index ? index.length : positions.length / 3) / 3);
    for (let t = 0; t < triCount; t++) {
      for (let c = 0; c < 3; c++) {
        const v = index ? index[t * 3 + c] : t * 3 + c;
        const x = positions[v * 3];
        const y = positions[v * 3 + 1];
        const z = positions[v * 3 + 2];
        if (matrix) {
          corner[c * 3] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
          corner[c * 3 + 1] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
          corner[c * 3 + 2] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
        } else {
          corner[c * 3] = x;
          corner[c * 3 + 1] = y;
          corner[c * 3 + 2] = z;
        }
      }
      const [ax, ay, az, bx, by, bz, cx, cy, cz] = corner;
      const longest = Math.max(
        Math.hypot(bx - ax, by - ay, bz - az),
        Math.hypot(cx - bx, cy - by, cz - bz),
        Math.hypot(ax - cx, ay - cy, az - cz),
      );
      const steps = Math.max(1, Math.min(64, Math.ceil(longest / spacing)));
      for (let i = 0; i <= steps; i++) {
        for (let j = 0; j <= steps - i; j++) {
          const u = i / steps;
          const v = j / steps;
          const w = 1 - u - v;
          out.push(ax * w + bx * u + cx * v, ay * w + by * u + cy * v, az * w + bz * u + cz * v);
        }
      }
    }
  }
  return new Float32Array(out);
}

export interface PointsDistance {
  distance: DistanceFunction;
  /** The box around all points. */
  bounds: SwarmBounds;
}

/**
 * Distance to the nearest of `points`, less `thickness`. Exact within
 * `reach` of a point; further out it returns a value that is at least
 * `reach - thickness`, which is all a field bake needs.
 */
export function pointsDistance(points: Float32Array, thickness = 0.3, reach = 3): PointsDistance {
  const count = Math.floor(points.length / 3);
  const lo: [number, number, number] = [Infinity, Infinity, Infinity];
  const hi: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < count; i++) {
    for (let a = 0; a < 3; a++) {
      const value = points[i * 3 + a];
      if (value < lo[a]) lo[a] = value;
      if (value > hi[a]) hi[a] = value;
    }
  }
  // Buckets one `reach` wide: the nearest point within reach is in the 27 around.
  const nx = Math.max(1, Math.ceil((hi[0] - lo[0]) / reach));
  const ny = Math.max(1, Math.ceil((hi[1] - lo[1]) / reach));
  const nz = Math.max(1, Math.ceil((hi[2] - lo[2]) / reach));
  const buckets: number[][] = [];
  const bucketOf = (ix: number, iy: number, iz: number) => (iz * ny + iy) * nx + ix;
  const cellOf = (value: number, axis: number, n: number) =>
    Math.max(0, Math.min(n - 1, Math.floor((value - lo[axis]) / reach)));
  for (let i = 0; i < count; i++) {
    const key = bucketOf(
      cellOf(points[i * 3], 0, nx),
      cellOf(points[i * 3 + 1], 1, ny),
      cellOf(points[i * 3 + 2], 2, nz),
    );
    let bucket = buckets[key];
    if (!bucket) {
      bucket = [];
      buckets[key] = bucket;
    }
    bucket.push(i * 3);
  }

  const distance: DistanceFunction = (x, y, z) => {
    const bx = Math.max(lo[0] - x, 0, x - hi[0]);
    const by = Math.max(lo[1] - y, 0, y - hi[1]);
    const bz = Math.max(lo[2] - z, 0, z - hi[2]);
    const box = Math.sqrt(bx * bx + by * by + bz * bz);
    if (box > reach || count === 0) return Math.max(box, reach) - thickness;
    const fx = (x - lo[0]) / reach;
    const fy = (y - lo[1]) / reach;
    const fz = (z - lo[2]) / reach;
    let best = reach * reach;
    for (let iz = Math.floor(fz) - 1; iz <= Math.floor(fz) + 1; iz++) {
      if (iz < 0 || iz >= nz) continue;
      for (let iy = Math.floor(fy) - 1; iy <= Math.floor(fy) + 1; iy++) {
        if (iy < 0 || iy >= ny) continue;
        for (let ix = Math.floor(fx) - 1; ix <= Math.floor(fx) + 1; ix++) {
          if (ix < 0 || ix >= nx) continue;
          const bucket = buckets[bucketOf(ix, iy, iz)];
          if (!bucket) continue;
          for (let k = 0; k < bucket.length; k++) {
            const o = bucket[k];
            const dx = points[o] - x;
            const dy = points[o + 1] - y;
            const dz = points[o + 2] - z;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < best) best = d2;
          }
        }
      }
    }
    return Math.sqrt(best) - thickness;
  };
  return { distance, bounds: { min: lo, max: hi } };
}
