import { describe, expect, it } from "vitest";
import { inputCount, PRESETS } from "./logic";
import { routeCircuitWires, simpleWirePath, wirePath } from "./wireRouting";

// Recover the orthogonal skeleton, including the unrounded corner of each Q.
function routeGeometry(path: string) {
  const points = [...path.matchAll(/[MLQ] ([^MLQ]+)/g)].flatMap((match) => {
    const numbers = match[1].trim().split(/\s+/).map(Number);
    return Array.from({ length: numbers.length / 2 }, (_, i) => ({
      x: numbers[i * 2],
      y: numbers[i * 2 + 1],
    }));
  });
  return points.slice(1).map((b, index) => ({ a: points[index], b }));
}

function routeLength(path: string) {
  return routeGeometry(path).reduce((sum, { a, b }) => sum + Math.hypot(b.x - a.x, b.y - a.y), 0);
}

function routeClearance(first: string, second: string) {
  const intervalGap = (a: number, b: number, c: number, d: number) =>
    Math.max(0, Math.min(a, b) - Math.max(c, d), Math.min(c, d) - Math.max(a, b));
  let clearance = Infinity;
  for (const { a, b } of routeGeometry(first)) {
    for (const { a: c, b: d } of routeGeometry(second)) {
      clearance = Math.min(
        clearance,
        Math.hypot(intervalGap(a.x, b.x, c.x, d.x), intervalGap(a.y, b.y, c.y, d.y)),
      );
    }
  }
  return clearance;
}

describe("wire routing", () => {
  it.each([
    { offset: -136, gap: 308, pitch: 52, count: 8 },
    { offset: 136, gap: 308, pitch: 52, count: 8 },
    { offset: -100, gap: 132, pitch: 12, count: 8 },
    { offset: 100, gap: 132, pitch: 12, count: 8 },
    { offset: -400, gap: 400, pitch: 20, count: 24 },
    { offset: 400, gap: 400, pitch: 20, count: 24 },
  ])("keeps a $count-wire stack short and separated ($offset offset, $gap gap)", ({
    offset,
    gap,
    pitch,
    count,
  }) => {
    const wires = Array.from({ length: count }, (_, index) => ({
      id: String(index),
      from: "input",
      to: "display",
      output: index,
      start: { x: 522, y: 394 + index * pitch },
      end: { x: 522 + gap, y: 394 + index * pitch + offset },
    }));
    for (const withBuses of [false, true]) {
      const { paths } = routeCircuitWires(wires, [], withBuses);
      for (const wire of wires) {
        expect(routeLength(paths[wire.id])).toBeCloseTo(gap + Math.abs(offset));
        for (const other of wires) {
          if (other.id !== wire.id)
            expect(routeClearance(paths[wire.id], paths[other.id])).toBeGreaterThanOrEqual(
              12 - 1e-8,
            );
        }
      }
      expect(routeCircuitWires([...wires].reverse(), [], withBuses).paths).toEqual(paths);
      const shuffled = [...wires.filter((_, i) => i % 2), ...wires.filter((_, i) => !(i % 2))];
      expect(routeCircuitWires(shuffled, [], withBuses).paths).toEqual(paths);
    }
  });

  it("draws a simple curve by default, including backward connections", () => {
    expect(simpleWirePath({ x: 0, y: 20 }, { x: 200, y: 160 })).toBe(
      "M 0 20 C 100 20 100 160 200 160",
    );
    expect(simpleWirePath({ x: 200, y: 20 }, { x: 0, y: 160 })).toMatch(/^M 200 20 L /);
    expect(simpleWirePath({ x: 100, y: 20 }, { x: 120, y: 80 })).toBe(
      "M 100 20 C 110 20 110 80 120 80",
    );
  });
  it("uses a clear lane around a part between connectors", () => {
    const path = wirePath({ x: 0, y: 20 }, { x: 200, y: 160 }, [
      { x: 80, y: 45, width: 50, height: 75 },
    ]);
    const lane = Number(path.match(/Q ([\d.]+) 20/)?.[1]);
    expect(lane).toBeGreaterThan(0);
    expect(lane <= 72 || lane >= 138).toBe(true);
    expect(path).toMatch(/L 200 160$/);
  });
  it("loops backward connections around the parts", () => {
    const path = wirePath({ x: 300, y: 120 }, { x: 100, y: 180 });
    expect(path).toMatch(/^M 300 120/);
    expect(path).toMatch(/L 100 180$/);
    expect(path.match(/ Q /g)?.length).toBeGreaterThanOrEqual(3);
  });
  it("routes a short forward wire without reversing direction", () => {
    const path = wirePath({ x: 100, y: 20 }, { x: 140, y: 80 });
    const xCoordinates = [...path.matchAll(/(?:M|L|Q) (-?\d+(?:\.\d+)?)/g)].map((match) =>
      Number(match[1]),
    );
    expect(xCoordinates.every((x) => x >= 100 && x <= 140)).toBe(true);
  });
  it("keeps a feedback lane outside both endpoint bodies", () => {
    const { paths } = routeCircuitWires([
      { id: "feedback", from: "q", to: "next", output: 0,
        start: { x: 532, y: 158 }, end: { x: 160, y: 158 } },
    ], [
      { id: "q", x: 400, y: 100, width: 132, height: 116 },
      { id: "next", x: 160, y: 100, width: 132, height: 116 },
    ]);
    // Previously the return lane ran at y=130, straight through both bodies.
    const points = [...paths.feedback.matchAll(/(?:M|L|Q) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)]
      .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));
    expect(points.some((point) => point.y <= 72 || point.y >= 244)).toBe(true);
    expect(points.every((point) => !(point.x > 160 && point.x < 532 && point.y > 100 && point.y < 216))).toBe(true);
  });
  it("separates parallel wires onto adjacent lanes", () => {
    const wires = ["a", "b"].map((id) => ({
      id,
      from: id,
      to: `target-${id}`,
      output: 0,
      start: { x: 0, y: 100 },
      end: { x: 200, y: 100 },
    }));
    const routes = routeCircuitWires(wires, []);
    expect(routes.paths.a).not.toBe(routes.paths.b);
    expect(routes.paths.b).toContain("Q");
  });
  it("groups fan-out connections into a bus with separate input branches", () => {
    const wires = [100, 160].map((y, index) => ({
      id: String(index),
      from: "source",
      to: `target-${index}`,
      output: 0,
      start: { x: 0, y: 120 },
      end: { x: 200, y },
    }));
    const routes = routeCircuitWires(wires, [], true);
    expect(routes.buses).toHaveLength(1);
    expect(routes.buses[0].taps).toHaveLength(2);
    expect(routes.paths["0"]).toMatch(/L 200 100$/);
    expect(routes.paths["1"]).toMatch(/L 200 160$/);
  });
  it("uses one trunk for all clock connections in the shift register", () => {
    const circuit = PRESETS["8-bit shift register"];
    const clock = circuit.nodes.find((node) => node.id === "clock")!;
    const routes = routeCircuitWires(
      circuit.wires.map((wire) => {
        const source = circuit.nodes.find((node) => node.id === wire.from)!;
        const target = circuit.nodes.find((node) => node.id === wire.to)!;
        return {
          id: wire.id,
          from: wire.from,
          to: wire.to,
          output: 0,
          start: { x: source.x + 132, y: source.y + 39 },
          end: {
            x: target.x,
            y: target.y + (inputCount(target) === 1 ? 39 : wire.input === 0 ? 16 : 62),
          },
        };
      }),
      circuit.nodes.map((node) => ({ id: node.id, x: node.x, y: node.y, width: 132, height: 78 })),
      true,
    );
    expect(routes.buses).toHaveLength(1);
    expect(routes.buses[0].taps).toHaveLength(8);
    expect(routes.buses[0].from).toBe(clock.id);
    expect(routes.buses[0].crossings.length).toBeGreaterThan(0);
    expect(Object.keys(routes.paths)).toHaveLength(circuit.wires.length);
  });
});
