import { describe, expect, it } from "vitest";
import { inputCount, PRESETS } from "./logic";
import { routeCircuitWires, simpleWirePath, wirePath } from "./wireRouting";

describe("wire routing", () => {
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
