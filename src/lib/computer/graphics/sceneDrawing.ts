import {
  cross,
  dot,
  lookAt,
  type Mat,
  multiply,
  normalize,
  orbitEye,
  perspective,
  subtract,
  transform,
  type Vec3,
} from "./matrix";

/**
 * Drawing a scene onto a 2D canvas for the demos' look-around views. These views
 * are not the thing being taught: they stand outside the pipeline and watch it,
 * so they sort polygons back to front rather than rasterize. The rasterizer draws
 * the demos' actual pixels.
 */

export type SceneCamera = {
  viewProjection: Mat;
  width: number;
  height: number;
  eye: Vec3;
};

export function sceneCamera(
  yaw: number,
  pitch: number,
  distance: number,
  target: Vec3,
  width: number,
  height: number,
  fov = 35,
): SceneCamera {
  const eye = orbitEye(yaw, pitch, distance, target);
  return {
    eye,
    width,
    height,
    viewProjection: multiply(
      perspective(fov, width / height, 0.05, Math.max(100, distance * 6)),
      lookAt(eye, target),
    ),
  };
}

/** Screen x and y in CSS pixels, then w: at or below zero is behind the viewer. */
export function project(camera: SceneCamera, [x, y, z]: Vec3): [number, number, number] {
  const c = transform(camera.viewProjection, [x, y, z, 1]);
  const w = c[3];
  return [((c[0] / w + 1) / 2) * camera.width, ((1 - c[1] / w) / 2) * camera.height, w];
}

const MIN_W = 0.06;

/** Cuts a segment where it passes behind the viewer. */
function visibleSegment(camera: SceneCamera, a: Vec3, b: Vec3) {
  const ca = transform(camera.viewProjection, [a[0], a[1], a[2], 1]);
  const cb = transform(camera.viewProjection, [b[0], b[1], b[2], 1]);
  if (ca[3] < MIN_W && cb[3] < MIN_W) return null;
  let from = ca;
  let to = cb;
  if (from[3] < MIN_W) {
    const t = (MIN_W - from[3]) / (to[3] - from[3]);
    from = from.map((v, i) => v + (cb[i] - v) * t);
  } else if (to[3] < MIN_W) {
    const t = (MIN_W - to[3]) / (from[3] - to[3]);
    to = to.map((v, i) => v + (ca[i] - v) * t);
  }
  return [
    ((from[0] / from[3] + 1) / 2) * camera.width,
    ((1 - from[1] / from[3]) / 2) * camera.height,
    ((to[0] / to[3] + 1) / 2) * camera.width,
    ((1 - to[1] / to[3]) / 2) * camera.height,
  ] as const;
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  camera: SceneCamera,
  a: Vec3,
  b: Vec3,
  color: string,
  width = 1,
  dash?: number[],
) {
  const segment = visibleSegment(camera, a, b);
  if (!segment) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash ?? []);
  ctx.beginPath();
  ctx.moveTo(segment[0], segment[1]);
  ctx.lineTo(segment[2], segment[3]);
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawArrow(
  ctx: CanvasRenderingContext2D,
  camera: SceneCamera,
  a: Vec3,
  b: Vec3,
  color: string,
  width = 2,
  label?: string,
) {
  const segment = visibleSegment(camera, a, b);
  if (!segment) return;
  const [x0, y0, x1, y1] = segment;
  const angle = Math.atan2(y1 - y0, x1 - x0);
  const head = 5 + width * 2;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  if (Math.hypot(x1 - x0, y1 - y0) > 2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - head * Math.cos(angle - 0.45), y1 - head * Math.sin(angle - 0.45));
    ctx.lineTo(x1 - head * Math.cos(angle + 0.45), y1 - head * Math.sin(angle + 0.45));
    ctx.closePath();
    ctx.fill();
  }
  if (label)
    drawText(ctx, x1 + 7 * Math.cos(angle) - 3, y1 + 7 * Math.sin(angle) + 4, label, color);
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
  size = 12,
) {
  ctx.font = `600 ${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function drawDot(
  ctx: CanvasRenderingContext2D,
  camera: SceneCamera,
  p: Vec3,
  radius: number,
  color: string,
  ring?: string,
) {
  const [x, y, w] = project(camera, p);
  if (w <= 0) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  if (ring) {
    ctx.strokeStyle = ring;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

export const clearScene = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const glow = ctx.createRadialGradient(
    width / 2,
    height * 0.45,
    0,
    width / 2,
    height * 0.45,
    Math.max(width, height) * 0.7,
  );
  glow.addColorStop(0, "#161c2e");
  glow.addColorStop(1, "#090b10");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
};

export const AXIS_COLORS = { x: "#ff6b7a", y: "#5ef0a0", z: "#5cb8ff" } as const;

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  camera: SceneCamera,
  half: number,
  y: number,
  color = "#2c3652",
  step = 1,
) {
  for (let i = -half; i <= half; i += step) {
    drawLine(ctx, camera, [i, y, -half], [i, y, half], color);
    drawLine(ctx, camera, [-half, y, i], [half, y, i], color);
  }
}

export function drawAxes(
  ctx: CanvasRenderingContext2D,
  camera: SceneCamera,
  origin: Vec3,
  x: Vec3,
  y: Vec3,
  z: Vec3,
  width = 2,
) {
  drawArrow(ctx, camera, origin, x, AXIS_COLORS.x, width, "x");
  drawArrow(ctx, camera, origin, y, AXIS_COLORS.y, width, "y");
  drawArrow(ctx, camera, origin, z, AXIS_COLORS.z, width, "z");
}

export type ScenePolygon = {
  points: readonly Vec3[];
  /** 0 to 255. */
  color: Vec3;
  alpha?: number;
  /** Which triangle this came from. */
  id: number;
  outline?: string;
};

export type DrawnPolygon = ScenePolygon & { screen: [number, number][]; front: boolean };

const rgba = ([r, g, b]: Vec3, a = 1) =>
  `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;

/** Lit from over the viewer's shoulder, so faces stay readable from any side. */
export function shadeFace(color: Vec3, points: readonly Vec3[], eye: Vec3): Vec3 {
  if (points.length < 3) return color;
  const n = normalize(cross(subtract(points[1], points[0]), subtract(points[2], points[0])));
  const toEye = normalize(subtract(eye, points[0]));
  const light =
    0.5 + 0.5 * Math.abs(dot(n, normalize([toEye[0] + 0.5, toEye[1] + 0.9, toEye[2] + 0.3])));
  return [color[0] * light, color[1] * light, color[2] * light];
}

const MAX_POLYGONS_TO_CUT = 60;
const CUTS = 4;

type Sorted = DrawnPolygon & { distance: number; depths: number[] };

/**
 * Sorting whole faces fails when a small one stands on a big one, as a chimney on
 * a roof does. Many small pieces sort far better. Translucent faces stay whole,
 * because their seams would show.
 */
function cutUp(polygon: Sorted): Sorted[] {
  if ((polygon.alpha ?? 1) < 1) return [polygon];
  const { screen, depths } = polygon;
  const pieces: Sorted[] = [];
  const at = (a: number, b: number, u: number, v: number): [number, number, number] => {
    const w = 1 - u - v;
    return [
      screen[0][0] * w + screen[a][0] * u + screen[b][0] * v,
      screen[0][1] * w + screen[a][1] * u + screen[b][1] * v,
      depths[0] * w + depths[a] * u + depths[b] * v,
    ];
  };
  const add = (
    p: [number, number, number],
    q: [number, number, number],
    r: [number, number, number],
  ) => {
    pieces.push({
      ...polygon,
      screen: [
        [p[0], p[1]],
        [q[0], q[1]],
        [r[0], r[1]],
      ],
      depths: [p[2], q[2], r[2]],
      distance: (p[2] + q[2] + r[2]) / 3,
    });
  };
  for (let fan = 1; fan < screen.length - 1; fan++) {
    for (let i = 0; i < CUTS; i++) {
      for (let j = 0; j < CUTS - i; j++) {
        const u = i / CUTS;
        const v = j / CUTS;
        const step = 1 / CUTS;
        add(at(fan, fan + 1, u, v), at(fan, fan + 1, u + step, v), at(fan, fan + 1, u, v + step));
        if (i + j < CUTS - 1) {
          add(
            at(fan, fan + 1, u + step, v),
            at(fan, fan + 1, u + step, v + step),
            at(fan, fan + 1, u, v + step),
          );
        }
      }
    }
  }
  return pieces;
}

/**
 * Sorts by distance and paints far to near. Returns what it drew, nearest last,
 * so a tap can look for the nearest polygon under it.
 */
export function drawPolygons(
  ctx: CanvasRenderingContext2D,
  camera: SceneCamera,
  polygons: readonly ScenePolygon[],
  { cull = true, seams = true }: { cull?: boolean; seams?: boolean } = {},
): DrawnPolygon[] {
  const drawn: Sorted[] = [];
  for (const polygon of polygons) {
    const screen: [number, number][] = [];
    let behind = false;
    let distance = 0;
    const depths: number[] = [];
    for (const point of polygon.points) {
      const [x, y, w] = project(camera, point);
      if (w <= MIN_W) {
        behind = true;
        break;
      }
      screen.push([x, y]);
      depths.push(w);
      distance += w;
    }
    if (behind || screen.length < 3) continue;
    let area = 0;
    for (let i = 1; i < screen.length - 1; i++) {
      area +=
        (screen[i][0] - screen[0][0]) * (screen[i + 1][1] - screen[0][1]) -
        (screen[i][1] - screen[0][1]) * (screen[i + 1][0] - screen[0][0]);
    }
    const front = area < 0;
    if (cull && !front) continue;
    drawn.push({ ...polygon, screen, front, depths, distance: distance / screen.length });
  }
  const pieces = polygons.length <= MAX_POLYGONS_TO_CUT ? drawn.flatMap(cutUp) : drawn;
  pieces.sort((a, b) => b.distance - a.distance);
  for (const polygon of pieces) {
    const style = rgba(polygon.color, polygon.alpha ?? 1);
    ctx.fillStyle = style;
    ctx.beginPath();
    ctx.moveTo(polygon.screen[0][0], polygon.screen[0][1]);
    for (let i = 1; i < polygon.screen.length; i++) {
      ctx.lineTo(polygon.screen[i][0], polygon.screen[i][1]);
    }
    ctx.closePath();
    ctx.fill();
    if (polygon.outline) {
      ctx.strokeStyle = polygon.outline;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (seams && (polygon.alpha ?? 1) === 1) {
      ctx.strokeStyle = style;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }
  return pieces;
}

/** Is a point inside a polygon on screen? */
export function pointInPolygon(
  x: number,
  y: number,
  screen: readonly (readonly [number, number])[],
) {
  let inside = false;
  for (let i = 0, j = screen.length - 1; i < screen.length; j = i++) {
    const [xi, yi] = screen[i];
    const [xj, yj] = screen[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
