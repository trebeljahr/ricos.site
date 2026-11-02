import { describe, expect, it } from "vitest";
import { compactStart, enforceStart, type LevelStart } from "./kit";

const startOf = (lampX: number, extra: LevelStart["circuit"]["nodes"] = []): LevelStart => {
  const circuit = {
    name: "Level",
    nodes: [
      { id: "a", type: "switch" as const, label: "A", x: 40, y: 40 },
      { id: "b", type: "switch" as const, label: "B", x: 40, y: 190 },
      ...extra,
      { id: "out", type: "lamp" as const, label: "OUT", x: lampX, y: 40 },
    ],
    wires: [],
  };
  const locked = circuit.nodes.map((node) => node.id);
  return { circuit, locked, enforce: (next) => enforceStart(next, circuit, locked) };
};
const x = (start: LevelStart, id: string) => start.circuit.nodes.find((n) => n.id === id)?.x;

describe("compactStart", () => {
  it("pulls the lamps in and leaves the rest where they are", () => {
    const start = compactStart(startOf(732));
    expect(x(start, "a")).toBe(40);
    expect(x(start, "b")).toBe(40);
    expect(x(start, "out")).toBe(422);
  });

  it("keeps the lock rule satisfied, since locked parts may move", () => {
    const start = compactStart(startOf(732));
    expect(start.enforce(start.circuit)).toBe(start.circuit);
  });

  it("never moves a lamp onto the parts it starts beside", () => {
    const tight = startOf(300);
    expect(compactStart(tight)).toBe(tight);
    const railed = compactStart(
      startOf(900, [{ id: "vdd", type: "high", label: "VDD", x: 500, y: 40 }]),
    );
    expect(x(railed, "out")).toBeGreaterThan(500);
  });

  it("returns a start without lamps as it is", () => {
    const start = startOf(732);
    const custom = {
      ...start,
      circuit: {
        ...start.circuit,
        nodes: start.circuit.nodes.filter((node) => node.type !== "lamp"),
      },
    };
    expect(compactStart(custom)).toBe(custom);
  });
});
