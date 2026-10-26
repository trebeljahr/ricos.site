import { describe, expect, it } from "vitest";
import {
  bridgeWirePaths,
  closestPathPoint,
  explicitWirePath,
  fanOutBranchPath,
  pathPoints,
  wireJunctions,
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
  it("draws connected branches as square T junctions, never as self-crossing arches", () => {
    const wires = [
      { id: "trunk", net: "signal", path: "M 0 50 L 100 50" },
      { id: "branch", net: "signal", path: "M 0 50 L 40 50 Q 50 50 50 60 L 50 100" },
    ];
    const paths = bridgeWirePaths(wires);
    expect(paths.branch).not.toContain("Q");
    expect(wireJunctions(wires.map((wire) => ({ ...wire, path: paths[wire.id] })))).toEqual([
      { x: 50, y: 50, wire: "trunk" },
    ]);
    // The same geometry with unrelated drivers must not acquire a junction dot.
    expect(wireJunctions(wires.map((wire) => ({ ...wire, net: wire.id })))).toEqual([]);
  });
  it("marks an interior crossing as a junction only when both paths share a net", () => {
    const wires = [
      { id: "horizontal", net: "same", path: "M 0 50 L 100 50" },
      { id: "vertical", net: "same", path: "M 50 0 L 50 100" },
    ];
    expect(bridgeWirePaths(wires).vertical).not.toContain("Q");
    expect(wireJunctions(wires)).toEqual([{ x: 50, y: 50, wire: "horizontal" }]);
  });
  it("does not insert arches into rounded corners or retrace a short segment", () => {
    const wires = [
      { id: "cross", path: "M 93 0 L 93 100" },
      { id: "bend", path: "M 0 50 L 90 50 Q 100 50 100 60 L 100 100" },
    ];
    const paths = bridgeWirePaths(wires);
    // Keep the original bend command intact even when the other wire needs a bridge.
    expect(paths.bend).toContain("Q 100 50 100 60");
    const points = pathPoints(paths.bend)[0];
    for (let i = 1; i < points.length; i++) {
      expect(points[i].x).toBeGreaterThanOrEqual(points[i - 1].x);
      expect(points[i].y).toBeGreaterThanOrEqual(points[i - 1].y);
    }
  });
  it("keeps curved wire commands intact when adding a bridge on a straight section", () => {
    const paths = bridgeWirePaths([
      { id: "curve", path: "M 0 0 C 10 0 20 10 30 10 L 100 10" },
      { id: "cross", path: "M 60 -50 L 60 50" },
    ]);
    expect(paths.curve).toContain("C 10 0 20 10 30 10");
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
