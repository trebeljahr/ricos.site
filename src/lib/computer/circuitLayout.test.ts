import { describe, expect, it } from "vitest";
import { layoutCircuit } from "./circuitLayout";
import { storageCircuit } from "./circuitHierarchy";
import { BLUEPRINTS, type Circuit, moduleInputs, moduleOutputs, PRESETS } from "./logic";
import { nodeHeight, nodeWidth } from "./nodeGeometry";

const examples = [
  ...Object.values(PRESETS),
  ...Object.values(BLUEPRINTS),
  ...(["dff", "srlatch", "dlatch"] as const).map(storageCircuit),
];

function checkLayout(source: Circuit) {
  const diagram = layoutCircuit(source);
  expect(diagram.wires).toEqual(source.wires);
  expect(moduleInputs(diagram).map((node) => node.id)).toEqual(
    moduleInputs(source).map((node) => node.id),
  );
  expect(moduleOutputs(diagram).map((node) => node.id)).toEqual(
    moduleOutputs(source).map((node) => node.id),
  );
  for (const [index, a] of diagram.nodes.entries()) {
    for (const b of diagram.nodes.slice(index + 1)) {
      const separated =
        a.x + nodeWidth(a) + 40 <= b.x ||
        b.x + nodeWidth(b) + 40 <= a.x ||
        a.y + nodeHeight(a) + 40 <= b.y ||
        b.y + nodeHeight(b) + 40 <= a.y;
      expect(separated, `${source.name}: ${a.id} overlaps ${b.id}`).toBe(true);
    }
    if (source.nodes[index].module) checkLayout(source.nodes[index].module!);
  }
}

describe("built-in component layouts", () => {
  it.each(
    examples.map((circuit) => [circuit.name, circuit] as const),
  )("%s has clear component gutters at every detail level", (_name, source) => {
    const before = JSON.stringify(source);
    checkLayout(source);
    expect(JSON.stringify(source)).toBe(before);
  });
  it.each([
    "8-bit full adder",
    "8-bit ALU",
    "8-bit shift register",
    "8-bit binary counter",
  ])("%s places sequential bits from left to right", (name) => {
    const circuit = layoutCircuit(PRESETS[name]);
    const bits = Array.from(
      { length: 8 },
      (_, bit) => circuit.nodes.find((node) => node.id === `bit${bit}`)!,
    );
    expect(new Set(bits.map((node) => node.y)).size).toBe(1);
    for (let bit = 1; bit < bits.length; bit++)
      expect(bits[bit].x).toBeGreaterThan(bits[bit - 1].x + nodeWidth(bits[bit - 1]));
  });
  it("gives master and slave feedback pairs their own stages", () => {
    const circuit = layoutCircuit(storageCircuit("dff"));
    const get = (id: string) => circuit.nodes.find((node) => node.id === id)!;
    expect(get("master-q").x).toBeLessThan(get("slave-set").x);
    expect(get("slave-set").x).toBeLessThan(get("q").x);
    expect(get("master-q").y).toBeLessThan(get("master-qbar").y);
  });
});
