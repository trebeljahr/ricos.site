import { type DisplayNode, nodeHeight, nodeWidth } from "./nodeGeometry";

export type Spot = { x: number; y: number };
export type Rect = { left: number; top: number; right: number; bottom: number };

/** Board units kept free around a new part, so its dots and its neighbours' stay apart. */
const GAP = 24;
const STEP = 40;
const REACH = 60;

let offsets: Spot[] | undefined;
/** Every grid offset from the centre out, nearest first. Built once: the search runs on each placement. */
const spotOffsets = () => {
  offsets ??= Array.from({ length: (2 * REACH + 1) ** 2 }, (_, index) => ({
    x: ((index % (2 * REACH + 1)) - REACH) * STEP,
    y: (Math.floor(index / (2 * REACH + 1)) - REACH) * STEP,
  })).sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
  return offsets;
};

/**
 * The centre of the free spot nearest `center` with room for a part of this size. A spot inside `view`
 * wins over a nearer one the reader would have to go and find, when the view has one and can hold the part.
 */
export function openSpot(
  center: Spot,
  size: { width: number; height: number },
  nodes: readonly DisplayNode[],
  view: Rect,
): Spot {
  const halfWidth = size.width / 2;
  const halfHeight = size.height / 2;
  const clear = ({ x, y }: Spot) =>
    !nodes.some(
      (node) =>
        x - halfWidth - GAP < node.x + nodeWidth(node) &&
        x + halfWidth + GAP > node.x &&
        y - halfHeight - GAP < node.y + nodeHeight(node) &&
        y + halfHeight + GAP > node.y,
    );
  const inView = ({ x, y }: Spot) =>
    x - halfWidth >= view.left &&
    x + halfWidth <= view.right &&
    y - halfHeight >= view.top &&
    y + halfHeight <= view.bottom;
  const viewReach = Math.hypot(view.right - view.left, view.bottom - view.top);
  let outside: Spot | undefined;
  for (const offset of spotOffsets()) {
    const spot = { x: center.x + offset.x, y: center.y + offset.y };
    if (outside && Math.hypot(offset.x, offset.y) > viewReach) break;
    if (!clear(spot)) continue;
    if (inView(spot)) return spot;
    outside ??= spot;
  }
  return outside ?? center;
}
