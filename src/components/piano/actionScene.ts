// Drawing for the mechanism demos: parts as shapes in millimetres (y up),
// placed on a canvas that fits a view box, each one named so the pointer can
// find it. Materials keep their colours in both themes; outlines follow the
// panel's ink.

import type { PanelColors } from "./canvas";

export type Pt = [number, number];

export type Material =
  | "wood"
  | "rail"
  | "ivory"
  | "ebony"
  | "felt"
  | "redFelt"
  | "hammerFelt"
  | "damperFelt"
  | "cloth"
  | "leather"
  | "metal"
  | "brass"
  | "quill"
  | "frame";

const LIGHT: Record<Material, string> = {
  wood: "#dcb98a",
  rail: "#b98e5d",
  ivory: "#fbf6e8",
  ebony: "#2b2622",
  felt: "#e9e2d2",
  redFelt: "#b8483a",
  hammerFelt: "#f4efe3",
  damperFelt: "#4a4540",
  cloth: "#7f9a6a",
  leather: "#9a6a3e",
  metal: "#8d949b",
  brass: "#c9a24a",
  quill: "#3a332d",
  frame: "#d9d2c4",
};

const DARK: Record<Material, string> = {
  ...LIGHT,
  wood: "#b39064",
  rail: "#8c6a44",
  ivory: "#e8e1cf",
  felt: "#cfc7b6",
  hammerFelt: "#e3ddcf",
  frame: "#3a352d",
  damperFelt: "#5b554e",
  quill: "#1c1916",
};

export type View = { x0: number; x1: number; y0: number; y1: number };

/** Rotates `p` about `pivot` by `angle` radians, counter-clockwise with y up. */
export function rotate(p: Pt, pivot: Pt, angle: number): Pt {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dx = p[0] - pivot[0];
  const dy = p[1] - pivot[1];
  return [pivot[0] + dx * c - dy * s, pivot[1] + dx * s + dy * c];
}

/** A pose: rotate about a pivot, then shift. Poses compose, outer last. */
export type Pose = { pivot: Pt; angle: number; shift?: Pt }[];

export const place = (p: Pt, pose: Pose = []): Pt =>
  pose.reduce<Pt>((q, step) => {
    const r = rotate(q, step.pivot, step.angle);
    return step.shift ? [r[0] + step.shift[0], r[1] + step.shift[1]] : r;
  }, p);

export const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];

/** A polygon approximating a circle, or an arc from `from` to `to` radians. */
export function arc(c: Pt, r: number, from = 0, to = 2 * Math.PI, steps = 24): Pt[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / steps;
    return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)] as Pt;
  });
}

type Hit = { name: string; poly: [number, number][] };

function inside(poly: [number, number][], x: number, y: number) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

export type ShapeStyle = {
  material?: Material;
  fill?: string;
  /** Draw no outline. */
  bare?: boolean;
  lineWidth?: number;
  alpha?: number;
};

export class Scene {
  readonly scale: number;
  readonly hits: Hit[] = [];
  readonly material: Record<Material, string>;
  readonly outline: string;
  private ox: number;
  private oy: number;

  constructor(
    readonly ctx: CanvasRenderingContext2D,
    view: View,
    width: number,
    height: number,
    readonly colors: PanelColors,
    readonly dark: boolean,
    /** Parts to mark as new in this demo. */
    readonly fresh: ReadonlySet<string> = new Set(),
    /** The part under the pointer. */
    readonly hovered: string | null = null,
  ) {
    this.scale = Math.min(width / (view.x1 - view.x0), height / (view.y1 - view.y0));
    this.ox = (width - (view.x1 - view.x0) * this.scale) / 2 - view.x0 * this.scale;
    this.oy = (height + (view.y1 - view.y0) * this.scale) / 2 + view.y0 * this.scale;
    this.material = dark ? DARK : LIGHT;
    this.outline = colors.ink;
  }

  px = ([x, y]: Pt): [number, number] => [this.ox + x * this.scale, this.oy - y * this.scale];

  /** Model point from canvas pixels. */
  model = (cx: number, cy: number): Pt => [
    (cx - this.ox) / this.scale,
    (this.oy - cy) / this.scale,
  ];

  private path(points: Pt[], close: boolean) {
    const { ctx } = this;
    ctx.beginPath();
    points.forEach((p, i) => {
      const [x, y] = this.px(p);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    if (close) ctx.closePath();
  }

  /** A filled, outlined part. A named part can be pointed at and marked. */
  shape(name: string | null, points: Pt[], style: ShapeStyle = {}, pose?: Pose) {
    const placed = pose ? points.map((p) => place(p, pose)) : points;
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = style.alpha ?? 1;
    this.path(placed, true);
    ctx.fillStyle = style.fill ?? this.material[style.material ?? "wood"];
    ctx.fill();
    if (!style.bare) {
      ctx.lineJoin = "round";
      ctx.strokeStyle = this.outline;
      ctx.globalAlpha = (style.alpha ?? 1) * (this.dark ? 0.55 : 0.7);
      ctx.lineWidth = style.lineWidth ?? 1;
      ctx.stroke();
    }
    ctx.restore();
    if (name) {
      this.hits.push({ name, poly: placed.map(this.px) });
      this.mark(name, placed);
    }
  }

  /** An open line, e.g. a wire or a string. */
  line(name: string | null, points: Pt[], color: string, width: number, pose?: Pose) {
    const placed = pose ? points.map((p) => place(p, pose)) : points;
    const { ctx } = this;
    ctx.save();
    this.path(placed, false);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
    if (name) {
      // A fat band around the line, so a thin wire is easy to point at.
      const pad = Math.max(4, width) / this.scale;
      const band: Pt[] = [];
      for (const p of placed) band.push([p[0] - pad, p[1] - pad]);
      for (const p of [...placed].reverse()) band.push([p[0] + pad, p[1] + pad]);
      this.hits.push({ name, poly: band.map(this.px) });
      if (this.hovered === name || this.fresh.has(name)) {
        ctx.save();
        this.path(placed, false);
        ctx.strokeStyle = this.colors.accent;
        ctx.globalAlpha = this.hovered === name ? 0.9 : 0.55;
        ctx.lineWidth = width + 4;
        ctx.lineCap = "round";
        ctx.globalCompositeOperation = this.dark ? "lighter" : "multiply";
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  /** Outlines a part in the accent colour when it is new here or under the pointer. */
  private mark(name: string, placed: Pt[]) {
    const hovered = this.hovered === name;
    if (!hovered && !this.fresh.has(name)) return;
    const { ctx } = this;
    ctx.save();
    this.path(placed, true);
    ctx.strokeStyle = this.colors.accent;
    ctx.lineJoin = "round";
    ctx.lineWidth = hovered ? 3 : 2;
    if (!hovered) ctx.setLineDash([5, 3]);
    ctx.stroke();
    if (hovered) {
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = this.colors.accent;
      ctx.fill();
    }
    ctx.restore();
  }

  /** The topmost named part at canvas pixel (x, y). */
  partAt(x: number, y: number) {
    for (let i = this.hits.length - 1; i >= 0; i--) {
      if (inside(this.hits[i].poly, x, y)) return this.hits[i].name;
    }
    return null;
  }
}

/** A small coil spring between two points, for jack and lever springs. */
export function spring(scene: Scene, from: Pt, to: Pt, turns = 5, width = 3) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const points: Pt[] = [from];
  const n = turns * 2;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const side = i % 2 ? 1 : -1;
    points.push([from[0] + dx * t + nx * width * side, from[1] + dy * t + ny * width * side]);
  }
  points.push(to);
  scene.line(null, points, scene.material.metal, 1.2);
}
