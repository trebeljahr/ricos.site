import { describe, expect, it } from "vitest";
import { spaceColumnNodes, spaceExpandedNodes } from "./expandedLayout";
import type { Node } from "./logic";
import { type DisplayNode, nodeHeight, nodeWidth } from "./nodeGeometry";

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
    const ports = (
      node: Node & { displayWidth?: number; displayHeight?: number },
      _index: number,
      kind: "input" | "output",
    ) => ({
      x: node.x + (kind === "output" ? nodeWidth(node) : 0),
      y: node.y + nodeHeight(node) / 2,
    });
    const expanded = nodes.map((node) => ({
      ...node,
      displayWidth: node.id === "box" ? 1000 : undefined,
      displayHeight: node.id === "box" ? 600 : undefined,
    }));
    const placed = spaceExpandedNodes(expanded, nodes, 28, wires, ports);
    const box = placed[0];
    for (const [index, kind] of [
      [1, "output"],
      [2, "input"],
    ] as const) {
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

describe("a column of parts", () => {
  const part = (id: string, x: number, y: number): DisplayNode => ({ id, type: "and", x, y });
  const column = [
    part("input", 0, 500),
    part("top", 200, 0),
    part("host", 200, 200),
    part("next", 200, 400),
    part("lamp", 500, 200),
    part("low", 500, 400),
  ];

  it("pushes what is below down and what is right of it right, and leaves the rest", () => {
    const grown = column.map((node) =>
      node.id === "host" ? { ...node, displayWidth: 632, displayHeight: 416 } : node,
    );
    const spaced = new Map(spaceColumnNodes(grown, column).map((node) => [node.id, node]));
    expect(spaced.get("input")).toMatchObject({ x: 0, y: 500 });
    expect(spaced.get("top")).toMatchObject({ x: 200, y: 0 });
    expect(spaced.get("host")).toMatchObject({ x: 200, y: 200 });
    expect(spaced.get("next")).toMatchObject({ x: 200, y: 700 });
    expect(spaced.get("lamp")).toMatchObject({ x: 1000, y: 200 });
    expect(spaced.get("low")).toMatchObject({ x: 1000, y: 700 });
  });

  describe("with number inputs beside it", () => {
    const parts: DisplayNode[] = [
      { id: "a", type: "input4", x: 0, y: 0 },
      { id: "b", type: "input4", x: 0, y: 600 },
      part("top", 300, 0),
      part("next", 300, 300),
      part("lamp", 600, 0),
    ];
    const place = (grow: Record<string, Partial<DisplayNode>>) =>
      new Map(
        spaceColumnNodes(
          parts.map((node) => ({ ...node, ...grow[node.id] })),
          parts,
        ).map((node) => [node.id, node]),
      );

    it("keeps the column's rows where they are when an input grows taller", () => {
      const spaced = place({ a: { displayWidth: 200, displayHeight: 400 } });
      expect(spaced.get("top")?.y).toBe(0);
      expect(spaced.get("next")?.y).toBe(300);
      expect(spaced.get("b")?.y).toBe(600);
    });

    it("moves the input below only as far as it must", () => {
      expect(place({ a: { displayWidth: 200, displayHeight: 700 } }).get("b")?.y).toBe(736);
    });

    it("adds the growth of each column to what is right of them", () => {
      const spaced = place({
        a: { displayWidth: 256, displayHeight: 200 },
        top: { displayWidth: 232, displayHeight: 116 },
      });
      expect(spaced.get("top")?.x).toBe(400);
      expect(spaced.get("lamp")?.x).toBe(800);
    });
  });
});
