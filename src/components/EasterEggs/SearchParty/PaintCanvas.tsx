import { type RefObject, useEffect, useRef } from "react";

export type PaintHandle = {
  /** Wipes a stroke to a point, in client pixels. */
  wipe: (x: number, y: number) => void;
  /** Lifts the cloth, so the next wipe starts a stroke of its own. */
  lift: () => void;
  /** Tips another bucket over the page, around a point or in the middle. */
  splash: (x?: number, y?: number) => void;
  /** How much of a rectangle is still under paint, from 0 to 1. */
  paintOver: (rect: DOMRect) => number;
};

type PaintProps = {
  handleRef: RefObject<PaintHandle | null>;
  /** Called after every change with how much of the screen is still painted. */
  onCoverage: (left: number) => void;
  /** Called with false when there is no canvas, so the page can show its links. */
  onReady: (ok: boolean) => void;
  /** No pouring animation when the reader asked for less movement. */
  calm: boolean;
};

/** Blotches in one bucket, over a jittered grid. */
const COLS = 6;
const ROWS = 4;
/** How far a blotch reaches past its own cell, so the sheet has no gaps. */
const SPREAD = 0.92;
/** Small spatters thrown off around the grid, for the look of a real splat. */
const SPATTERS = 14;
/** Radius of the wipe, in client pixels. */
const BRUSH = 52;
/** The coverage grid. Small enough to read every frame without a stutter. */
const THUMB_W = 96;
const THUMB_H = 60;
/** Paint counts as gone below this much alpha. */
const PAINT_ALPHA = 60;
/** How long a bucket takes to run out over the page. */
const POUR_MS = 420;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** One blotch: flat paint with a wobbly edge and a darker rim where it pooled. */
function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hue: number) {
  const [w1, w2, w3] = [rand(0, 6.3), rand(0, 6.3), rand(0, 6.3)];
  const [d1, d2] = [rand(0.08, 0.17), rand(0.04, 0.09)];
  ctx.beginPath();
  for (let a = 0; a <= Math.PI * 2 + 0.05; a += Math.PI / 40) {
    const wobble =
      1 + d1 * Math.sin(a * 3 + w1) + d2 * Math.sin(a * 5 + w2) + 0.03 * Math.sin(a * 8 + w3);
    ctx.lineTo(x + Math.cos(a) * r * wobble, y + Math.sin(a) * r * wobble);
  }
  ctx.closePath();
  const light = rand(46, 62);
  ctx.fillStyle = `hsl(${hue} ${rand(62, 84)}% ${light}% / 0.97)`;
  ctx.fill();
  // The rim a real blotch dries with, a shade of its own colour.
  ctx.strokeStyle = `hsl(${hue} 72% ${light - 13}% / 0.7)`;
  ctx.lineWidth = r * 0.06;
  ctx.stroke();
}

/**
 * The paint over the 404 page. A canvas the size of the window, covered in
 * blobs, which the pointer wipes away to uncover whatever the page keeps under
 * them. It draws only when something happens — a wipe, a pour, a resize — so
 * a page left alone costs nothing at all.
 */
export const PaintCanvas = ({ handleRef, onCoverage, onReady, calm }: PaintProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCoverageRef = useRef(onCoverage);
  onCoverageRef.current = onCoverage;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const calmRef = useRef(calm);
  calmRef.current = calm;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      onReadyRef.current(false);
      return;
    }

    // The screen in miniature, read back after every change to tell how much
    // paint is left and what is now uncovered.
    const thumb = document.createElement("canvas");
    thumb.width = THUMB_W;
    thumb.height = THUMB_H;
    const thumbCtx = thumb.getContext("2d", { willReadFrequently: true });
    let grid: Uint8ClampedArray | null = null;

    let dpr = 1;
    let from: { x: number; y: number } | null = null;
    let measuring = 0;
    let pouring = 0;
    let poured = false;

    const size = () => ({ w: canvas.clientWidth, h: canvas.clientHeight });

    /** Reads the paint back, cheaply, and hands the page the new coverage. */
    const measure = () => {
      if (!thumbCtx) return;
      thumbCtx.clearRect(0, 0, THUMB_W, THUMB_H);
      thumbCtx.drawImage(canvas, 0, 0, THUMB_W, THUMB_H);
      grid = thumbCtx.getImageData(0, 0, THUMB_W, THUMB_H).data;
      let left = 0;
      for (let i = 3; i < grid.length; i += 4) if (grid[i] > PAINT_ALPHA) left++;
      onCoverageRef.current(left / (THUMB_W * THUMB_H));
    };

    /** One measurement per frame however many wipes land in it. */
    const remeasure = () => {
      if (measuring) return;
      measuring = window.requestAnimationFrame(() => {
        measuring = 0;
        measure();
      });
    };

    /** A sheet of blobs over the whole window, or a cluster around a point. */
    const pour = (at?: { x: number; y: number }, scale = 1) => {
      const { w, h } = size();
      const reach = at ? 0.48 : 1;
      const spanW = w * reach;
      const spanH = h * reach;
      const cellW = spanW / COLS;
      const cellH = spanH / ROWS;
      // A blotch over every cell, and the grid runs past the edges of the
      // window, so no corner is left showing through.
      const originX = at ? at.x - spanW / 2 : 0;
      const originY = at ? at.y - spanH / 2 : 0;
      // One bucket holds a handful of colours that belong together, rather
      // than every hue at once, which reads as a test card and not as paint.
      const base = rand(0, 360);
      const family = [0, 28, 62, 168, 196, 330].map((step) => (base + step) % 360);
      const pick = () => family[Math.floor(Math.random() * family.length)] + rand(-9, 9);
      ctx.globalCompositeOperation = "source-over";
      for (let col = -1; col <= COLS; col++) {
        for (let row = -1; row <= ROWS; row++) {
          blob(
            ctx,
            originX + cellW * (col + rand(0.2, 0.8)),
            originY + cellH * (row + rand(0.2, 0.8)),
            Math.max(cellW, cellH) * SPREAD * scale,
            pick(),
          );
        }
      }
      for (let i = 0; i < SPATTERS; i++) {
        blob(
          ctx,
          originX + rand(-cellW, spanW + cellW),
          originY + rand(-cellH, spanH + cellH),
          Math.min(cellW, cellH) * rand(0.1, 0.3) * scale,
          pick(),
        );
      }
    };

    /** Tips a bucket over the page, running out over a few frames. */
    const splash = (x?: number, y?: number) => {
      const { w, h } = size();
      const at = x === undefined || y === undefined ? undefined : { x, y };
      if (calmRef.current) {
        pour(at);
        remeasure();
        return;
      }
      window.cancelAnimationFrame(pouring);
      const started = performance.now();
      // A first blob under the pointer, then the rest as the bucket empties.
      pour(at ?? { x: w / 2, y: h / 2 }, 0.45);
      const run = (now: number) => {
        const done = Math.min(1, (now - started) / POUR_MS);
        pour(at, 0.5 + done * 0.6);
        remeasure();
        if (done < 1) pouring = window.requestAnimationFrame(run);
      };
      pouring = window.requestAnimationFrame(run);
    };

    /** Keeps the paint when the window changes size, stretched to the new one. */
    const resize = () => {
      const next = Math.min(window.devicePixelRatio || 1, 2);
      const { w, h } = size();
      const width = Math.round(w * next);
      const height = Math.round(h * next);
      if (canvas.width === width && canvas.height === height) return;
      const keep = document.createElement("canvas");
      if (poured) {
        keep.width = canvas.width;
        keep.height = canvas.height;
        keep.getContext("2d")?.drawImage(canvas, 0, 0);
      }
      canvas.width = width;
      canvas.height = height;
      dpr = next;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";
      if (poured) {
        ctx.drawImage(keep, 0, 0, w, h);
      } else {
        pour();
        poured = true;
      }
      remeasure();
    };

    resize();
    onReadyRef.current(true);
    window.addEventListener("resize", resize);

    handleRef.current = {
      lift: () => {
        from = null;
      },
      wipe: (x, y) => {
        ctx.globalCompositeOperation = "destination-out";
        const start = from ?? { x, y };
        const span = Math.hypot(x - start.x, y - start.y);
        // Stamped along the way, so a fast sweep leaves a stroke and not dots.
        const stamps = Math.max(1, Math.ceil(span / (BRUSH * 0.4)));
        for (let i = 1; i <= stamps; i++) {
          const t = i / stamps;
          const sx = start.x + (x - start.x) * t;
          const sy = start.y + (y - start.y) * t;
          const soft = ctx.createRadialGradient(sx, sy, BRUSH * 0.35, sx, sy, BRUSH);
          soft.addColorStop(0, "rgba(0,0,0,1)");
          soft.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = soft;
          ctx.beginPath();
          ctx.arc(sx, sy, BRUSH, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
        from = { x, y };
        remeasure();
      },
      splash,
      paintOver: (rect) => {
        if (!grid) return 1;
        const { w, h } = size();
        const x0 = Math.max(0, Math.floor((rect.left / w) * THUMB_W));
        const x1 = Math.min(THUMB_W - 1, Math.ceil((rect.right / w) * THUMB_W));
        const y0 = Math.max(0, Math.floor((rect.top / h) * THUMB_H));
        const y1 = Math.min(THUMB_H - 1, Math.ceil((rect.bottom / h) * THUMB_H));
        if (x1 < x0 || y1 < y0) return 1;
        let painted = 0;
        let cells = 0;
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            cells++;
            if (grid[(y * THUMB_W + x) * 4 + 3] > PAINT_ALPHA) painted++;
          }
        }
        return cells ? painted / cells : 1;
      },
    };

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(measuring);
      window.cancelAnimationFrame(pouring);
      handleRef.current = null;
    };
  }, [handleRef]);

  return <canvas ref={canvasRef} className="block h-full w-full" />;
};
