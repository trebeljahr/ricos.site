// What a large board keeps in the DOM: a box around the view, one view wider on each
// side. It stays put while the view moves inside it, so panning redraws nothing until
// the view comes near its edge.
export type Box = { left: number; top: number; right: number; bottom: number };

/** Covers any board: a viewport with no size yet, as in a hidden tab, or in jsdom, hides nothing. */
export const EVERYTHING: Box = {
  left: Number.NEGATIVE_INFINITY,
  top: Number.NEGATIVE_INFINITY,
  right: Number.POSITIVE_INFINITY,
  bottom: Number.POSITIVE_INFINITY,
};

export const visibleBox = (box: Box, view: Box) =>
  box.left <= view.right &&
  box.right >= view.left &&
  box.top <= view.bottom &&
  box.bottom >= view.top;

/** The window to draw for what is seen now; `current` itself if that one still serves. */
export function nextViewWindow(current: Box | null, seen: Box | null): Box {
  if (!seen) return current ?? EVERYTHING;
  const width = seen.right - seen.left;
  const height = seen.bottom - seen.top;
  if (current && current !== EVERYTHING) {
    // Keep it while the view is a third of a view from every edge, and not much smaller than it.
    const inside =
      seen.left - current.left >= width / 3 &&
      seen.top - current.top >= height / 3 &&
      current.right - seen.right >= width / 3 &&
      current.bottom - seen.bottom >= height / 3;
    const fits =
      current.right - current.left <= width * 4 && current.bottom - current.top <= height * 4;
    if (inside && fits) return current;
  }
  return {
    left: seen.left - width,
    top: seen.top - height,
    right: seen.right + width,
    bottom: seen.bottom + height,
  };
}

/** The box around a drawn path's points. */
export function pathBox(subpaths: readonly (readonly { x: number; y: number }[])[]): Box {
  const box = { ...EVERYTHING, left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
  for (const points of subpaths)
    for (const { x, y } of points) {
      if (x < box.left) box.left = x;
      if (x > box.right) box.right = x;
      if (y < box.top) box.top = y;
      if (y > box.bottom) box.bottom = y;
    }
  return box;
}
