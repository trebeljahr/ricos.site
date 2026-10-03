import { describe, expect, it } from "vitest";
import { spaceExpandedNodes } from "./expandedLayout";
import type { Node } from "./logic";
import { nodeHeight, nodeWidth } from "./nodeGeometry";

describe("expanded layout", () => {
  it("resolves chained collisions without changing stored positions or interface order", () => {
    const nodes: Node[] = [
      { id: "output", type: "lamp", x: 600, y: 0 },
      { id: "first", type: "and", x: 0, y: 0 },
      { id: "second", type: "or", x: 300, y: 0 },
      { id: "below", type: "not", x: 0, y: 250 },
    ];
    const original = structuredClone(nodes);
    const expanded = nodes.map((node) => ({
      ...node,
      displayWidth: node.id === "first" ? 900 : nodeWidth(node),
      displayHeight: node.id === "first" ? 700 : nodeHeight(node),
    }));
    const placed = spaceExpandedNodes(expanded, nodes);
    expect(placed.map((node) => node.id)).toEqual(nodes.map((node) => node.id));
    for (const [index, a] of placed.entries()) {
      for (const b of placed.slice(index + 1)) {
        expect(
          a.x + nodeWidth(a) <= b.x ||
            b.x + nodeWidth(b) <= a.x ||
            a.y + nodeHeight(a) <= b.y ||
            b.y + nodeHeight(b) <= a.y,
        ).toBe(true);
      }
    }
    expect(spaceExpandedNodes(nodes, nodes)).toEqual(original);
    expect(nodes).toEqual(original);
  });
});
