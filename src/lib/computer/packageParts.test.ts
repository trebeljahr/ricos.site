import { describe, expect, it } from "vitest";
import { type Circuit, initialSnapshot, moduleInputs, moduleOutputs, step } from "./logic";
import { packageParts } from "./packageParts";

const circuit: Circuit = {
  name: "and then not",
  nodes: [
    { id: "a", type: "switch", x: 0, y: 0 },
    { id: "b", type: "switch", x: 0, y: 100 },
    { id: "and", type: "and", x: 200, y: 0 },
    { id: "not", type: "not", x: 400, y: 0 },
    { id: "lamp", type: "lamp", x: 600, y: 0 },
  ],
  wires: [
    { id: "1", from: "a", to: "and", input: 0 },
    { id: "2", from: "b", to: "and", input: 1 },
    { id: "3", from: "and", to: "not", input: 0 },
    { id: "4", from: "not", to: "lamp", input: 0 },
  ],
};
const fold = () =>
  packageParts(circuit, new Set(["and", "not"]), { id: "p", x: 1, y: 2, label: "P" });

describe("packageParts", () => {
  it("turns each crossing signal into a port", () => {
    const module = fold().nodes.find((node) => node.id === "p")?.module as Circuit;
    expect(moduleInputs(module)).toHaveLength(2);
    expect(moduleOutputs(module)).toHaveLength(1);
    expect(fold().wires.map((wire) => [wire.from, wire.to, wire.input])).toEqual([
      ["a", "p", 0],
      ["b", "p", 1],
      ["p", "lamp", 0],
    ]);
  });

  it("gives one port to a signal that crosses more than once", () => {
    const fan: Circuit = {
      ...circuit,
      wires: [...circuit.wires, { id: "5", from: "a", to: "not", input: 0 }],
    };
    const packaged = packageParts(fan, new Set(["and", "not"]), {
      id: "p",
      x: 0,
      y: 0,
      label: "P",
    });
    expect(packaged.wires.filter((wire) => wire.to === "p")).toHaveLength(2);
  });

  it("simulates the same", () => {
    for (const [a, b] of [
      [false, false],
      [true, false],
      [true, true],
    ]) {
      const inputs = { a, b };
      const set = (c: Circuit): Circuit => ({
        ...c,
        nodes: c.nodes.map((node) =>
          node.id in inputs ? { ...node, value: inputs[node.id as "a" | "b"] } : node,
        ),
      });
      const flat = step(set(circuit), initialSnapshot(), false);
      const folded = step(set(fold()), initialSnapshot(), false);
      expect(folded.values.lamp).toBe(flat.values.lamp);
    }
  });
});
