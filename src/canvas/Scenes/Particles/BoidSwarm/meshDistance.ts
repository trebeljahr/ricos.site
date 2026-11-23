// Signed distance to a closed triangle mesh, for baking arbitrary geometry
// into the obstacle field. Exact near the mesh, a cheap lower bound far from
// it: the field only steers fish within a few body lengths of a surface.

import type { DistanceFunction } from "./obstacleField";

export interface TriangleSoup {
  /** xyz per vertex. */
  positions: ArrayLike<number>;
  index?: ArrayLike<number> | null;
  /** Column-major 4×4 world matrix, as in three's `Matrix4.elements`. */
  matrix?: ArrayLike<number>;
}

export function meshDistance(soup: TriangleSoup, exactWithin = 6): DistanceFunction {
  const { positions, index, matrix } = soup;
  const vertexCount = Math.floor(positions.length / 3);
  const world = new Float64Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    if (matrix) {
      world[i * 3] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
      world[i * 3 + 1] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
      world[i * 3 + 2] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
    } else {
      world[i * 3] = x;
      world[i * 3 + 1] = y;
      world[i * 3 + 2] = z;
    }
  }
  const triCount = index ? Math.floor(index.length / 3) : Math.floor(vertexCount / 3);
  const tris = new Float64Array(triCount * 9);
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let t = 0; t < triCount; t++) {
    for (let c = 0; c < 3; c++) {
      const v = index ? index[t * 3 + c] : t * 3 + c;
      for (let a = 0; a < 3; a++) {
        const value = world[v * 3 + a];
        tris[t * 9 + c * 3 + a] = value;
        if (value < lo[a]) lo[a] = value;
        if (value > hi[a]) hi[a] = value;
      }
    }
  }

  return (x, y, z) => {
    const bx = Math.max(lo[0] - x, 0, x - hi[0]);
    const by = Math.max(lo[1] - y, 0, y - hi[1]);
    const bz = Math.max(lo[2] - z, 0, z - hi[2]);
    const boxDistance = Math.hypot(bx, by, bz);
    if (boxDistance > exactWithin) return boxDistance;

    let best = Infinity;
    let crossings = 0;
    for (let o = 0; o < tris.length; o += 9) {
      const d2 = pointTriangleDistanceSq(x, y, z, tris, o);
      if (d2 < best) best = d2;
      if (rayCrossesTriangle(x, y, z, tris, o)) crossings++;
    }
    const distance = Math.sqrt(best);
    return crossings % 2 === 1 ? -distance : distance;
  };
}

/** Does the ray from the point along +X pass through the triangle? */
function rayCrossesTriangle(
  px: number,
  py: number,
  pz: number,
  t: Float64Array,
  o: number,
): boolean {
  // Tiny irrational offsets keep the ray off shared edges and vertices.
  const y = py + 1.2345e-7;
  const z = pz + 2.3456e-7;
  const ay = t[o + 1] - y;
  const az = t[o + 2] - z;
  const by = t[o + 4] - y;
  const bz = t[o + 5] - z;
  const cy = t[o + 7] - y;
  const cz = t[o + 8] - z;
  const w0 = by * cz - bz * cy;
  const w1 = cy * az - cz * ay;
  const w2 = ay * bz - az * by;
  if ((w0 < 0 || w1 < 0 || w2 < 0) && (w0 > 0 || w1 > 0 || w2 > 0)) return false;
  const sum = w0 + w1 + w2;
  if (sum === 0) return false;
  const hitX = (w0 * t[o] + w1 * t[o + 3] + w2 * t[o + 6]) / sum;
  return hitX > px;
}

/** Closest point on a triangle, after Ericson, "Real-Time Collision Detection". */
function pointTriangleDistanceSq(
  px: number,
  py: number,
  pz: number,
  t: Float64Array,
  o: number,
): number {
  const ax = t[o];
  const ay = t[o + 1];
  const az = t[o + 2];
  const abx = t[o + 3] - ax;
  const aby = t[o + 4] - ay;
  const abz = t[o + 5] - az;
  const acx = t[o + 6] - ax;
  const acy = t[o + 7] - ay;
  const acz = t[o + 8] - az;
  const apx = px - ax;
  const apy = py - ay;
  const apz = pz - az;

  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  let v: number;
  let w: number;
  if (d1 <= 0 && d2 <= 0) {
    v = 0;
    w = 0;
  } else {
    const bpx = apx - abx;
    const bpy = apy - aby;
    const bpz = apz - abz;
    const d3 = abx * bpx + aby * bpy + abz * bpz;
    const d4 = acx * bpx + acy * bpy + acz * bpz;
    const cpx = apx - acx;
    const cpy = apy - acy;
    const cpz = apz - acz;
    const d5 = abx * cpx + aby * cpy + abz * cpz;
    const d6 = acx * cpx + acy * cpy + acz * cpz;
    const vc = d1 * d4 - d3 * d2;
    const vb = d5 * d2 - d1 * d6;
    const va = d3 * d6 - d5 * d4;
    if (d3 >= 0 && d4 <= d3) {
      v = 1;
      w = 0;
    } else if (d6 >= 0 && d5 <= d6) {
      v = 0;
      w = 1;
    } else if (vc <= 0 && d1 >= 0 && d3 <= 0) {
      v = d1 / (d1 - d3);
      w = 0;
    } else if (vb <= 0 && d2 >= 0 && d6 <= 0) {
      v = 0;
      w = d2 / (d2 - d6);
    } else if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
      w = (d4 - d3) / (d4 - d3 + (d5 - d6));
      v = 1 - w;
    } else {
      const denom = 1 / (va + vb + vc);
      v = vb * denom;
      w = vc * denom;
    }
  }
  const dx = apx - (abx * v + acx * w);
  const dy = apy - (aby * v + acy * w);
  const dz = apz - (abz * v + acz * w);
  return dx * dx + dy * dy + dz * dz;
}
