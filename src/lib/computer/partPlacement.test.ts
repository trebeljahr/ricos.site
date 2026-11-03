import { describe, expect, it } from "vitest";
import type { DisplayNode } from "./nodeGeometry";
import { nodeHeight, nodeWidth } from "./nodeGeometry";
import { openSpot } from "./partPlacement";

const part = (id: string, x: number, y: number): DisplayNode => ({ id, type: "nand", x, y });
const size = { width: 300, height: 180 };
const wide = { left: -1000, top: -1000, right: 3000, bottom: 3000 };
const clearOf = (spot: { x: number; y: number }, nodes: DisplayNode[]) =>
  nodes.every(
    (node) =>
      spot.x + size.width / 2 <= node.x ||
      spot.x - size.width / 2 >= node.x + nodeWidth(node) ||
      spot.y + size.height / 2 <= node.y ||
      spot.y - size.height / 2 >= node.y + nodeHeight(node),
  );

describe("finding room for a new part", () => {
  it("uses the centre when it is free", () => {
    expect(openSpot({ x: 500, y: 500 }, size, [], wide)).toEqual({ x: 500, y: 500 });
  });

  it("counts the new part's real size, not a small part's", () => {
    const nodes = [part("beside", 620, 460)];
    const spot = openSpot({ x: 500, y: 500 }, size, nodes, wide);
    expect(spot).not.toEqual({ x: 500, y: 500 });
    expect(clearOf(spot, nodes)).toBe(true);
  });

  it("leaves a gap, so a neighbour's dots stay reachable", () => {
    const touching = part("next", 500 + size.width / 2 + 10, 460);
    expect(openSpot({ x: 500, y: 500 }, size, [touching], wide)).not.toEqual({ x: 500, y: 500 });
  });

  it("finds room on a crowded board, however many parts it holds", () => {
    const nodes = Array.from({ length: 64 }, (_, index) =>
      part(`p${index}`, (index % 8) * 150, Math.floor(index / 8) * 130),
    );
    expect(clearOf(openSpot({ x: 500, y: 450 }, size, nodes, wide), nodes)).toBe(true);
  });

  it("prefers a spot in view over a nearer one out of view", () => {
    const view = { left: 0, top: 0, right: 700, bottom: 700 };
    const nodes = [part("middle", 280, 280), part("right", 420, 280), part("low", 280, 400)];
    const spot = openSpot({ x: 350, y: 350 }, size, nodes, view);
    expect(spot.x - size.width / 2).toBeGreaterThanOrEqual(view.left);
    expect(spot.x + size.width / 2).toBeLessThanOrEqual(view.right);
    expect(spot.y - size.height / 2).toBeGreaterThanOrEqual(view.top);
    expect(spot.y + size.height / 2).toBeLessThanOrEqual(view.bottom);
    expect(clearOf(spot, nodes)).toBe(true);
  });

  it("goes outside the view when the view has no room", () => {
    const view = { left: 0, top: 0, right: 400, bottom: 400 };
    const nodes = [part("filler", 60, 60), part("filler2", 240, 240)];
    const spot = openSpot({ x: 200, y: 200 }, size, nodes, view);
    expect(clearOf(spot, nodes)).toBe(true);
  });

  it("copes with a part bigger than the view", () => {
    const view = { left: 0, top: 0, right: 200, bottom: 200 };
    const spot = openSpot({ x: 100, y: 100 }, size, [part("a", 0, 0)], view);
    expect(clearOf(spot, [part("a", 0, 0)])).toBe(true);
  });
});
