import { add, cross, dot, normalize, subtract, type Vec3 } from "./matrix";

/** A map is a square of numbers, sampled by a UV that wraps. */
export type TextureMap = { size: number; data: Float32Array; channels: number };

export type Material = {
  name: string;
  color: TextureMap;
  /** Tangent-space normals, stored as -1 to 1. */
  normal: TextureMap;
  specular: TextureMap;
  occlusion: TextureMap;
};

export function sample(map: TextureMap, u: number, v: number, smooth: boolean, out: number[]) {
  const { size, data, channels } = map;
  const wrappedU = u - Math.floor(u);
  const wrappedV = v - Math.floor(v);
  if (!smooth) {
    const x = Math.min(size - 1, Math.floor(wrappedU * size));
    const y = Math.min(size - 1, Math.floor(wrappedV * size));
    const i = (y * size + x) * channels;
    for (let c = 0; c < channels; c++) out[c] = data[i + c];
    return;
  }
  const fx = wrappedU * size - 0.5;
  const fy = wrappedV * size - 0.5;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const x1 = (x0 + 1 + size) % size;
  const y1 = (y0 + 1 + size) % size;
  const xa = (x0 + size) % size;
  const ya = (y0 + size) % size;
  for (let c = 0; c < channels; c++) {
    const a = data[(ya * size + xa) * channels + c];
    const b = data[(ya * size + x1) * channels + c];
    const d = data[(y1 * size + xa) * channels + c];
    const e = data[(y1 * size + x1) * channels + c];
    out[c] = (a + (b - a) * tx) * (1 - ty) + (d + (e - d) * tx) * ty;
  }
}

/** A little value noise, so that nothing looks ruled with a straightedge. */
function noise(x: number, y: number, seed: number) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return value - Math.floor(value);
}

function smoothNoise(x: number, y: number, seed: number, period: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);
  const wrap = (v: number) => ((v % period) + period) % period;
  const a = noise(wrap(x0), wrap(y0), seed);
  const b = noise(wrap(x0 + 1), wrap(y0), seed);
  const c = noise(wrap(x0), wrap(y0 + 1), seed);
  const d = noise(wrap(x0 + 1), wrap(y0 + 1), seed);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}

type Surface = (
  u: number,
  v: number,
) => {
  /** 0 to 255. */
  color: Vec3;
  height: number;
  /** How shiny, 0 to 1. */
  specular: number;
  occlusion: number;
};

function bake(name: string, surface: Surface, size = 128, bump = 3): Material {
  const color = new Float32Array(size * size * 3);
  const specular = new Float32Array(size * size);
  const occlusion = new Float32Array(size * size);
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const texel = surface((x + 0.5) / size, (y + 0.5) / size);
      const i = y * size + x;
      color[i * 3] = texel.color[0];
      color[i * 3 + 1] = texel.color[1];
      color[i * 3 + 2] = texel.color[2];
      specular[i] = texel.specular;
      occlusion[i] = texel.occlusion;
      height[i] = texel.height;
    }
  }
  const normal = new Float32Array(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // A normal map holds the slope of the height at each texel.
      const left = height[y * size + ((x - 1 + size) % size)];
      const right = height[y * size + ((x + 1) % size)];
      const up = height[((y - 1 + size) % size) * size + x];
      const down = height[((y + 1) % size) * size + x];
      const n = normalize([(left - right) * bump, (up - down) * bump * -1, 1]);
      const i = (y * size + x) * 3;
      normal[i] = n[0];
      normal[i + 1] = n[1];
      normal[i + 2] = n[2];
    }
  }
  return {
    name,
    color: { size, data: color, channels: 3 },
    normal: { size, data: normal, channels: 3 },
    specular: { size, data: specular, channels: 1 },
    occlusion: { size, data: occlusion, channels: 1 },
  };
}

const bricks: Surface = (u, v) => {
  const rows = 8;
  const columns = 4;
  const row = Math.floor(v * rows);
  const offset = row % 2 === 0 ? 0 : 0.5;
  const column = (u * columns + offset) % columns;
  const brickColumn = Math.floor(column);
  const fx = column - brickColumn;
  const fy = v * rows - row;
  const mortar = 0.07;
  const edge = Math.min(fx * 2, (1 - fx) * 2, fy, 1 - fy);
  const inBrick = edge > mortar;
  const shade = noise(brickColumn, row, 1);
  const grain = smoothNoise(u * 32, v * 32, 2, 32) * 0.5 + smoothNoise(u * 64, v * 64, 3, 64) * 0.5;
  const rim = Math.min(1, Math.max(0, (edge - mortar) / 0.05));
  if (!inBrick) {
    const m = 138 + grain * 30;
    return {
      color: [m, m - 4, m - 12],
      height: 0.1 + grain * 0.05,
      specular: 0.04,
      occlusion: 0.45,
    };
  }
  return {
    color: [
      (150 + shade * 50) * (0.8 + grain * 0.35),
      (62 + shade * 26) * (0.8 + grain * 0.35),
      (46 + shade * 18) * (0.8 + grain * 0.35),
    ],
    height: 0.1 + rim * 0.55 + grain * 0.1,
    specular: 0.22 + grain * 0.2,
    occlusion: 0.55 + rim * 0.45,
  };
};

const plates: Surface = (u, v) => {
  const count = 2;
  const fx = (u * count) % 1;
  const fy = (v * count) % 1;
  const edge = Math.min(fx, 1 - fx, fy, 1 - fy);
  const rivet = Math.min(
    ...[
      [0.12, 0.12],
      [0.88, 0.12],
      [0.12, 0.88],
      [0.88, 0.88],
    ].map(([rx, ry]) => Math.hypot(fx - rx, fy - ry)),
  );
  const scratch = smoothNoise(u * 96, v * 8, 4, 8) * 0.6 + smoothNoise(u * 8, v * 96, 5, 8) * 0.4;
  const seam = edge < 0.015;
  const onRivet = rivet < 0.045;
  const base = 120 + scratch * 50;
  if (seam) return { color: [34, 36, 40], height: 0, specular: 0.05, occlusion: 0.3 };
  return {
    color: onRivet ? [188, 192, 198] : [base, base + 6, base + 16],
    height: 0.5 + (onRivet ? 0.35 * (1 - rivet / 0.045) : 0) + scratch * 0.015,
    specular: onRivet ? 1 : 0.45 + scratch * 0.5,
    occlusion: Math.min(1, 0.55 + edge * 8),
  };
};

const checker: Surface = (u, v) => {
  const on = (Math.floor(u * 8) + Math.floor(v * 8)) % 2 === 0;
  return {
    color: on ? [228, 222, 200] : [52, 88, 112],
    height: 0.5,
    specular: on ? 0.25 : 0.8,
    occlusion: 1,
  };
};

const plain: Surface = () => ({ color: [206, 206, 206], height: 0.5, specular: 0.8, occlusion: 1 });

const MATERIAL_BUILDERS = {
  bricks: () => bake("BRICKS", bricks),
  plates: () => bake("PLATES", plates, 128, 5),
  checker: () => bake("CHECKER", checker),
  plain: () => bake("PLAIN", plain, 8),
} as const;

export type MaterialName = keyof typeof MATERIAL_BUILDERS;
export const MATERIAL_NAMES = Object.keys(MATERIAL_BUILDERS) as MaterialName[];

const cache = new Map<MaterialName, Material>();

/** Baked on first use, not at import: a page that never shows the demo pays nothing. */
export function material(name: MaterialName): Material {
  let found = cache.get(name);
  if (!found) {
    found = MATERIAL_BUILDERS[name]();
    cache.set(name, found);
  }
  return found;
}

export type LightingSettings = {
  ambient: number;
  diffuse: number;
  specular: number;
  shininess: number;
  useColorMap: boolean;
  useNormalMap: boolean;
  useSpecularMap: boolean;
  useOcclusionMap: boolean;
  smoothSampling: boolean;
};

export type LightingInput = {
  position: Vec3;
  /** Unit length. */
  normal: Vec3;
  tangent: Vec3;
  u: number;
  v: number;
  light: Vec3;
  eye: Vec3;
};

export type LightingResult = {
  /** The normal after the normal map bent it. */
  normal: Vec3;
  toLight: Vec3;
  toEye: Vec3;
  halfway: Vec3;
  albedo: Vec3;
  occlusion: number;
  /** What the specular map says here. */
  specularStrength: number;
  /** max(N·L, 0) */
  nDotL: number;
  /** max(N·H, 0) */
  nDotH: number;
  shine: number;
  ambient: Vec3;
  diffuse: Vec3;
  specular: Vec3;
  final: Vec3;
};

const WHITE: Vec3 = [255, 255, 255];
const sampled3 = [0, 0, 0];
const sampled1 = [0];

/** Blinn-Phong: everything a fragment shader in this demo does, on one screen. */
export function shade(input: LightingInput, mat: Material, s: LightingSettings): LightingResult {
  const { u, v, tangent } = input;
  let normal = input.normal;
  if (s.useNormalMap) {
    sample(mat.normal, u, v, s.smoothSampling, sampled3);
    const bitangent = cross(normal, tangent);
    normal = normalize([
      tangent[0] * sampled3[0] + bitangent[0] * sampled3[1] + normal[0] * sampled3[2],
      tangent[1] * sampled3[0] + bitangent[1] * sampled3[1] + normal[1] * sampled3[2],
      tangent[2] * sampled3[0] + bitangent[2] * sampled3[1] + normal[2] * sampled3[2],
    ]);
  }
  let albedo: Vec3 = [206, 206, 206];
  if (s.useColorMap) {
    sample(mat.color, u, v, s.smoothSampling, sampled3);
    albedo = [sampled3[0], sampled3[1], sampled3[2]];
  }
  let specularStrength = 1;
  if (s.useSpecularMap) {
    sample(mat.specular, u, v, s.smoothSampling, sampled1);
    specularStrength = sampled1[0];
  }
  let occlusion = 1;
  if (s.useOcclusionMap) {
    sample(mat.occlusion, u, v, s.smoothSampling, sampled1);
    occlusion = sampled1[0];
  }

  const toLight = normalize(subtract(input.light, input.position));
  const toEye = normalize(subtract(input.eye, input.position));
  const halfway = normalize(add(toLight, toEye));
  const nDotL = Math.max(dot(normal, toLight), 0);
  const nDotH = nDotL > 0 ? Math.max(dot(normal, halfway), 0) : 0;
  const shine = nDotH ** s.shininess;

  const a = s.ambient * occlusion;
  const d = s.diffuse * nDotL;
  const e = s.specular * specularStrength * shine;
  const ambient: Vec3 = [albedo[0] * a, albedo[1] * a, albedo[2] * a];
  const diffuse: Vec3 = [albedo[0] * d, albedo[1] * d, albedo[2] * d];
  const specular: Vec3 = [WHITE[0] * e, WHITE[1] * e, WHITE[2] * e];
  return {
    normal,
    toLight,
    toEye,
    halfway,
    albedo,
    occlusion,
    specularStrength,
    nDotL,
    nDotH,
    shine,
    ambient,
    diffuse,
    specular,
    final: [
      Math.min(255, ambient[0] + diffuse[0] + specular[0]),
      Math.min(255, ambient[1] + diffuse[1] + specular[1]),
      Math.min(255, ambient[2] + diffuse[2] + specular[2]),
    ],
  };
}
