import { cross, length, subtract, type Vec2, type Vec3 } from "./matrix";
import type { Mesh, Triangle } from "./meshes";

/**
 * Flattening a mesh along seams, by least squares conformal maps (Lévy et al., 2002):
 * find the flat position for every corner that keeps each triangle's angles as true
 * as it can. A surface that can lie flat, like an opened box, comes out exact. One
 * that cannot, like a sphere, comes out stretched, and without enough cuts it folds.
 */

export const edgeKey = (a: number, b: number, count: number) =>
  Math.min(a, b) * count + Math.max(a, b);

export type WeldedMesh = { positions: readonly Vec3[]; triangles: readonly Triangle[] };

/** Merges vertices at one position, because a seam is what should decide where a mesh splits. */
export function weld(mesh: Pick<Mesh, "positions" | "triangles">): WeldedMesh {
  const seen = new Map<string, number>();
  const remap: number[] = [];
  const positions: Vec3[] = [];
  mesh.positions.forEach((p) => {
    // Rounded to whole steps, because "-0.0000" and "0.0000" are the same place.
    const key = p.map((v) => Math.round(v * 1e4) || 0).join(",");
    let index = seen.get(key);
    if (index === undefined) {
      index = positions.length;
      seen.set(key, index);
      positions.push(p);
    }
    remap.push(index);
  });
  const triangles: Triangle[] = [];
  for (const [a, b, c] of mesh.triangles) {
    const t: Triangle = [remap[a], remap[b], remap[c]];
    if (t[0] !== t[1] && t[1] !== t[2] && t[0] !== t[2]) triangles.push(t);
  }
  return { positions, triangles };
}

export function meshEdgeList(mesh: WeldedMesh) {
  const count = mesh.positions.length;
  const edges = new Map<number, { a: number; b: number; triangles: number[] }>();
  mesh.triangles.forEach((triangle, t) => {
    for (let i = 0; i < 3; i++) {
      const a = triangle[i];
      const b = triangle[(i + 1) % 3];
      const key = edgeKey(a, b, count);
      const edge = edges.get(key);
      if (edge) edge.triangles.push(t);
      else edges.set(key, { a, b, triangles: [t] });
    }
  });
  return edges;
}

export type UvLayout = {
  /** One UV per corner of each triangle, from 0 to 1, with v counting down. */
  corners: Vec2[][];
  island: number[];
  islands: number;
  /** Per triangle: flat area ÷ real area, relative to the mesh's average. 1 means no stretch. */
  stretch: number[];
  /** Triangles that ended up facing backwards in the layout. */
  folded: number;
  /** Share of the square that the islands cover. */
  coverage: number;
};

function find(parents: number[], x: number) {
  let root = x;
  while (parents[root] !== root) root = parents[root];
  let walker = x;
  while (parents[walker] !== root) {
    const next = parents[walker];
    parents[walker] = root;
    walker = next;
  }
  return root;
}

const triangleArea2 = (p: Vec2, q: Vec2, r: Vec2) =>
  (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);

/** Solves for one island's flat positions and scales them to the island's true size. */
function flattenIsland(
  members: readonly number[],
  triangles: readonly Triangle[],
  positions: readonly Vec3[],
  classOf: (triangle: number, corner: number) => number,
  uvOf: Map<number, [number, number]>,
) {
  const ids = new Map<number, number>();
  const where: Vec3[] = [];
  for (const t of members) {
    for (let i = 0; i < 3; i++) {
      const c = classOf(t, i);
      if (!ids.has(c)) {
        ids.set(c, ids.size);
        where.push(positions[triangles[t][i]]);
      }
    }
  }
  const count = ids.size;

  // Pin two far-apart corners, which fixes where the island sits and how it is turned.
  const farthestFrom = (from: number) => {
    let best = 0;
    let bestDistance = -1;
    where.forEach((p, i) => {
      const d = length(subtract(p, where[from]));
      if (d > bestDistance) {
        bestDistance = d;
        best = i;
      }
    });
    return best;
  };
  const pinA = farthestFrom(0);
  const pinB = farthestFrom(pinA);
  const span = length(subtract(where[pinA], where[pinB])) || 1;
  const pinned = new Map<number, Vec2>([
    [pinA, [0, 0]],
    [pinB, [span, 0]],
  ]);

  // Two equations per triangle, in the unknown u and v of each free corner.
  const free = new Map<number, number>();
  for (let i = 0; i < count; i++) {
    if (!pinned.has(i)) free.set(i, free.size);
  }
  const unknowns = free.size * 2;
  const rows: { columns: number[]; values: number[]; target: number }[] = [];
  let realArea = 0;
  for (const t of members) {
    const [a, b, c] = triangles[t].map((v) => positions[v]);
    const ab = length(subtract(b, a));
    const ac = length(subtract(c, a));
    const bc = length(subtract(c, b));
    if (ab === 0) continue;
    const cx = (ab * ab + ac * ac - bc * bc) / (2 * ab);
    const cy = Math.sqrt(Math.max(0, ac * ac - cx * cx));
    const area = (ab * cy) / 2;
    if (area < 1e-10) continue;
    realArea += area;
    const local: Vec2[] = [
      [0, 0],
      [ab, 0],
      [cx, cy],
    ];
    const scale = 1 / Math.sqrt(2 * area);
    const real = { columns: [] as number[], values: [] as number[], target: 0 };
    const imaginary = { columns: [] as number[], values: [] as number[], target: 0 };
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      const k = (i + 2) % 3;
      const wr = (local[k][0] - local[j][0]) * scale;
      const wi = (local[k][1] - local[j][1]) * scale;
      const id = ids.get(classOf(t, i)) as number;
      const pin = pinned.get(id);
      if (pin) {
        real.target -= wr * pin[0] - wi * pin[1];
        imaginary.target -= wi * pin[0] + wr * pin[1];
      } else {
        const f = (free.get(id) as number) * 2;
        real.columns.push(f, f + 1);
        real.values.push(wr, -wi);
        imaginary.columns.push(f, f + 1);
        imaginary.values.push(wi, wr);
      }
    }
    rows.push(real, imaginary);
  }

  // Conjugate gradients on the normal equations.
  const multiplyA = (x: Float64Array) => {
    const out = new Float64Array(rows.length);
    rows.forEach((row, r) => {
      let sum = 0;
      for (let i = 0; i < row.columns.length; i++) sum += row.values[i] * x[row.columns[i]];
      out[r] = sum;
    });
    return out;
  };
  const multiplyTranspose = (y: Float64Array) => {
    const out = new Float64Array(unknowns);
    rows.forEach((row, r) => {
      for (let i = 0; i < row.columns.length; i++) out[row.columns[i]] += row.values[i] * y[r];
    });
    return out;
  };
  const dotProduct = (p: Float64Array, q: Float64Array) => {
    let sum = 0;
    for (let i = 0; i < p.length; i++) sum += p[i] * q[i];
    return sum;
  };
  const x = new Float64Array(unknowns);
  const residual = multiplyTranspose(Float64Array.from(rows, (row) => row.target));
  const direction = residual.slice();
  let squared = dotProduct(residual, residual);
  const limit = Math.max(50, unknowns * 3);
  for (let pass = 0; pass < limit && squared > 1e-20; pass++) {
    const step = multiplyTranspose(multiplyA(direction));
    const denominator = dotProduct(direction, step);
    if (denominator <= 0) break;
    const alpha = squared / denominator;
    for (let i = 0; i < unknowns; i++) {
      x[i] += alpha * direction[i];
      residual[i] -= alpha * step[i];
    }
    const next = dotProduct(residual, residual);
    const beta = next / squared;
    for (let i = 0; i < unknowns; i++) direction[i] = residual[i] + beta * direction[i];
    squared = next;
  }

  const flat: Vec2[] = Array.from({ length: count }, (_, i) => {
    const pin = pinned.get(i);
    if (pin) return pin;
    const f = (free.get(i) as number) * 2;
    return [Number.isFinite(x[f]) ? x[f] : 0, Number.isFinite(x[f + 1]) ? x[f + 1] : 0];
  });

  // Conformal maps keep angles, not sizes: scale the island to its true area.
  let flatArea = 0;
  for (const t of members) {
    const [p, q, r] = [0, 1, 2].map((i) => flat[ids.get(classOf(t, i)) as number]);
    flatArea += Math.abs(triangleArea2(p, q, r)) / 2;
  }
  const fit = flatArea > 1e-12 ? Math.sqrt(realArea / flatArea) : 1;
  for (const [cls, id] of ids) uvOf.set(cls, [flat[id][0] * fit, flat[id][1] * fit]);
}

/** Cuts along the given edges and lays the pieces out in the unit square. */
export function unwrap(mesh: WeldedMesh, seams: ReadonlySet<number>): UvLayout {
  const { positions, triangles } = mesh;
  const edges = meshEdgeList(mesh);

  // Corners across an uncut edge are one UV vertex. Across a seam they stay apart.
  const corner = (t: number, i: number) => t * 3 + i;
  const uvParents = Array.from({ length: triangles.length * 3 }, (_, i) => i);
  const islandParents = triangles.map((_, i) => i);
  for (const [key, edge] of edges) {
    if (seams.has(key)) continue;
    for (let n = 1; n < edge.triangles.length; n++) {
      const first = edge.triangles[0];
      const other = edge.triangles[n];
      islandParents[find(islandParents, other)] = find(islandParents, first);
      for (const vertex of [edge.a, edge.b]) {
        const i = triangles[first].indexOf(vertex);
        const j = triangles[other].indexOf(vertex);
        uvParents[find(uvParents, corner(other, j))] = find(uvParents, corner(first, i));
      }
    }
  }

  const uvOf = new Map<number, [number, number]>();
  const island = triangles.map((_, t) => find(islandParents, t));
  const roots = [...new Set(island)];
  for (const root of roots) {
    const members = triangles.flatMap((_, t) => (island[t] === root ? [t] : []));
    flattenIsland(members, triangles, positions, (t, i) => find(uvParents, corner(t, i)), uvOf);
  }

  // Lay the islands out in rows, largest first, at one shared scale.
  const boxes = new Map(
    roots.map((root) => [
      root,
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, x: 0, y: 0 },
    ]),
  );
  triangles.forEach((_, t) => {
    const box = boxes.get(island[t]);
    if (!box) return;
    for (let i = 0; i < 3; i++) {
      const uv = uvOf.get(find(uvParents, corner(t, i)));
      if (!uv) continue;
      box.minX = Math.min(box.minX, uv[0]);
      box.minY = Math.min(box.minY, uv[1]);
      box.maxX = Math.max(box.maxX, uv[0]);
      box.maxY = Math.max(box.maxY, uv[1]);
    }
  });
  const ordered = roots
    .map((root) => boxes.get(root))
    .filter((box) => box !== undefined)
    .sort((p, q) => q.maxY - q.minY - (p.maxY - p.minY));
  const totalArea = ordered.reduce((sum, b) => sum + (b.maxX - b.minX) * (b.maxY - b.minY), 0);
  const widest = Math.max(...ordered.map((b) => b.maxX - b.minX));
  const shelf = Math.max(Math.sqrt(totalArea) * 1.2, widest);
  const gap = shelf * 0.02;
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  let usedWidth = 0;
  for (const box of ordered) {
    const w = box.maxX - box.minX;
    const h = box.maxY - box.minY;
    if (x > 0 && x + w > shelf) {
      x = 0;
      y += rowHeight + gap;
      rowHeight = 0;
    }
    box.x = x;
    box.y = y;
    x += w + gap;
    usedWidth = Math.max(usedWidth, x);
    rowHeight = Math.max(rowHeight, h);
  }
  const size = Math.max(usedWidth - gap, y + rowHeight) || 1;
  const scale = 0.96 / size;
  const pad = 0.02;

  const corners: Vec2[][] = triangles.map((_, t) => {
    const box = boxes.get(island[t]);
    return [0, 1, 2].map((i): Vec2 => {
      const uv = uvOf.get(find(uvParents, corner(t, i))) ?? [0, 0];
      if (!box) return [0, 0];
      return [pad + (uv[0] - box.minX + box.x) * scale, pad + (uv[1] - box.minY + box.y) * scale];
    });
  });

  // Compare every triangle's flat size with its real size.
  const realAreas = triangles.map(
    ([a, b, c]) =>
      length(cross(subtract(positions[b], positions[a]), subtract(positions[c], positions[a]))) / 2,
  );
  const flatAreas = corners.map(([p, q, r]) => triangleArea2(p, q, r) / 2);
  const totalReal = realAreas.reduce((sum, area) => sum + area, 0);
  const totalFlat = flatAreas.reduce((sum, area) => sum + Math.abs(area), 0);
  const average = totalFlat / (totalReal || 1);
  const sign = Math.sign(flatAreas.reduce((sum, area) => sum + area, 0)) || 1;
  const stretch = flatAreas.map((area, t) => Math.abs(area) / (realAreas[t] * average || 1));
  const islandIndex = new Map(roots.map((root, i) => [root, i]));
  return {
    corners,
    island: island.map((root) => islandIndex.get(root) ?? 0),
    islands: roots.length,
    stretch,
    folded: flatAreas.filter((area) => area * sign < 0).length,
    coverage: totalFlat,
  };
}

/** A cylinder with caps, whose corners are shared so that seams decide everything. */
export function cylinderMesh(segments = 12, radius = 0.9, height = 1.1): WeldedMesh {
  const positions: Vec3[] = [];
  const triangles: Triangle[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    positions.push([Math.sin(a) * radius, height, Math.cos(a) * radius]);
    positions.push([Math.sin(a) * radius, -height, Math.cos(a) * radius]);
  }
  const top = positions.length;
  positions.push([0, height, 0]);
  const bottom = positions.length;
  positions.push([0, -height, 0]);
  for (let i = 0; i < segments; i++) {
    const j = (i + 1) % segments;
    const [t0, b0, t1, b1] = [i * 2, i * 2 + 1, j * 2, j * 2 + 1];
    triangles.push([t0, b0, b1], [t0, b1, t1], [top, t0, t1], [bottom, b1, b0]);
  }
  return { positions, triangles };
}

/** The seams an artist would start from, per shape. */
export const seamPresets = {
  /** Along the edges that open a box into a cross. */
  cube(mesh: WeldedMesh) {
    const count = mesh.positions.length;
    const at = (x: number, y: number, z: number) =>
      mesh.positions.findIndex((p) => p[0] === x && p[1] === y && p[2] === z);
    const pairs: [number[], number[]][] = [
      // The back of the top and the bottom come away, and the four sides split at the back.
      [
        [-1, 1, -1],
        [1, 1, -1],
      ],
      [
        [-1, 1, -1],
        [-1, 1, 1],
      ],
      [
        [1, 1, -1],
        [1, 1, 1],
      ],
      [
        [-1, -1, -1],
        [1, -1, -1],
      ],
      [
        [-1, -1, -1],
        [-1, -1, 1],
      ],
      [
        [1, -1, -1],
        [1, -1, 1],
      ],
      [
        [-1, 1, -1],
        [-1, -1, -1],
      ],
    ];
    return new Set(
      pairs.map(([p, q]) => edgeKey(at(p[0], p[1], p[2]), at(q[0], q[1], q[2]), count)),
    );
  },
  /** Round both caps, and once down the side. */
  cylinder(mesh: WeldedMesh, segments = 12) {
    const count = mesh.positions.length;
    const seams = new Set<number>();
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      seams.add(edgeKey(i * 2, j * 2, count));
      seams.add(edgeKey(i * 2 + 1, j * 2 + 1, count));
    }
    seams.add(edgeKey(0, 1, count));
    return seams;
  },
  /** Once from pole to pole. */
  sphere(mesh: WeldedMesh) {
    const seams = new Set<number>();
    for (const [key, edge] of meshEdgeList(mesh)) {
      const p = mesh.positions[edge.a];
      const q = mesh.positions[edge.b];
      if (Math.abs(p[0]) < 1e-3 && Math.abs(q[0]) < 1e-3 && p[2] <= 1e-3 && q[2] <= 1e-3) {
        seams.add(key);
      }
    }
    return seams;
  },
};

/** The measurements of a layout an artist already made. */
export function layoutFromUvs(
  positions: readonly Vec3[],
  triangles: readonly Triangle[],
  uvs: readonly Vec2[],
): UvLayout {
  const corners = triangles.map(([a, b, c]) => [uvs[a], uvs[b], uvs[c]]);
  const parents = uvs.map((_, i) => i);
  const seen = new Map<string, number>();
  uvs.forEach((uv, i) => {
    const key = `${uv[0].toFixed(4)},${uv[1].toFixed(4)}`;
    const held = seen.get(key);
    if (held === undefined) seen.set(key, i);
    else parents[find(parents, i)] = find(parents, held);
  });
  for (const [a, b, c] of triangles) {
    parents[find(parents, b)] = find(parents, a);
    parents[find(parents, c)] = find(parents, a);
  }
  const island = triangles.map(([a]) => find(parents, a));
  const roots = [...new Set(island)];
  const areas = corners.map(([p, q, r]) => Math.abs(triangleArea2(p, q, r)) / 2);
  const real = triangles.map(
    ([a, b, c]) =>
      length(cross(subtract(positions[b], positions[a]), subtract(positions[c], positions[a]))) / 2,
  );
  const totalFlat = areas.reduce((sum, area) => sum + area, 0);
  const totalReal = real.reduce((sum, area) => sum + area, 0);
  const average = totalFlat / (totalReal || 1);
  const index = new Map(roots.map((root, i) => [root, i]));
  return {
    corners,
    island: island.map((root) => index.get(root) ?? 0),
    islands: roots.length,
    stretch: areas.map((area, t) => area / (real[t] * average || 1)),
    folded: 0,
    coverage: totalFlat,
  };
}
