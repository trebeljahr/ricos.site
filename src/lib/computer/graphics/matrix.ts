/**
 * The matrix math behind the 3D demos. Matrices are flat row-major arrays, so
 * `m[row * n + column]` reads the way the demos print them, and vectors are
 * columns: `M × v`. Written by hand rather than taken from three.js because the
 * point of the demos is that these few lines are all there is.
 */

export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];
export type Vec4 = readonly [number, number, number, number];
export type Mat = readonly number[];

const side = (m: Mat) => Math.round(Math.sqrt(m.length));

export function identity(n: number): Mat {
  const out = new Array<number>(n * n).fill(0);
  for (let i = 0; i < n; i++) out[i * n + i] = 1;
  return out;
}

/** `a × b`: as a transform, b happens first. */
export function multiply(a: Mat, b: Mat): Mat {
  const n = side(a);
  const out = new Array<number>(n * n).fill(0);
  for (let row = 0; row < n; row++) {
    for (let column = 0; column < n; column++) {
      let sum = 0;
      for (let k = 0; k < n; k++) sum += a[row * n + k] * b[k * n + column];
      out[row * n + column] = sum;
    }
  }
  return out;
}

/** Multiplies left to right, so the last matrix is the first transform applied. */
export const multiplyAll = (first: Mat, ...rest: Mat[]): Mat => rest.reduce(multiply, first);

export function transform(m: Mat, v: readonly number[]): number[] {
  const n = side(m);
  const out = new Array<number>(n).fill(0);
  for (let row = 0; row < n; row++) {
    let sum = 0;
    for (let k = 0; k < n; k++) sum += m[row * n + k] * v[k];
    out[row] = sum;
  }
  return out;
}

export const transformPoint = (m: Mat, [x, y, z]: Vec3): Vec3 => {
  const [a, b, c] = transform(m, [x, y, z, 1]);
  return [a, b, c];
};

export const transformDirection = (m: Mat, [x, y, z]: Vec3): Vec3 => {
  const [a, b, c] = transform(m, [x, y, z, 0]);
  return [a, b, c];
};

/** The row and column of a matrix, for printing. */
export const rowsOf = (m: Mat): number[][] => {
  const n = side(m);
  return Array.from({ length: n }, (_, row) => m.slice(row * n, row * n + n) as number[]);
};

// --- 2D, with a third coordinate that lets a matrix move things ----------------

export const scale2 = (x: number, y: number): Mat => [x, 0, 0, 0, y, 0, 0, 0, 1];
export const shear2 = (x: number, y: number): Mat => [1, x, 0, y, 1, 0, 0, 0, 1];
export const translate2 = (x: number, y: number): Mat => [1, 0, x, 0, 1, y, 0, 0, 1];
export const rotate2 = (radians: number): Mat => {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
};

/** How much a 2D transform scales area. Negative means it flipped the shape over. */
export const determinant2 = (m: Mat) => m[0] * m[4] - m[1] * m[3];

// --- 3D, with a fourth coordinate ----------------------------------------------

export const scale3 = (x: number, y: number, z: number): Mat => [
  x,
  0,
  0,
  0,
  0,
  y,
  0,
  0,
  0,
  0,
  z,
  0,
  0,
  0,
  0,
  1,
];

export const translate3 = (x: number, y: number, z: number): Mat => [
  1,
  0,
  0,
  x,
  0,
  1,
  0,
  y,
  0,
  0,
  1,
  z,
  0,
  0,
  0,
  1,
];

export const rotateX = (radians: number): Mat => {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0, 0, 0, 0, 1];
};

export const rotateY = (radians: number): Mat => {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, 0, 0, 0, 1];
};

export const rotateZ = (radians: number): Mat => {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
};

export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const subtract = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scaled = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const length = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
export const normalize = (a: Vec3): Vec3 => {
  const l = length(a);
  return l === 0 ? [0, 0, 0] : [a[0] / l, a[1] / l, a[2] / l];
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
export const radians = (degrees: number) => (degrees * Math.PI) / 180;

/** World space to camera space: the camera moved to the origin, looking down -Z. */
export function lookAt(eye: Vec3, target: Vec3, up: Vec3 = [0, 1, 0]): Mat {
  const back = normalize(subtract(eye, target));
  // Straight up or down, "up" and the view direction are parallel; any other up will do.
  const right = normalize(cross(Math.abs(dot(up, back)) > 0.9999 ? [0, 0, -1] : up, back));
  const above = cross(back, right);
  return [
    right[0],
    right[1],
    right[2],
    -dot(right, eye),
    above[0],
    above[1],
    above[2],
    -dot(above, eye),
    back[0],
    back[1],
    back[2],
    -dot(back, eye),
    0,
    0,
    0,
    1,
  ];
}

/** Camera space to clip space. w takes the distance in front of the camera. */
export function perspective(fovYDegrees: number, aspect: number, near: number, far: number): Mat {
  const f = 1 / Math.tan(radians(fovYDegrees) / 2);
  return [
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) / (near - far),
    (2 * far * near) / (near - far),
    0,
    0,
    -1,
    0,
  ];
}

/** Normalized device coordinates to pixels. Y flips: rows count down from the top. */
export const viewport = (width: number, height: number): Mat => [
  width / 2,
  0,
  0,
  width / 2,
  0,
  -height / 2,
  0,
  height / 2,
  0,
  0,
  0.5,
  0.5,
  0,
  0,
  0,
  1,
];

/** The camera position for a yaw, pitch and distance around a target. */
export function orbitEye(
  yawDegrees: number,
  pitchDegrees: number,
  distance: number,
  target: Vec3 = [0, 0, 0],
): Vec3 {
  const yaw = radians(yawDegrees);
  const pitch = radians(pitchDegrees);
  return [
    target[0] + distance * Math.cos(pitch) * Math.sin(yaw),
    target[1] + distance * Math.sin(pitch),
    target[2] + distance * Math.cos(pitch) * Math.cos(yaw),
  ];
}
