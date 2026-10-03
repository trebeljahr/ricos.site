export type ViewportState = { zoom: number; left: number; top: number };
export type FoldBox = { x: number; y: number; width: number; height: number };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Follow the same box through a reflow, keeping its contents in view. */
export function followFold(
  viewport: ViewportState,
  before: FoldBox,
  after: FoldBox,
  size: { width: number; height: number },
): ViewportState {
  const padding = Math.min(40, size.width / 10, size.height / 10);
  const contraction = Math.max(
    1,
    Math.min(before.width / after.width, before.height / after.height),
  );
  const zoom = Math.min(
    viewport.zoom * contraction,
    (size.width - padding * 2) / after.width,
    (size.height - padding * 2) / after.height,
  );
  // Keep the box near its former screen position, shifting only enough to show it.
  const x = clamp(
    (before.x + before.width / 2) * viewport.zoom - viewport.left,
    padding + (after.width * zoom) / 2,
    size.width - padding - (after.width * zoom) / 2,
  );
  const y = clamp(
    (before.y + before.height / 2) * viewport.zoom - viewport.top,
    padding + (after.height * zoom) / 2,
    size.height - padding - (after.height * zoom) / 2,
  );
  return {
    zoom,
    left: (after.x + after.width / 2) * zoom - x,
    top: (after.y + after.height / 2) * zoom - y,
  };
}

/** For toolbar actions, follow the changed box nearest the user's current view. */
export function foldFocus(
  before: ReadonlyMap<string, FoldBox>,
  after: ReadonlyMap<string, FoldBox>,
  changed: readonly string[],
  viewport: ViewportState,
  size: { width: number; height: number },
): string | undefined {
  const x = (viewport.left + size.width / 2) / viewport.zoom;
  const y = (viewport.top + size.height / 2) / viewport.zoom;
  let closest: string | undefined;
  let distance = Infinity;
  for (const path of changed) {
    const box = before.get(path);
    if (!box || !after.has(path)) continue;
    const next = Math.hypot(
      x - clamp(x, box.x, box.x + box.width),
      y - clamp(y, box.y, box.y + box.height),
    );
    if (next < distance) {
      closest = path;
      distance = next;
    }
  }
  return closest;
}
