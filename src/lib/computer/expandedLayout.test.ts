import { describe, expect, it } from "vitest";
import { spaceExpandedNodes } from "./expandedLayout";
import type { Node } from "./logic";
import { nodeHeight, nodeWidth } from "./nodeGeometry";

describe("expanded layout", () => {
  it("keeps connected nodes offset from their ports even when a lamp is above the box", () => {
    const nodes: Node[] = [
      { id: "box", type: "and", x: 400, y: 100 },
      { id: "lamp", type: "lamp", x: 700, y: 70 },
      { id: "switch", type: "switch", x: 100, y: 80 },
      { id: "next", type: "lamp", x: 900, y: 70 },
    ];
    const wires = [
      { id: "out", from: "box", to: "lamp", input: 0 },
      { id: "in", from: "switch", to: "box", input: 0 },
      { id: "chain", from: "lamp", to: "next", input: 0 },
    ];
    const ports = (node: Node & { displayWidth?: number; displayHeight?: number }, _index: number, kind: "input" | "output") => ({
      x: node.x + (kind === "output" ? nodeWidth(node) : 0),
      y: node.y + nodeHeight(node) / 2,
    });
    const expanded = nodes.map((node) => ({ ...node,
      displayWidth: node.id === "box" ? 1000 : undefined,
      displayHeight: node.id === "box" ? 600 : undefined,
    }));
    const placed = spaceExpandedNodes(expanded, nodes, 28, wires, ports);
    const box = placed[0];
    for (const [index, kind] of [[1, "output"], [2, "input"]] as const) {
      const before = ports(nodes[0], 0, kind);
      const after = ports(box, 0, kind);
      expect(placed[index].x - after.x).toBe(nodes[index].x - before.x);
      expect(placed[index].y - after.y).toBe(nodes[index].y - before.y);
    }
    expect(placed[3].x - placed[1].x).toBe(nodes[3].x - nodes[1].x);
    expect(spaceExpandedNodes(nodes, nodes, 28, wires, ports)).toEqual(nodes);
  });
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
