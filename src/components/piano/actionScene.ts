// Drawing for the mechanism demos: parts as shapes in millimetres (y up),
// placed on a canvas that fits a view box, each one named so the pointer can
// find it.
//
// The look is a hand-inked drawing on paper: bold outlines that wobble a
// little and round their corners, soft tinted fills, short hatch strokes on
// the shadow side, stippled felt. The wobble is keyed to each part, not to
// its place on screen, so a moving lever keeps its own line and never boils.

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
  wood: "#efdcbb",
  rail: "#ddc39c",
  ivory: "#fffdf7",
  ebony: "#2a2622",
  felt: "#f3eee2",
  redFelt: "#e3826f",
  hammerFelt: "#fdfaf2",
  damperFelt: "#8e857a",
  cloth: "#bccca8",
  leather: "#cf9f72",
  metal: "#d9dde1",
  brass: "#efd48c",
  quill: "#3a332d",
  frame: "#e7e0d0",
};

const DARK: Record<Material, string> = {
  wood: "#6e5841",
  rail: "#5b4834",
  ivory: "#ddd5c3",
  ebony: "#121110",
  felt: "#4d473f",
  redFelt: "#a94a3c",
  hammerFelt: "#d6cfbf",
  damperFelt: "#403a33",
  cloth: "#56664b",
  leather: "#7d5739",
  metal: "#646b72",
  brass: "#a08540",
  quill: "#141210",
  frame: "#3a352d",
};

/** Materials drawn with a stipple of fibres. */
const FIBROUS: ReadonlySet<Material> = new Set([
  "felt",
  "redFelt",
  "hammerFelt",
  "damperFelt",
  "cloth",
]);

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
  const full = Math.abs(to - from) >= 2 * Math.PI - 1e-9;
  const n = full ? steps : steps + 1;
  return Array.from({ length: n }, (_, i) => {
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

/** A repeatable pseudo-random number in [-1, 1] for integer inputs. */
function noise(a: number, b: number, c = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

function hashName(name: string) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return h | 0;
}

function signedArea(points: Pt[]) {
  let a = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    a += (points[j][0] - points[i][0]) * (points[j][1] + points[i][1]);
  }
  return a / 2;
}

const mix = (a: string, b: string, t: number) => {
  const pa = Number.parseInt(a.slice(1), 16);
  const pb = Number.parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const c = (s: number) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return `rgb(${c(16)}, ${c(8)}, ${c(0)})`;
};

export type ShapeStyle = {
  material?: Material;
  fill?: string;
  /** Draw no outline. */
  bare?: boolean;
  /** Outline width as a multiple of the scene's ink line. */
  lineWidth?: number;
  alpha?: number;
  /** No hatch strokes on the shadow side. */
  plain?: boolean;
};

/** The paper behind a drawing: a flat tone with soft creases, cached per size. */
const paperCache = new Map<string, HTMLCanvasElement>();

function paperTexture(width: number, height: number, base: string, dark: boolean) {
  const key = `${Math.round(width)}x${Math.round(height)}:${base}:${dark}`;
  const cached = paperCache.get(key);
  if (cached) return cached;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);
  // Creases: big faint facets, some lighter and some darker, blurred soft like crumpled paper.
  ctx.filter = "blur(16px)";
  const facets = 34;
  for (let i = 0; i < facets; i++) {
    const cx = ((noise(i, 1) + 1) / 2) * width;
    const cy = ((noise(i, 2) + 1) / 2) * height;
    const r = (0.12 + 0.2 * ((noise(i, 3) + 1) / 2)) * Math.max(width, height);
    const a0 = noise(i, 4) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let k = 0; k < 3; k++) {
      const a = a0 + (k * 2 * Math.PI) / 3 + noise(i, 5 + k) * 0.6;
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.closePath();
    const light = noise(i, 9) > 0;
    ctx.fillStyle = light
      ? `rgba(255,255,255,${dark ? 0.012 : 0.09})`
      : `rgba(0,0,0,${dark ? 0.03 : 0.009})`;
    ctx.fill();
  }
  ctx.filter = "none";
  // A fine grain.
  const grains = Math.round((width * height) / 90);
  ctx.fillStyle = dark ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.035)";
  for (let i = 0; i < grains; i++) {
    const x = ((noise(i, 11) + 1) / 2) * width;
    const y = ((noise(i, 12) + 1) / 2) * height;
    ctx.fillRect(x, y, 0.8, 0.8);
  }
  if (paperCache.size > 12) paperCache.clear();
  paperCache.set(key, canvas);
  return canvas;
}

/** Fills the canvas with paper. */
export function drawPaper(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  colors: PanelColors,
  dark: boolean,
) {
  ctx.drawImage(paperTexture(width, height, colors.track, dark), 0, 0, width, height);
}

export class Scene {
  readonly scale: number;
  readonly hits: Hit[] = [];
  readonly material: Record<Material, string>;
  readonly outline: string;
  /** The ink line width in pixels. */
  readonly ink: number;
  private ox: number;
  private oy: number;
  private seen = new Map<string, number>();
  private hoverBox: { name: string; x0: number; y0: number; x1: number; y1: number } | null = null;

  constructor(
    readonly ctx: CanvasRenderingContext2D,
    view: View,
    readonly width: number,
    readonly height: number,
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
    this.ink = Math.max(1.3, Math.min(2.4, width / 380));
  }

  px = ([x, y]: Pt): [number, number] => [this.ox + x * this.scale, this.oy - y * this.scale];

  /** Model point from canvas pixels. */
  model = (cx: number, cy: number): Pt => [
    (cx - this.ox) / this.scale,
    (this.oy - cy) / this.scale,
  ];

  /** A seed that stays the same for the same part from frame to frame. */
  private seed(key: string) {
    const n = this.seen.get(key) ?? 0;
    this.seen.set(key, n + 1);
    return hashName(key) + n * 7919;
  }

  /**
   * The outline as a smooth closed path in pixels: each edge gets a slight
   * bow and wobble, each corner a small round.
   */
  private inkPath(points: [number, number][], seed: number, wobble: number) {
    const n = points.length;
    const controls: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = points[i];
      const b = points[(i + 1) % n];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      controls.push(a);
      if (len < 1e-6) continue;
      const ux = dx / len;
      const uy = dy / len;
      const corner = Math.min(2.6, len / 3.2);
      const bow = len > 40 ? noise(seed, i, 1) * Math.min(1.1, len / 120) * wobble : 0;
      const pieces = Math.max(1, Math.floor((len - 2 * corner) / 14));
      const at = (t: number, d: number): [number, number] => {
        const off = d + bow * Math.sin(Math.PI * t);
        return [a[0] + dx * t - uy * off, a[1] + dy * t + ux * off];
      };
      controls.push(at(corner / len, 0));
      for (let k = 1; k < pieces; k++) {
        const t = (corner + ((len - 2 * corner) * k) / pieces) / len;
        controls.push(at(t, len > 16 ? noise(seed, i, k + 2) * 0.45 * wobble : 0));
      }
      controls.push(at(1 - corner / len, 0));
    }
    const { ctx } = this;
    const m = controls.length;
    const mid = (p: [number, number], q: [number, number]) =>
      [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] as const;
    ctx.beginPath();
    const start = mid(controls[m - 1], controls[0]);
    ctx.moveTo(start[0], start[1]);
    for (let i = 0; i < m; i++) {
      const c = controls[i];
      const e = mid(c, controls[(i + 1) % m]);
      ctx.quadraticCurveTo(c[0], c[1], e[0], e[1]);
    }
    ctx.closePath();
  }

  /** Short parallel strokes just inside the edges that face down: the shadow side. */
  private hatch(local: Pt[], placed: [number, number][], seed: number, width: number) {
    const ctx = this.ctx;
    const ccw = signedArea(local) > 0;
    const n = local.length;
    ctx.strokeStyle = this.outline;
    ctx.globalAlpha = this.dark ? 0.45 : 0.6;
    ctx.lineWidth = Math.max(0.9, width * 0.55);
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = local[i];
      const b = local[(i + 1) % n];
      const ex = b[0] - a[0];
      const ey = b[1] - a[1];
      const len = Math.hypot(ex, ey);
      if (len < 1e-6) continue;
      // The outward normal's y in model space (y up): below −0.55 the edge faces down.
      const ny = (ccw ? -ex : ex) / len;
      if (ny > -0.55) continue;
      const pa = placed[i];
      const pb = placed[(i + 1) % n];
      const plen = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
      if (plen < 26) continue;
      const ux = (pb[0] - pa[0]) / plen;
      const uy = (pb[1] - pa[1]) / plen;
      // Inward, in pixels: the outward normal turned into screen space and flipped.
      let ix = -uy;
      let iy = ux;
      const probe = [pa[0] + ux * plen * 0.5 + ix * 3, pa[1] + uy * plen * 0.5 + iy * 3];
      if (!inside(placed, probe[0], probe[1])) {
        ix = -ix;
        iy = -iy;
      }
      const clusters = Math.max(1, Math.round(plen / 140));
      for (let c = 0; c < clusters; c++) {
        const t = (c + 0.5 + noise(seed, i, c + 40) * 0.25) / clusters;
        const strokes = (3 + (noise(seed, i, c + 60) + 1) * 1.2) | 0;
        const gap = 2.6 + width * 0.4;
        const span = (strokes - 1) * gap;
        const cx = pa[0] + ux * plen * t;
        const cy = pa[1] + uy * plen * t;
        if (span > plen * 0.8) continue;
        for (let k = 0; k < strokes; k++) {
          const along = -span / 2 + k * gap;
          const sx = cx + ux * along + ix * 2.5;
          const sy = cy + uy * along + iy * 2.5;
          const reach = 4 + 2 * Math.abs(noise(seed, i, k + c * 9 + 80));
          // Slanted: half along the edge, mostly inward.
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + (ix + ux * 0.6) * reach, sy + (iy + uy * 0.6) * reach);
        }
      }
    }
    ctx.stroke();
  }

  /** Fibre dots inside felt and cloth, fixed to the part. */
  private stipple(local: Pt[], pose: Pose | undefined, seed: number) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [x, y] of local) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    const areaPx = (x1 - x0) * (y1 - y0) * this.scale * this.scale;
    const count = Math.min(220, Math.round(areaPx / 70));
    if (count < 2) return;
    const { ctx } = this;
    ctx.fillStyle = this.outline;
    ctx.globalAlpha = this.dark ? 0.3 : 0.32;
    for (let i = 0; i < count; i++) {
      const p: Pt = [
        x0 + ((noise(seed, i, 101) + 1) / 2) * (x1 - x0),
        y0 + ((noise(seed, i, 102) + 1) / 2) * (y1 - y0),
      ];
      const [x, y] = this.px(pose ? place(p, pose) : p);
      ctx.fillRect(x - 0.5, y - 0.5, 1.1, 1.1);
    }
  }

  /** A filled, inked part. A named part can be pointed at and marked. */
  shape(name: string | null, points: Pt[], style: ShapeStyle = {}, pose?: Pose) {
    const placed = pose ? points.map((p) => place(p, pose)) : points;
    const pixels = placed.map(this.px);
    const { ctx } = this;
    const seed = this.seed(`${name ?? style.material ?? style.fill ?? "?"}#${points.length}`);
    let bx0 = Infinity;
    let by0 = Infinity;
    let bx1 = -Infinity;
    let by1 = -Infinity;
    for (const [x, y] of pixels) {
      bx0 = Math.min(bx0, x);
      by0 = Math.min(by0, y);
      bx1 = Math.max(bx1, x);
      by1 = Math.max(by1, y);
    }
    const small = Math.min(bx1 - bx0, by1 - by0);
    const width = this.ink * (style.lineWidth ?? 1) * (small < 7 ? 0.6 : small < 14 ? 0.8 : 1);
    const wobble = small < 10 ? 0.3 : 1;
    const hovered = name !== null && this.hovered === name;
    const fresh = name !== null && this.fresh.has(name);
    const fill = style.fill ?? this.material[style.material ?? "wood"];

    ctx.save();
    ctx.globalAlpha = style.alpha ?? 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    this.inkPath(pixels, seed, wobble);
    // New and pointed-at parts get a wash of red ink behind their outline.
    if ((hovered || fresh) && !style.bare) {
      ctx.save();
      ctx.strokeStyle = this.colors.accent;
      ctx.globalAlpha = (style.alpha ?? 1) * (hovered ? 0.75 : 0.45);
      ctx.lineWidth = width + (hovered ? 7 : 5);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle =
      (hovered || fresh) && fill.startsWith("#") && fill.length === 7
        ? mix(
            fill,
            this.colors.accent.length === 7 ? this.colors.accent : "#c2582f",
            hovered ? 0.3 : 0.16,
          )
        : fill;
    ctx.fill();
    if (!style.bare && !style.plain && small >= 9 && style.material !== "ebony") {
      ctx.save();
      ctx.clip();
      if (style.material && FIBROUS.has(style.material)) this.stipple(points, pose, seed);
      this.hatch(placed, pixels, seed, width);
      ctx.restore();
      this.inkPath(pixels, seed, wobble);
    } else if (style.material && FIBROUS.has(style.material) && small >= 5) {
      ctx.save();
      ctx.clip();
      this.stipple(points, pose, seed);
      ctx.restore();
      this.inkPath(pixels, seed, wobble);
    }
    if (!style.bare) {
      ctx.strokeStyle = this.outline;
      ctx.globalAlpha = style.alpha ?? 1;
      ctx.lineWidth = width;
      ctx.stroke();
    }
    ctx.restore();
    if (name) {
      this.hits.push({ name, poly: pixels });
      if (hovered) this.growHover(name, bx0, by0, bx1, by1);
    }
  }

  private growHover(name: string, x0: number, y0: number, x1: number, y1: number) {
    const box = this.hoverBox;
    if (box && box.name === name) {
      box.x0 = Math.min(box.x0, x0);
      box.y0 = Math.min(box.y0, y0);
      box.x1 = Math.max(box.x1, x1);
      box.y1 = Math.max(box.y1, y1);
    } else this.hoverBox = { name, x0, y0, x1, y1 };
  }

  /** An open line, e.g. a wire or a string. Lines 1.8 px and wider are drawn as an inked wire. */
  line(name: string | null, points: Pt[], color: string, width: number, pose?: Pose) {
    const placed = pose ? points.map((p) => place(p, pose)) : points;
    const pixels = placed.map(this.px);
    const { ctx } = this;
    const hovered = name !== null && this.hovered === name;
    const fresh = name !== null && this.fresh.has(name);
    const trace = () => {
      ctx.beginPath();
      pixels.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
    };
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    trace();
    if (hovered || fresh) {
      ctx.strokeStyle = this.colors.accent;
      ctx.globalAlpha = hovered ? 0.75 : 0.45;
      ctx.lineWidth = width + (hovered ? 8 : 6);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (width >= 1.8) {
      ctx.strokeStyle = this.outline;
      ctx.lineWidth = width + Math.max(1.6, this.ink * 0.9);
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(0.8, width - 0.6);
      ctx.stroke();
    } else {
      ctx.strokeStyle = this.outline;
      ctx.lineWidth = Math.max(0.9, width);
      ctx.stroke();
    }
    ctx.restore();
    if (name) {
      // A fat band around the line, so a thin wire is easy to point at.
      const pad = Math.max(5, width + 2);
      const band: [number, number][] = [];
      for (const [x, y] of pixels) band.push([x - pad, y - pad]);
      for (const [x, y] of [...pixels].reverse()) band.push([x + pad, y + pad]);
      this.hits.push({ name, poly: band });
      if (hovered) {
        const xs = pixels.map((p) => p[0]);
        const ys = pixels.map((p) => p[1]);
        this.growHover(name, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
      }
    }
  }

  /** A pivot pin: a small inked ring with a dot. */
  pin(at: Pt, pose?: Pose, r = 2.2) {
    const [x, y] = this.px(pose ? place(at, pose) : at);
    const rad = Math.max(2.4, r * this.scale);
    const { ctx } = this;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, 2 * Math.PI);
    ctx.fillStyle = this.material.metal;
    ctx.fill();
    ctx.strokeStyle = this.outline;
    ctx.lineWidth = Math.max(1, this.ink * 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.9, rad * 0.3), 0, 2 * Math.PI);
    ctx.fillStyle = this.outline;
    ctx.fill();
    ctx.restore();
  }

  /**
   * A magnified view: a paper card with an inked frame, and two dashed lines
   * from the spot it enlarges. Draw its contents after this.
   */
  inset(box: Pt[], from?: Pt) {
    const pixels = box.map(this.px);
    const { ctx } = this;
    ctx.save();
    if (from) {
      const [fx, fy] = this.px(from);
      const xs = pixels.map((p) => p[0]);
      const ys = pixels.map((p) => p[1]);
      const left = Math.min(...xs);
      const top = Math.min(...ys);
      const bottom = Math.max(...ys);
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = this.outline;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(left, top + 8);
      ctx.moveTo(fx, fy);
      ctx.lineTo(left, bottom - 8);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(fx, fy, 6, 0, 2 * Math.PI);
      ctx.lineWidth = this.ink * 0.8;
      ctx.stroke();
    }
    this.inkPath(pixels, 77, 1);
    ctx.fillStyle = this.dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.32)";
    ctx.fill();
    ctx.strokeStyle = this.outline;
    ctx.lineWidth = this.ink;
    ctx.stroke();
    ctx.restore();
  }

  /** Clips later drawing to `box` (in model units) until `unclip`. */
  clip(box: Pt[]) {
    const { ctx } = this;
    ctx.save();
    ctx.beginPath();
    box.map(this.px).forEach(([x, y], i) => {
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.clip();
  }

  unclip() {
    this.ctx.restore();
  }

  /** Names the part under the pointer with a small hand-lettered tag. Call after drawing. */
  finish() {
    const box = this.hoverBox;
    if (!box) return;
    const { ctx } = this;
    const label = box.name;
    ctx.save();
    ctx.font = `600 ${Math.round(Math.max(12, Math.min(15, this.width / 60)))}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
    const w = ctx.measureText(label).width;
    const h = 22;
    const anchorX = (box.x0 + box.x1) / 2;
    const anchorY = box.y0;
    let x = anchorX + 18;
    let y = anchorY - 30;
    if (x + w + 16 > this.width - 4) x = Math.max(4, anchorX - 18 - w - 16);
    if (y < 4) y = Math.min(this.height - h - 4, box.y1 + 10);
    ctx.strokeStyle = this.colors.accent;
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(anchorX, anchorY + 2);
    ctx.quadraticCurveTo(anchorX + 2, y + h / 2, x, y + h / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(anchorX, anchorY + 2, 2.4, 0, 2 * Math.PI);
    ctx.fillStyle = this.colors.accent;
    ctx.fill();
    this.inkPath(
      [
        [x, y],
        [x + w + 16, y],
        [x + w + 16, y + h],
        [x, y + h],
      ],
      hashName(label),
      0.6,
    );
    ctx.fillStyle = this.colors.track;
    ctx.fill();
    ctx.strokeStyle = this.colors.accent;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = this.colors.ink;
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + 8, y + h / 2 + 0.5);
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
  scene.line(null, points, scene.material.metal, 1.3);
}
