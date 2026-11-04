import type { Vec3, Vec4 } from "./matrix";

/** A corner on its way down the pipeline: a clip-space position and values to interpolate. */
export type PipelineVertex = { clip: Vec4; attributes: readonly number[] };

export type RasterStats = {
  triangles: number;
  culled: number;
  /** Cut against the view volume, including those cut away entirely. */
  clipped: number;
  outside: number;
  fragments: number;
  depthRejected: number;
};

export class Framebuffer {
  readonly color: Uint8ClampedArray<ArrayBuffer>;
  readonly depth: Float32Array;
  /** Which triangle owns each pixel, or -1. */
  readonly owner: Int32Array;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.color = new Uint8ClampedArray(width * height * 4);
    this.depth = new Float32Array(width * height);
    this.owner = new Int32Array(width * height);
    this.clear();
  }

  clear(background: Vec3 = [10, 12, 18]) {
    const { color } = this;
    for (let i = 0; i < color.length; i += 4) {
      color[i] = background[0];
      color[i + 1] = background[1];
      color[i + 2] = background[2];
      color[i + 3] = 255;
    }
    this.depth.fill(1);
    this.owner.fill(-1);
  }
}

export type FragmentInput = {
  x: number;
  y: number;
  triangle: number;
  /** The screen depth this pixel got, 0 at the near plane and 1 at the far one. */
  depth: number;
  /** The attributes, interpolated with perspective correction. */
  attributes: number[];
  /** How far along each of the triangle's three corners this pixel sits. */
  weights: Vec3;
};

/** Writes a colour, 0 to 255 per channel. */
export type FragmentShader = (input: FragmentInput, out: number[]) => void;

const EPSILON = 1e-5;

/** Which side of one face of the view volume a clip-space point is on. Positive is inside. */
const PLANES: ((c: Vec4) => number)[] = [
  (c) => c[3] + c[0],
  (c) => c[3] - c[0],
  (c) => c[3] + c[1],
  (c) => c[3] - c[1],
  (c) => c[3] + c[2],
  (c) => c[3] - c[2],
];

/** Is a clip-space point inside the view volume: every coordinate within ±w? */
export const insideClip = (clip: Vec4) => PLANES.every((plane) => plane(clip) >= 0);

function lerpVertex(a: PipelineVertex, b: PipelineVertex, t: number): PipelineVertex {
  const attributes = new Array<number>(a.attributes.length);
  for (let i = 0; i < attributes.length; i++) {
    attributes[i] = a.attributes[i] + (b.attributes[i] - a.attributes[i]) * t;
  }
  return {
    clip: [
      a.clip[0] + (b.clip[0] - a.clip[0]) * t,
      a.clip[1] + (b.clip[1] - a.clip[1]) * t,
      a.clip[2] + (b.clip[2] - a.clip[2]) * t,
      a.clip[3] + (b.clip[3] - a.clip[3]) * t,
    ],
    attributes,
  };
}

/** Sutherland–Hodgman: walks the polygon round each plane in turn, cutting where it crosses. */
export function clipPolygon(polygon: readonly PipelineVertex[]): PipelineVertex[] {
  let output = polygon as PipelineVertex[];
  for (const plane of PLANES) {
    if (output.length === 0) return output;
    const input = output;
    output = [];
    for (let i = 0; i < input.length; i++) {
      const current = input[i];
      const next = input[(i + 1) % input.length];
      const here = plane(current.clip);
      const there = plane(next.clip);
      if (here >= 0) output.push(current);
      if (here >= 0 !== there >= 0) output.push(lerpVertex(current, next, here / (here - there)));
    }
  }
  return output;
}

type ScreenVertex = {
  x: number;
  y: number;
  depth: number;
  /** 1 / w, which unlike w interpolates in a straight line across the screen. */
  invW: number;
  attributes: readonly number[];
};

function toScreen(v: PipelineVertex, width: number, height: number): ScreenVertex {
  const invW = 1 / v.clip[3];
  return {
    x: (v.clip[0] * invW + 1) * 0.5 * width,
    y: (1 - v.clip[1] * invW) * 0.5 * height,
    depth: (v.clip[2] * invW + 1) * 0.5,
    invW,
    attributes: v.attributes,
  };
}

/**
 * Colours pixels for a list of triangles, in order, top row to bottom row. Each
 * pixel whose centre falls inside a triangle is one fragment; the depth buffer
 * decides whether it survives. `fragmentLimit` stops partway, for watching it work.
 */
export function rasterize(
  target: Framebuffer,
  triangles: readonly (readonly [PipelineVertex, PipelineVertex, PipelineVertex])[],
  shader: FragmentShader,
  { cull = true, fragmentLimit = Infinity, depthTest = true } = {},
): RasterStats {
  const stats: RasterStats = {
    triangles: triangles.length,
    culled: 0,
    clipped: 0,
    outside: 0,
    fragments: 0,
    depthRejected: 0,
  };
  const { width, height, depth, color, owner } = target;
  const out = [0, 0, 0];

  triangleLoop: for (let index = 0; index < triangles.length; index++) {
    const triangle = triangles[index];
    const polygon = clipPolygon(triangle);
    if (polygon.length < 3) {
      stats.clipped++;
      stats.outside++;
      continue;
    }
    if (polygon.length !== 3 || polygon.some((v, i) => v !== triangle[i])) stats.clipped++;
    const screen = polygon.map((v) => toScreen(v, width, height));

    let facing = 0;
    for (let i = 1; i < screen.length - 1; i++) {
      facing +=
        (screen[i].x - screen[0].x) * (screen[i + 1].y - screen[0].y) -
        (screen[i].y - screen[0].y) * (screen[i + 1].x - screen[0].x);
    }
    // Screen rows count downward, which turns counter-clockwise into a negative area.
    if (cull && facing >= 0) {
      stats.culled++;
      continue;
    }

    // Clipping can leave more than three corners: a fan of triangles covers them.
    for (let fan = 1; fan < screen.length - 1; fan++) {
      const a = screen[0];
      let b = screen[fan];
      let c = screen[fan + 1];
      const area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      if (Math.abs(area) < EPSILON) continue;
      // From here on every triangle winds the same way, so one inside test fits all.
      if (area < 0) [b, c] = [c, b];
      const signedArea = Math.abs(area);

      const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
      const maxX = Math.min(width - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
      const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
      const maxY = Math.min(height - 1, Math.ceil(Math.max(a.y, b.y, c.y)));

      // The top-left rule: an edge two triangles share gives its pixels to only one. A pixel
      // exactly on a top or left edge counts as inside; on any other edge it does not.
      const bias = (from: ScreenVertex, to: ScreenVertex) => {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        return (dy === 0 && dx > 0) || dy < 0 ? EPSILON : 0;
      };
      const biasA = bias(b, c);
      const biasB = bias(c, a);
      const biasC = bias(a, b);

      const attributeCount = a.attributes.length;
      const attributes = new Array<number>(attributeCount);

      for (let y = minY; y <= maxY; y++) {
        const py = y + 0.5;
        for (let x = minX; x <= maxX; x++) {
          const px = x + 0.5;
          const wa = (c.x - b.x) * (py - b.y) - (c.y - b.y) * (px - b.x);
          const wb = (a.x - c.x) * (py - c.y) - (a.y - c.y) * (px - c.x);
          const wc = (b.x - a.x) * (py - a.y) - (b.y - a.y) * (px - a.x);
          if (wa + biasA > 0 && wb + biasB > 0 && wc + biasC > 0) {
            // Inside. Fine to go on only if there is budget left.
            if (stats.fragments >= fragmentLimit) break triangleLoop;
            stats.fragments++;

            const la = wa / signedArea;
            const lb = wb / signedArea;
            const lc = wc / signedArea;
            const fragmentDepth = a.depth * la + b.depth * lb + c.depth * lc;
            const i = y * width + x;
            if (depthTest && fragmentDepth >= depth[i]) {
              stats.depthRejected++;
              continue;
            }
            const invW = a.invW * la + b.invW * lb + c.invW * lc;
            for (let k = 0; k < attributeCount; k++) {
              attributes[k] =
                (a.attributes[k] * a.invW * la +
                  b.attributes[k] * b.invW * lb +
                  c.attributes[k] * c.invW * lc) /
                invW;
            }
            shader(
              {
                x,
                y,
                triangle: index,
                depth: fragmentDepth,
                attributes,
                weights: [la, lb, lc],
              },
              out,
            );
            depth[i] = fragmentDepth;
            owner[i] = index;
            const p = i * 4;
            color[p] = out[0];
            color[p + 1] = out[1];
            color[p + 2] = out[2];
            color[p + 3] = 255;
          }
        }
      }
    }
  }
  return stats;
}
