import { describe, expect, it } from "vitest";
import type { Circuit } from "./logic";
import { wireNetKeys } from "./wireTopology";

describe("electrical wire identity", () => {
  it("joins fan-out and chained splice wires without joining different output pins", () => {
    const circuit: Circuit = {
      name: "Fan out",
      nodes: [
        { id: "source", type: "input8", x: 0, y: 0 },
        { id: "first", type: "junction", x: 0, y: 0 },
        { id: "second", type: "junction", x: 0, y: 0 },
        { id: "gate", type: "not", x: 0, y: 0 },
      ],
      wires: [
        { id: "a", from: "source", output: 0, to: "first", input: 0 },
        { id: "b", from: "first", to: "second", input: 0 },
        { id: "c", from: "second", to: "gate", input: 0 },
        { id: "d", from: "source", output: 0, to: "gate", input: 0 },
        { id: "e", from: "source", output: 1, to: "gate", input: 0 },
        { id: "f", from: "gate", to: "second", input: 1 },
      ],
    };
    const nets = wireNetKeys(circuit);
    expect(nets.a).toBe(nets.b);
    expect(nets.a).toBe(nets.c);
    expect(nets.a).toBe(nets.d);
    expect(nets.a).toBe(nets.f);
    expect(nets.a).not.toBe(nets.e);
    expect(wireNetKeys({ ...circuit, wires: [...circuit.wires].reverse() })).toEqual(nets);
  });
});
