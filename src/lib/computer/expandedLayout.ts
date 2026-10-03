import type { Node } from "./logic";
import { type DisplayNode, nodeHeight, nodeWidth } from "./nodeGeometry";

/** Reflow from authored positions so folding is reversible, including chained collisions. */
export function spaceExpandedNodes<T extends DisplayNode>(
  nodes: readonly T[],
  originals: readonly Node[],
  gap = 28,
): T[] {
  const authored = new Map(originals.map((node) => [node.id, node]));
  const placed: T[] = [];
  for (const node of [...nodes].sort((a, b) => a.y - b.y || a.x - b.x)) {
    let { x, y } = node;
    while (true) {
      const collision = placed.find(
        (other) =>
          x < other.x + nodeWidth(other) + gap &&
          x + nodeWidth(node) + gap > other.x &&
          y < other.y + nodeHeight(other) + gap &&
          y + nodeHeight(node) + gap > other.y,
      );
      if (!collision) break;
      const original = authored.get(collision.id)!;
      if (authored.get(node.id)!.x >= original.x + nodeWidth(original))
        x = collision.x + nodeWidth(collision) + gap;
      else y = collision.y + nodeHeight(collision) + gap;
    }
    placed.push({ ...node, x, y });
  }
  const positions = new Map(placed.map((node) => [node.id, node]));
  return nodes.map((node) => positions.get(node.id)!);
}
