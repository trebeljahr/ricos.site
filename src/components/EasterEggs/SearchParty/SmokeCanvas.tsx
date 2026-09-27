import { type RefObject, useEffect, useRef } from "react";

export type Point = { x: number; y: number };

type SmokeProps = {
  /** Where the pointer is inside the field, in field pixels, or null when it is away. */
  pointerRef: RefObject<Point | null>;
  /** Element the focus is published on as CSS variables, for the glow and the blur veil. */
  varsRef: RefObject<HTMLElement | null>;
  /** Called every frame with the eased focus, so the egg can pick up what it passes. */
  onFocus: (x: number, y: number) => void;
  /** Fades the cloud out for good once everything is found. */
  lifted: boolean;
  calm: boolean;
};

/** Grid the smoke is simulated on. CSS blows it up, so it can stay small. */
const GRID_W = 160;
const NOISE = 128;
/** How far the focus reaches, as a share of the grid width. */
const FOCUS = 0.17;
/** How lazily the focus follows the pointer: the reveal drifts after it. */
const EASE = 0.1;
/** What survives of a thinned patch each frame, so the smoke rolls calmly back. */
const RETURN = 0.93;
/** The smoke never fully parts: even in focus a little of it stays. */
const THINNEST = 0.95;

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** One wrapping blur pass, to turn white noise into billows. */
function soften(field: Float32Array, size: number) {
  const out = new Float32Array(field.length);
  for (let y = 0; y < size; y++) {
    const up = ((y - 1 + size) % size) * size;
    const row = y * size;
    const down = ((y + 1) % size) * size;
    for (let x = 0; x < size; x++) {
      const left = (x - 1 + size) % size;
      const right = (x + 1) % size;
      out[row + x] =
        (field[up + left] +
          field[up + x] +
          field[up + right] +
          field[row + left] +
          field[row + x] * 2 +
          field[row + right] +
          field[down + left] +
          field[down + x] +
          field[down + right]) /
        10;
    }
  }
  return out;
}

/** A tileable cloud texture, smoothed until it reads as smoke rather than static. */
function cloudTexture(size: number) {
  let field = new Float32Array(size * size);
  for (let i = 0; i < field.length; i++) field[i] = Math.random();
  for (let pass = 0; pass < 5; pass++) field = soften(field, size);
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const value of field) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  const span = max - min || 1;
  for (let i = 0; i < field.length; i++) field[i] = (field[i] - min) / span;
  return field;
}

/** Bilinear sample of the wrapping cloud texture. */
function sample(field: Float32Array, size: number, x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const x0 = ((xi % size) + size) % size;
  const y0 = ((yi % size) + size) % size;
  const x1 = (x0 + 1) % size;
  const y1 = (y0 + 1) % size;
  const a = field[y0 * size + x0];
  const b = field[y0 * size + x1];
  const c = field[y1 * size + x0];
  const d = field[y1 * size + x1];
  return a + (b - a) * fx + (c - a) * fy + (d + a - b - c) * fx * fy;
}

/**
 * Two layers of drifting cloud, the fine one warped by the coarse one. The
 * focus follows the pointer a beat behind and thins the smoke around itself
 * with a noise-chewed edge, so nothing reads as a circle, and the veil under
 * the smoke lifts its blur over the same spot. Everything else rolls back in.
 */
export const SmokeCanvas = ({ pointerRef, varsRef, onFocus, lifted, calm }: SmokeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onFocusRef = useRef(onFocus);
  onFocusRef.current = onFocus;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const cloud = cloudTexture(NOISE);
    let grid = { w: GRID_W, h: 1 };
    let thinned = new Float32Array(0);
    let image = context.createImageData(1, 1);
    let focus: Point | null = null;
    let strength = 0;
    let frame = 0;
    let stopped = false;

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const h = Math.max(1, Math.round((GRID_W * box.height) / Math.max(1, box.width)));
      if (canvas.width === GRID_W && canvas.height === h) return;
      canvas.width = GRID_W;
      canvas.height = h;
      grid = { w: GRID_W, h };
      thinned = new Float32Array(GRID_W * h);
      image = context.createImageData(GRID_W, h);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (now: number) => {
      if (stopped) return;
      frame = window.requestAnimationFrame(draw);
      const { w, h } = grid;
      const box = canvas.getBoundingClientRect();
      if (!box.width || !box.height) return;

      // The focus trails the pointer, and fades away when the pointer leaves.
      const target = pointerRef.current;
      if (target) {
        const gx = (target.x / box.width) * w;
        const gy = (target.y / box.height) * h;
        focus = focus
          ? { x: focus.x + (gx - focus.x) * EASE, y: focus.y + (gy - focus.y) * EASE }
          : { x: gx, y: gy };
        strength += (1 - strength) * 0.08;
      } else {
        strength *= 0.94;
      }

      const t = calm ? 0 : now * 0.00006;
      const reach = w * FOCUS;
      const dark = document.documentElement.classList.contains("dark");
      const [r, g, b] = dark ? [104, 119, 146] : [176, 186, 203];
      const pixels = image.data;
      const next = new Float32Array(thinned.length);

      for (let y = 0; y < h; y++) {
        const v = y / h;
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          // Wider than it is tall, and drifting up: smoke, not clouds.
          const coarse = sample(cloud, NOISE, x * 0.34 + t * 24, y * 0.74 - t * 60);
          // The coarse layer bends the fine one. That bend is what makes plumes.
          const warp = (coarse - 0.5) * 18;
          const fine = sample(
            cloud,
            NOISE,
            x * 0.9 + warp + t * 14,
            y * 1.7 + warp * 0.6 - t * 104,
          );
          const wisps = sample(cloud, NOISE, x * 1.9 - warp, y * 3.4 - t * 150);
          const density = coarse * 0.52 + fine * 0.4 + wisps * 0.22;

          // What the focus takes away this frame, with an edge chewed by the cloud.
          let bite = 0;
          if (focus && strength > 0.01) {
            const edge = reach * (0.72 + fine * 0.55);
            const near = 1 - Math.hypot(x - focus.x, y - focus.y) / edge;
            if (near > 0) bite = smoothstep(0, 0.85, near) * strength * THINNEST;
          }
          // Smoke closes back in wherever the focus has moved on.
          const left = x > 0 ? thinned[i - 1] : thinned[i];
          const right = x < w - 1 ? thinned[i + 1] : thinned[i];
          const up = y > 0 ? thinned[i - w] : thinned[i];
          const down = y < h - 1 ? thinned[i + w] : thinned[i];
          const drift = (thinned[i] * 0.76 + (left + right + up + down) * 0.06) * RETURN;
          const clearness = Math.max(drift, bite);
          next[i] = clearness;

          const border =
            smoothstep(0, 0.14, x / w) *
            smoothstep(0, 0.14, 1 - x / w) *
            smoothstep(0, 0.1, v) *
            smoothstep(0, 0.12, 1 - v);
          const alpha = (0.2 + smoothstep(0.34, 0.86, density) * 0.8) * border * (1 - clearness);
          // Denser smoke is a shade paler, as if lit from the side.
          const lit = (density - 0.5) * (dark ? 52 : 40);
          const p = i * 4;
          pixels[p] = Math.max(0, Math.min(255, r + lit));
          pixels[p + 1] = Math.max(0, Math.min(255, g + lit));
          pixels[p + 2] = Math.max(0, Math.min(255, b + lit * 1.2));
          pixels[p + 3] = Math.max(0, Math.min(255, alpha * 255));
        }
      }
      thinned = next;
      context.putImageData(image, 0, 0);

      // The glow behind the smoke and the blur veil both follow this spot, so the
      // parted smoke shows light and sharp text in the same place.
      const vars = varsRef.current;
      if (vars && focus) {
        const scale = box.width / w;
        vars.style.setProperty("--focus-x", `${focus.x * scale}px`);
        vars.style.setProperty("--focus-y", `${focus.y * (box.height / h)}px`);
        vars.style.setProperty("--focus-r", `${reach * scale * strength * 1.15}px`);
      }
      if (focus && strength > 0.3)
        onFocusRef.current(focus.x * (box.width / w), focus.y * (box.height / h));
    };
    frame = window.requestAnimationFrame(draw);

    return () => {
      stopped = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [calm, pointerRef, varsRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-15 h-full w-full scale-105 blur-[6px] transition-opacity duration-1000"
      style={{ opacity: lifted ? 0 : 1 }}
    />
  );
};
