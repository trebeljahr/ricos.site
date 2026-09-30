export type FrameEdge = "top" | "bottom" | "left" | "right";
export type FrameSpot = { x: number; y: number };
type Box = { left: number; right: number; top: number; bottom: number };
type Item = { edge: FrameEdge; width: number; height: number };

const CLEARANCE = 32;
const GAP = 20;
const JITTER = [-0.65, 0.8, -0.3, 0.55];

/** Four bands with equal free space between items, plus bounded jitter along
 * each band. Return no frame when it would crowd the content or the chrome. */
export function placeFrame(items: Item[], bounds: Box, content: Box): FrameSpot[] | null {
  const bands: Record<FrameEdge, Box> = {
    top: { ...bounds, bottom: content.top - CLEARANCE },
    bottom: { ...bounds, top: content.bottom + CLEARANCE },
    left: { ...content, left: bounds.left, right: content.left - CLEARANCE },
    right: { ...content, left: content.right + CLEARANCE, right: bounds.right },
  };
  const spots: FrameSpot[] = new Array(items.length);

  for (const edge of ["top", "bottom", "left", "right"] as const) {
    const row = edge === "top" || edge === "bottom";
    const band = bands[edge];
    const group = items
      .map((item, index) => ({ ...item, index }))
      .filter((item) => item.edge === edge);
    if (!group.length) continue;
    const length = row ? band.right - band.left : band.bottom - band.top;
    const depth = row ? band.bottom - band.top : band.right - band.left;
    const occupied = group.reduce((total, item) => total + (row ? item.width : item.height), 0);
    const gap = (length - occupied) / (group.length + 1);
    if (gap < GAP || group.some((item) => (row ? item.height : item.width) > depth)) return null;

    // Even opposing offsets cannot eat the minimum gap or the edge margin.
    const jitter = Math.min(12, (gap - GAP) / 2);
    let cursor = (row ? band.left : band.top) + gap;
    group.forEach((item, i) => {
      const offset =
        JITTER[(i + (edge === "bottom" || edge === "right" ? 1 : 0)) % JITTER.length] * jitter;
      spots[item.index] = row
        ? { x: cursor + offset, y: (band.top + band.bottom - item.height) / 2 }
        : { x: (band.left + band.right - item.width) / 2, y: cursor + offset };
      cursor += (row ? item.width : item.height) + gap;
    });
  }
  return spots;
}
