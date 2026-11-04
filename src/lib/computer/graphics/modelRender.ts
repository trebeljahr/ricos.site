import { cross, dot, type Mat, normalize, subtract, transform, type Vec3 } from "./matrix";
import type { Triangle } from "./meshes";
import { type Framebuffer, type PipelineVertex, rasterize } from "./rasterizer";

/** Weight 0 to 1 as the usual heat colours: blue, through green and yellow, to red. */
export function heatColor(value: number): Vec3 {
  const v = Math.max(0, Math.min(1, value));
  const stops: Vec3[] = [
    [30, 50, 170],
    [40, 190, 230],
    [70, 225, 110],
    [250, 225, 60],
    [240, 60, 50],
  ];
  const at = v * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(at));
  const t = at - i;
  return [
    stops[i][0] + (stops[i + 1][0] - stops[i][0]) * t,
    stops[i][1] + (stops[i + 1][1] - stops[i][1]) * t,
    stops[i][2] + (stops[i + 1][2] - stops[i][2]) * t,
  ];
}

/** A whole mesh, lit from the viewer's shoulder: one colour per face, or a heat value per vertex. */
export function renderModel(
  target: Framebuffer,
  viewProjection: Mat,
  eye: Vec3,
  positions: readonly Vec3[],
  triangles: readonly Triangle[],
  faceColors: readonly Vec3[] | undefined,
  heat?: (vertex: number) => number,
) {
  target.clear([10, 12, 18]);
  const vertices: PipelineVertex[] = positions.map((p, i) => {
    const c = transform(viewProjection, [p[0], p[1], p[2], 1]);
    return { clip: [c[0], c[1], c[2], c[3]], attributes: heat ? [heat(i)] : [] };
  });
  const light = normalize([eye[0] + 2, eye[1] + 4, eye[2] + 1]);
  const levels = triangles.map(([a, b, c]) => {
    const n = normalize(
      cross(subtract(positions[b], positions[a]), subtract(positions[c], positions[a])),
    );
    return 0.55 + 0.45 * Math.max(0, dot(n, light));
  });
  rasterize(
    target,
    triangles.map(([a, b, c]) => [vertices[a], vertices[b], vertices[c]]),
    (input, out) => {
      const level = levels[input.triangle];
      const color = heat
        ? heatColor(input.attributes[0])
        : (faceColors?.[input.triangle] ?? [190, 190, 190]);
      out[0] = color[0] * level;
      out[1] = color[1] * level;
      out[2] = color[2] * level;
    },
  );
}

/** Where a point lands in a framebuffer's pixels, and its depth there. */
export function toPixels(viewProjection: Mat, p: Vec3, width: number, height: number) {
  const c = transform(viewProjection, [p[0], p[1], p[2], 1]);
  return {
    x: ((c[0] / c[3] + 1) / 2) * width,
    y: ((1 - c[1] / c[3]) / 2) * height,
    depth: (c[2] / c[3] + 1) / 2,
    w: c[3],
  };
}
