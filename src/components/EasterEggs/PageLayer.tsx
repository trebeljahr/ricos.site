import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export type PageBox = { left: number; top: number; width: number; height: number };

/** An element's box in document coordinates, so overlays scroll with the page. */
export function pageBox(el: Element): PageBox {
  const r = el.getBoundingClientRect();
  return {
    left: r.left + window.scrollX,
    top: r.top + window.scrollY,
    width: r.width,
    height: r.height,
  };
}

/** Keeps an overlay of `width` inside the viewport so it never adds horizontal scroll. */
export function clampPageX(left: number, width: number, gutter = 12) {
  const min = window.scrollX + gutter;
  const max = window.scrollX + document.documentElement.clientWidth - width - gutter;
  return Math.max(min, Math.min(left, max));
}

/**
 * Renders egg overlays on document.body, outside headings and card galleries.
 * Zero-size and click-through, so it never shifts layout or blocks the page.
 */
export const PageLayer = ({ children }: { children: ReactNode }) =>
  createPortal(
    <div className="pointer-events-none absolute top-0 left-0 z-50 h-0 w-0">{children}</div>,
    document.body,
  );
