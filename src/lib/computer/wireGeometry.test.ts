import { describe, expect, it } from "vitest";
import {
  bridgeWirePaths,
  closestPathPoint,
  explicitWirePath,
  fanOutBranchPath,
  pathPoints,
} from "./wireGeometry";

describe("wire drawing and hit geometry", () => {
  it.each([
    [
      { x: 0, y: 0 },
      { x: 0, y: 40 },
      { x: 100, y: 40 },
      { x: 100, y: 80 },
    ],
    [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 100 },
      { x: 80, y: 100 },
    ],
    [
      { x: 0, y: 0 },
      { x: 0, y: 40 },
      { x: 0, y: 80 },
    ],
    [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 80, y: 0 },
    ],
  ])("keeps authored right-angle routes connected when pins move independently: %j", (...points) => {
    const saved = structuredClone(points);
    const start = { x: 20, y: 10 },
      end = { x: 300, y: 200 };
    const route = pathPoints(explicitWirePath(points, start, end))[0];
    expect(route[0]).toEqual(start);
    expect(route.at(-1)).toEqual(end);
    for (let index = 1; index < route.length; index++)
      expect(route[index].x === route[index - 1].x || route[index].y === route[index - 1].y).toBe(
        true,
      );
    expect(points).toEqual(saved);
  });

  it("adds one arch for a crossing and keeps its hit shape identical", () => {
    const paths = bridgeWirePaths([
      { id: "horizontal", path: "M 0 50 L 100 50" },
      { id: "vertical", path: "M 50 0 L 50 100" },
    ]);
    expect(paths.horizontal).toBe("M 0 50 L 100 50");
    expect(paths.vertical.match(/ Q /g)).toHaveLength(1);
    const hit = closestPathPoint(paths.vertical, { x: 44, y: 50 });
    expect(hit.distance).toBeLessThan(1);
    expect(closestPathPoint(paths.vertical, { x: 50, y: 50 }).distance).toBeGreaterThan(4);
  });
  it("never arches at shared endpoints, and deduplicates multiple wires at one crossing", () => {
    const paths = bridgeWirePaths([
      { id: "a", path: "M 0 50 L 100 50" },
      { id: "b", path: "M 0 50 L 0 100" },
    ]);
    expect(paths.b).not.toContain("Q");
    const many = bridgeWirePaths([
      { id: "a", path: "M 0 50 L 100 50" },
      { id: "b", path: "M 0 50 L 100 50" },
      { id: "c", path: "M 50 0 L 50 100" },
    ]);
    expect(many.c.match(/ Q /g)).toHaveLength(1);
  });
  it("follows vertical fan-out trunks through rendered arches", () => {
    const route = fanOutBranchPath(
      "M 0 0 L 50 0 M 50 -50 L 50 44 Q 38 50 50 56 L 50 100",
      { x: 50, y: 100 },
      "M 50 100 L 200 100",
    );
    expect(closestPathPoint(route, { x: 44, y: 50 }).distance).toBeLessThan(1);
    expect(pathPoints(route)[0][0]).toEqual({ x: 0, y: 0 });
    expect(pathPoints(route)[0].at(-1)).toEqual({ x: 200, y: 100 });
    const upward = fanOutBranchPath(
      "M 0 0 L 50 0 M 50 -100 L 50 100",
      { x: 50, y: -100 },
      "M 50 -100 L 200 -100",
    );
    expect(pathPoints(upward)[0]).toContainEqual({ x: 50, y: -100 });
    expect(pathPoints(upward)[0]).not.toContainEqual({ x: 50, y: 100 });
  });
  it("joins contiguous SVG subpaths emitted for rotated ports", () => {
    const parts = pathPoints("M 0 0 L 0 24 M 0 24 L 100 24 L 100 50");
    expect(parts).toHaveLength(1);
    const hit = closestPathPoint("M 0 0 L 0 24 M 0 24 L 100 24 L 100 50", { x: 40, y: 24 });
    expect(hit.points[0]).toEqual({ x: 0, y: 0 });
    expect(hit.points.at(-1)).toEqual({ x: 100, y: 50 });
  });
  it("samples curves accurately and moves saved routes with both endpoints", () => {
    const path = "M 0 0 C 50 0 50 100 100 100";
    expect(closestPathPoint(path, { x: 50, y: 50 }).distance).toBeLessThan(0.1);
    expect(pathPoints(path)[0].at(-1)).toEqual({ x: 100, y: 100 });
    expect(
      explicitWirePath(
        [
          { x: 0, y: 0 },
          { x: 50, y: 20 },
          { x: 100, y: 0 },
        ],
        { x: 24, y: 24 },
        { x: 124, y: 24 },
      ),
    ).toBe("M 24 24 L 74 44 L 124 24");
  });
});
