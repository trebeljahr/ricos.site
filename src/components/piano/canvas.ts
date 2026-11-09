import { type RefObject, useEffect, useRef } from "react";

/** Sizes a canvas to its CSS box at device resolution; returns a context in CSS pixels. */
export function fitCanvas(canvas: HTMLCanvasElement) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx, width, height };
}

export type PanelColors = {
  ink: string;
  muted: string;
  line: string;
  accent: string;
  track: string;
};

/** The panel's theme colours, read from its CSS custom properties. */
export function panelColors(element: Element | null): PanelColors {
  const style = element ? getComputedStyle(element) : null;
  const read = (name: string, fallback: string) => style?.getPropertyValue(name).trim() || fallback;
  return {
    ink: read("--ink", "#23201b"),
    muted: read("--muted", "#776d60"),
    line: read("--line", "#e3dbcd"),
    accent: read("--accent", "#c2582f"),
    track: read("--track", "#efe8dc"),
  };
}

/**
 * Calls `frame(seconds)` on every animation frame while the element is on
 * screen. `frame` may change between renders.
 */
export function useAnimation(ref: RefObject<Element | null>, frame: (time: number) => void) {
  const latest = useRef(frame);
  latest.current = frame;
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let visible = true;
    let id = 0;
    const loop = (ms: number) => {
      if (visible) latest.current(ms / 1000);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
      });
      observer.observe(node);
    }
    return () => {
      cancelAnimationFrame(id);
      observer?.disconnect();
    };
  }, [ref]);
}

/** Maps a 0–1 slider position to a frequency on a log scale, and back. */
export const logScale = (min: number, max: number) => ({
  toValue: (t: number) => min * (max / min) ** t,
  toPosition: (value: number) => Math.log(value / min) / Math.log(max / min),
});
