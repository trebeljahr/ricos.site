import { isNumberInput, type Wire } from "./logic";
import { type DisplayNode, nodeHeight, nodeWidth } from "./nodeGeometry";

/** Reflow from authored positions so folding is reversible, including chained collisions. */
export function spaceExpandedNodes<T extends DisplayNode>(
  nodes: readonly T[],
  originals: readonly DisplayNode[],
  gap = 28,
  wires: readonly Wire[] = [],
  portPoint?: (node: T, index: number, kind: "input" | "output") => { x: number; y: number },
): T[] {
  const authored = new Map(originals.map((node) => [node.id, node]));
  const growing = new Set(
    nodes
      .filter((node) => {
        const original = authored.get(node.id)!;
        return nodeWidth(node) > nodeWidth(original) || nodeHeight(node) > nodeHeight(original);
      })
      .map((node) => node.id),
  );
  const offsets = new Map<string, { x: number; y: number }>();
  if (portPoint) {
    for (const host of nodes.filter((node) => growing.has(node.id))) {
      const original = authored.get(host.id)!;
      // Inline coordinates include a common origin offset; compare local ports.
      const folded = {
        ...host,
        ...original,
        x: host.x,
        y: host.y,
        displayWidth: original.displayWidth,
        displayHeight: original.displayHeight,
        expanded: false,
      } as T;
      for (const wire of wires) {
        const kind = wire.from === host.id ? "output" : wire.to === host.id ? "input" : undefined;
        if (!kind) continue;
        const index = kind === "output" ? (wire.output ?? 0) : wire.input;
        const before = portPoint(folded, index, kind);
        const after = portPoint(host, index, kind);
        const offset = { x: after.x - before.x, y: after.y - before.y };
        const queue = [kind === "output" ? wire.to : wire.from];
        for (let i = 0; i < queue.length; i++) {
          const id = queue[i];
          if (growing.has(id) || offsets.has(id)) continue;
          offsets.set(id, offset);
          for (const link of wires) {
            if (link.from === id) queue.push(link.to);
            else if (link.to === id) queue.push(link.from);
          }
        }
      }
    }
  }
  const shifted = nodes.map((node) => {
    const offset = offsets.get(node.id);
    return offset ? { ...node, x: node.x + offset.x, y: node.y + offset.y } : node;
  });
  const placed: T[] = [];
  for (const node of [...shifted].sort(
    (a, b) => Number(growing.has(b.id)) - Number(growing.has(a.id)) || a.y - b.y || a.x - b.x,
  )) {
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

const INPUT_GAP = 36;

/**
 * Keep a column of parts in order: everything below an unfolded part moves down, everything right of it moves right.
 * An input beside the column moves down only an input it would reach, so the column's rows stay evenly spaced.
 */
export function spaceColumnNodes<T extends DisplayNode>(
  nodes: readonly T[],
  originals: readonly DisplayNode[],
): T[] {
  const authored = new Map(originals.map((node) => [node.id, node]));
  const hosts = nodes.flatMap((node) => {
    const original = authored.get(node.id)!;
    const grownWidth = nodeWidth(node) - nodeWidth(original);
    const grownHeight = nodeHeight(node) - nodeHeight(original);
    return grownWidth > 0 || grownHeight > 0
      ? [
          {
            original,
            ownColumn: isNumberInput(node.type),
            grownBottom: node.y + nodeHeight(node),
            grownWidth,
            grownHeight,
            right: node.x + nodeWidth(original),
            bottom: node.y + nodeHeight(original),
          },
        ]
      : [];
  });
  return nodes.map((node) => {
    const pushes = (host: (typeof hosts)[number]) => host.original.id !== node.id;
    // Each column to the left adds the width of its widest unfolded part.
    const widest = new Map<number, number>();
    for (const host of hosts)
      if (pushes(host) && node.x >= host.right)
        widest.set(host.original.x, Math.max(widest.get(host.original.x) ?? 0, host.grownWidth));
    const dx = [...widest.values()].reduce((sum, width) => sum + Math.max(0, width), 0);
    const middle = node.y + nodeHeight(node) / 2;
    const dy = hosts
      .filter((host) => pushes(host) && node.x >= host.original.x && middle >= host.bottom)
      .reduce(
        (sum, host) =>
          sum +
          (!host.ownColumn
            ? host.grownHeight
            : node.x < host.right
              ? Math.max(0, host.grownBottom + INPUT_GAP - node.y)
              : 0),
        0,
      );
    return dx || dy ? { ...node, x: node.x + dx, y: node.y + dy } : node;
  });
}
