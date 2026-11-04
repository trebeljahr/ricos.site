import { identity, type Mat, multiply, type Vec3 } from "./matrix";
import { completeMesh, type Mesh, type Triangle } from "./meshes";

/**
 * Bones, poses and skinning. A pose is one rotation and one offset per bone,
 * relative to its parent. Everything else follows from multiplying down the tree.
 */

export type Quaternion = readonly [number, number, number, number];

export const multiplyQuaternions = (a: Quaternion, b: Quaternion): Quaternion => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];

export const axisAngle = (axis: Vec3, radians: number): Quaternion => {
  const s = Math.sin(radians / 2);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(radians / 2)];
};

/** Blends two rotations by the short way round. Close enough to a slerp for neighbouring keys. */
export function blendQuaternions(a: Quaternion, b: Quaternion, t: number): Quaternion {
  const sign = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3] < 0 ? -1 : 1;
  const x = a[0] + (b[0] * sign - a[0]) * t;
  const y = a[1] + (b[1] * sign - a[1]) * t;
  const z = a[2] + (b[2] * sign - a[2]) * t;
  const w = a[3] + (b[3] * sign - a[3]) * t;
  const length = Math.hypot(x, y, z, w) || 1;
  return [x / length, y / length, z / length, w / length];
}

/** Moved, turned and scaled, in that order from the outside in. */
export function composeTransform(t: Vec3, q: Quaternion, s: Vec3): Mat {
  const [x, y, z, w] = q;
  const xx = x * x;
  const yy = y * y;
  const zz = z * z;
  const xy = x * y;
  const xz = x * z;
  const yz = y * z;
  const wx = w * x;
  const wy = w * y;
  const wz = w * z;
  return [
    (1 - 2 * (yy + zz)) * s[0],
    2 * (xy - wz) * s[1],
    2 * (xz + wy) * s[2],
    t[0],
    2 * (xy + wz) * s[0],
    (1 - 2 * (xx + zz)) * s[1],
    2 * (yz - wx) * s[2],
    t[1],
    2 * (xz - wy) * s[0],
    2 * (yz + wx) * s[1],
    (1 - 2 * (xx + yy)) * s[2],
    t[2],
    0,
    0,
    0,
    1,
  ];
}

/** Undoes any matrix that can be undone, by Gauss-Jordan elimination. */
export function invert(m: Mat): Mat {
  const n = Math.round(Math.sqrt(m.length));
  const a = [...m];
  const b = [...identity(n)];
  for (let column = 0; column < n; column++) {
    let pivot = column;
    for (let row = column + 1; row < n; row++) {
      if (Math.abs(a[row * n + column]) > Math.abs(a[pivot * n + column])) pivot = row;
    }
    if (pivot !== column) {
      for (let k = 0; k < n; k++) {
        [a[column * n + k], a[pivot * n + k]] = [a[pivot * n + k], a[column * n + k]];
        [b[column * n + k], b[pivot * n + k]] = [b[pivot * n + k], b[column * n + k]];
      }
    }
    const divide = a[column * n + column];
    if (divide === 0) throw new Error("This matrix flattens space, so it cannot be undone");
    for (let k = 0; k < n; k++) {
      a[column * n + k] /= divide;
      b[column * n + k] /= divide;
    }
    for (let row = 0; row < n; row++) {
      if (row === column) continue;
      const factor = a[row * n + column];
      for (let k = 0; k < n; k++) {
        a[row * n + k] -= factor * a[column * n + k];
        b[row * n + k] -= factor * b[column * n + k];
      }
    }
  }
  return b;
}

export type Skeleton = {
  names: readonly string[];
  /** Always lower than the bone's own index, or -1 for a root. */
  parents: readonly number[];
  restTranslations: readonly Vec3[];
  restRotations: readonly Quaternion[];
  restScales: readonly Vec3[];
  /** What sits above the root: the fit of the whole model into the demo's view. */
  root: Mat;
  /** World matrix of each bone in the rest pose. */
  restWorld: readonly Mat[];
  /** Takes a vertex from the model into each bone's own space. */
  inverseBind: readonly Mat[];
};

export type Pose = { rotations: readonly Quaternion[]; translations: readonly Vec3[] };

/** Every bone's world matrix: its parent's world matrix times its own local one. */
export function worldMatrices(skeleton: Skeleton, pose: Pose): Mat[] {
  const world: Mat[] = [];
  skeleton.parents.forEach((parent, i) => {
    const local = composeTransform(pose.translations[i], pose.rotations[i], skeleton.restScales[i]);
    world.push(multiply(parent < 0 ? skeleton.root : world[parent], local));
  });
  return world;
}

export const restPose = (skeleton: Skeleton): Pose => ({
  rotations: skeleton.restRotations,
  translations: skeleton.restTranslations,
});

export function makeSkeleton(
  names: readonly string[],
  parents: readonly number[],
  restTranslations: readonly Vec3[],
  restRotations: readonly Quaternion[],
  restScales: readonly Vec3[],
  root: Mat,
): Skeleton {
  const partial = {
    names,
    parents,
    restTranslations,
    restRotations,
    restScales,
    root,
    restWorld: [],
    inverseBind: [],
  };
  const restWorld = worldMatrices(partial, {
    rotations: restRotations,
    translations: restTranslations,
  });
  return { ...partial, restWorld, inverseBind: restWorld.map(invert) };
}

/** World × inverse bind: where each bone has moved its vertices, relative to the rest pose. */
export const skinMatrices = (skeleton: Skeleton, world: readonly Mat[]): Mat[] =>
  world.map((matrix, i) => multiply(matrix, skeleton.inverseBind[i]));

/**
 * Weights are a dense table, one row per vertex, one column per bone. Each vertex
 * goes where every bone would take it, and ends up at the weighted average.
 */
export function skinPositions(
  rest: readonly Vec3[],
  weights: Float32Array,
  boneCount: number,
  skin: readonly Mat[],
): Vec3[] {
  const out: Vec3[] = new Array(rest.length);
  for (let v = 0; v < rest.length; v++) {
    const [x, y, z] = rest[v];
    let ox = 0;
    let oy = 0;
    let oz = 0;
    const row = v * boneCount;
    for (let b = 0; b < boneCount; b++) {
      const weight = weights[row + b];
      if (weight === 0) continue;
      const m = skin[b];
      ox += weight * (m[0] * x + m[1] * y + m[2] * z + m[3]);
      oy += weight * (m[4] * x + m[5] * y + m[6] * z + m[7]);
      oz += weight * (m[8] * x + m[9] * y + m[10] * z + m[11]);
    }
    out[v] = [ox, oy, oz];
  }
  return out;
}

export const bonePosition = (world: Mat): Vec3 => [world[3], world[7], world[11]];

/** Where a point is along a bone from its head to the head of its child, as the nearest distance. */
function distanceToSegment(p: Vec3, a: Vec3, b: Vec3) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const lengthSquared = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / lengthSquared,
          ),
        );
  return Math.hypot(p[0] - a[0] - ab[0] * t, p[1] - a[1] - ab[1] * t, p[2] - a[2] - ab[2] * t);
}

/** Weights worked out by distance to each bone: what an "automatic weights" button starts from. */
export function automaticWeights(
  rest: readonly Vec3[],
  skeleton: Skeleton,
  sharpness = 5,
): Float32Array {
  const count = skeleton.names.length;
  const heads = skeleton.restWorld.map(bonePosition);
  // A bone runs to its first child; a bone with no children is treated as a point.
  const tails = heads.map((head, i) => {
    const child = skeleton.parents.indexOf(i);
    return child < 0 ? head : heads[child];
  });
  const weights = new Float32Array(rest.length * count);
  rest.forEach((position, v) => {
    let total = 0;
    for (let b = 0; b < count; b++) {
      const influence =
        1 / Math.max(1e-4, distanceToSegment(position, heads[b], tails[b])) ** sharpness;
      weights[v * count + b] = influence;
      total += influence;
    }
    for (let b = 0; b < count; b++) weights[v * count + b] /= total;
  });
  return weights;
}

/** Adds to one bone's share of a vertex, and scales the others so that the row still sums to 1. */
export function paintWeight(
  weights: Float32Array,
  boneCount: number,
  vertex: number,
  bone: number,
  amount: number,
) {
  const row = vertex * boneCount;
  const old = weights[row + bone];
  const next = Math.max(0, Math.min(1, old + amount));
  const others = 1 - old;
  weights[row + bone] = next;
  if (others > 1e-6) {
    const scale = (1 - next) / others;
    for (let b = 0; b < boneCount; b++) {
      if (b !== bone) weights[row + b] *= scale;
    }
  } else if (next < 1) {
    // This bone held everything and is giving some up. Hand it to its neighbour in the table.
    weights[row + (bone === 0 ? 1 : 0)] = 1 - next;
  }
}

/** Moves one vertex's whole row towards the average of its neighbours. */
export function smoothWeights(
  weights: Float32Array,
  boneCount: number,
  vertex: number,
  neighbours: readonly number[],
  amount: number,
) {
  if (neighbours.length === 0) return;
  const row = vertex * boneCount;
  let total = 0;
  for (let b = 0; b < boneCount; b++) {
    let sum = 0;
    for (const other of neighbours) sum += weights[other * boneCount + b];
    const next = weights[row + b] + (sum / neighbours.length - weights[row + b]) * amount;
    weights[row + b] = next;
    total += next;
  }
  for (let b = 0; b < boneCount; b++) weights[row + b] /= total;
}

/** Each vertex's neighbours along mesh edges. */
export function vertexNeighbours(count: number, triangles: readonly Triangle[]): number[][] {
  const sets = Array.from({ length: count }, () => new Set<number>());
  for (const [a, b, c] of triangles) {
    sets[a].add(b).add(c);
    sets[b].add(a).add(c);
    sets[c].add(a).add(b);
  }
  return sets.map((set) => [...set]);
}

export type Clip = {
  duration: number;
  frames: number;
  /** Flat: per frame, per bone, four numbers. */
  rotations: readonly number[];
  /** Flat: per frame, per bone, three numbers. */
  translations: readonly number[];
};

const keyRotation = (clip: Clip, frame: number, bone: number, bones: number): Quaternion => {
  const i = (frame * bones + bone) * 4;
  return [clip.rotations[i], clip.rotations[i + 1], clip.rotations[i + 2], clip.rotations[i + 3]];
};
const keyTranslation = (clip: Clip, frame: number, bone: number, bones: number): Vec3 => {
  const i = (frame * bones + bone) * 3;
  return [clip.translations[i], clip.translations[i + 1], clip.translations[i + 2]];
};

export type Interpolation = "step" | "linear";

/**
 * The pose at a moment in a clip, keeping only every nth key. Stepping holds the
 * last key; linear blends towards the next. The last key is always kept, so loops close.
 */
export function samplePose(
  clip: Clip,
  bones: number,
  seconds: number,
  keepEvery = 1,
  interpolation: Interpolation = "linear",
): Pose {
  const last = clip.frames - 1;
  const position = ((seconds % clip.duration) / clip.duration) * last;
  const a = Math.min(last, Math.floor(position / keepEvery) * keepEvery);
  const b = Math.min(last, a + keepEvery);
  const t = interpolation === "step" || a === b ? 0 : (position - a) / (b - a);
  const rotations: Quaternion[] = [];
  const translations: Vec3[] = [];
  for (let bone = 0; bone < bones; bone++) {
    rotations.push(
      blendQuaternions(keyRotation(clip, a, bone, bones), keyRotation(clip, b, bone, bones), t),
    );
    const from = keyTranslation(clip, a, bone, bones);
    const to = keyTranslation(clip, b, bone, bones);
    translations.push([
      from[0] + (to[0] - from[0]) * t,
      from[1] + (to[1] - from[1]) * t,
      from[2] + (to[2] - from[2]) * t,
    ]);
  }
  return { rotations, translations };
}

/** How far a bone has turned from its rest rotation at one key, in degrees. */
export function keyAngle(clip: Clip, skeleton: Skeleton, frame: number, bone: number) {
  const q = keyRotation(clip, frame, bone, skeleton.names.length);
  const r = skeleton.restRotations[bone];
  const cosine = Math.abs(q[0] * r[0] + q[1] * r[1] + q[2] * r[2] + q[3] * r[3]);
  return (2 * Math.acos(Math.min(1, cosine)) * 180) / Math.PI;
}

export type RiggedModel = {
  mesh: Mesh;
  skeleton: Skeleton;
  /** Dense: one row per vertex, one column per bone. */
  weights: Float32Array;
  clips: Record<string, Clip>;
  /** The vertex at the tip of the nose, a good one to follow. */
  nose: number;
};

type TrexFile = {
  positions: number[];
  triangles: number[];
  materials: number[];
  palette: number[][];
  joints: number[];
  weights: number[];
  bones: {
    names: string[];
    parents: number[];
    translations: number[];
    rotations: number[];
    scales: number[];
    root: number[];
  };
  clips: Record<string, Clip>;
};

const triples = (flat: readonly number[]): Vec3[] => {
  const out: Vec3[] = [];
  for (let i = 0; i < flat.length; i += 3) out.push([flat[i], flat[i + 1], flat[i + 2]]);
  return out;
};

export function riggedFromFile(file: TrexFile): RiggedModel {
  const positions = triples(file.positions);
  const triangles = triples(file.triangles) as unknown as Triangle[];
  const { bones } = file;
  const rotations: Quaternion[] = [];
  for (let i = 0; i < bones.rotations.length; i += 4) {
    rotations.push([
      bones.rotations[i],
      bones.rotations[i + 1],
      bones.rotations[i + 2],
      bones.rotations[i + 3],
    ]);
  }
  const skeleton = makeSkeleton(
    bones.names,
    bones.parents,
    triples(bones.translations),
    rotations,
    triples(bones.scales),
    bones.root,
  );
  const count = bones.names.length;
  const weights = new Float32Array(positions.length * count);
  for (let v = 0; v < positions.length; v++) {
    for (let k = 0; k < 4; k++) {
      weights[v * count + file.joints[v * 4 + k]] += file.weights[v * 4 + k];
    }
  }
  const mesh = completeMesh({
    positions,
    triangles,
    faceColors: file.materials.map((material) => {
      const [r, g, b] = file.palette[material];
      return [r, g, b] as Vec3;
    }),
  });
  // The nose: of the vertices the head bone moves most, the one furthest along the way the head points.
  const head = bones.names.indexOf("Head");
  const neck = bones.names.indexOf("Neck");
  const headAt = skeleton.restWorld[head];
  const neckAt = skeleton.restWorld[neck];
  const forward = [headAt[3] - neckAt[3], headAt[7] - neckAt[7], headAt[11] - neckAt[11]];
  let nose = 0;
  let furthest = -Infinity;
  positions.forEach((p, v) => {
    if (weights[v * count + head] < 0.9) return;
    const along = p[0] * forward[0] + p[1] * forward[1] + p[2] * forward[2];
    if (along > furthest) {
      furthest = along;
      nose = v;
    }
  });
  return { mesh, skeleton, weights, clips: file.clips, nose };
}

let trexLoad: Promise<RiggedModel> | null = null;

/** The T. rex, fetched the first time a demo asks for it. */
export const loadTrex = (): Promise<RiggedModel> => {
  trexLoad ??= import("./baked/trex.json").then((module) =>
    riggedFromFile(module.default as unknown as TrexFile),
  );
  return trexLoad;
};

export type CharacterFile = {
  positions: number[];
  uvs: number[];
  triangles: number[];
  texture: string;
};

let arissaLoad: Promise<CharacterFile> | null = null;

/** A character with a real, artist-made UV layout. */
export const loadArissa = (): Promise<CharacterFile> => {
  arissaLoad ??= import("./baked/arissa.json").then((module) => module.default as CharacterFile);
  return arissaLoad;
};
