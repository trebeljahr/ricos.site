import { describe, expect, it } from "vitest";
import { type Node, PRESETS, type Wire } from "./logic";
import { planPortConnections, wiringPorts } from "./portWiring";

const nodes: Node[] = [
  { id: "source", type: "input8", x: 0, y: 0 },
  { id: "target", type: "display8", x: 400, y: 0 },
  { id: "clock", type: "clock", x: 0, y: 400 },
];
const ports = wiringPorts(nodes, (node, index) => ({ x: node.x, y: node.y + index * 25 }));
const outputs = ports.filter((port) => port.nodeId === "source");
const inputs = ports.filter((port) => port.nodeId === "target");

describe("port connection planning", () => {
  it("orders a sparse selection logically and slides it into the last fitting range", () => {
    const plan = planPortConnections([outputs[6], outputs[0], outputs[2]], inputs[7], ports, []);
    expect(plan.error).toBeUndefined();
    expect(plan.connections.map((wire) => [wire.output, wire.input])).toEqual([
      [0, 5],
      [2, 6],
      [6, 7],
    ]);
    const rotated = ports.map((port) => ({ ...port, x: 500 - port.y, y: port.x }));
    expect(
      planPortConnections([outputs[6], outputs[0], outputs[2]], inputs[7], rotated, []).connections,
    ).toEqual(plan.connections);
  });
  it("keeps ALU operand banks separate from each other and control pins", () => {
    const alu: Node = { id: "alu", type: "module", module: PRESETS["8-bit ALU"], x: 0, y: 0 };
    const all = [...ports, ...wiringPorts([alu], () => ({ x: 0, y: 0 }))];
    const a7 = all.find((port) => port.label.endsWith(" A7"))!;
    expect(planPortConnections(outputs, a7, all, []).connections.map((wire) => wire.input)).toEqual(
      [0, 1, 2, 3, 4, 5, 6, 7],
    );
    const carry = all.find((port) => port.kind === "input" && port.label.endsWith(" CARRY IN"))!;
    expect(planPortConnections(outputs, carry, all, []).error).toContain("this bank has 1");
  });
  it("fans one output to selected inputs on different parts", () => {
    const lamps: Node[] = [0, 1, 2].map((i) => ({
      id: `lamp${i}`,
      type: "lamp",
      x: 500,
      y: i * 100,
    }));
    const destinations = wiringPorts(lamps, (node) => node);
    const clock = ports.find((port) => port.nodeId === "clock")!;
    const plan = planPortConnections(
      destinations.toReversed(),
      clock,
      [...ports, ...destinations],
      [],
    );
    expect(plan.connections).toEqual(
      lamps.map((node) => ({ from: "clock", output: 0, to: node.id, input: 0 })),
    );
  });
  it("connects unnumbered custom ports in order instead of treating each as a fan-out source", () => {
    const custom: Node = {
      id: "custom",
      type: "module",
      x: 0,
      y: 0,
      module: {
        name: "Adder",
        wires: [],
        nodes: [
          { id: "a", type: "switch", label: "A", x: 0, y: 0 },
          { id: "b", type: "switch", label: "B", x: 0, y: 100 },
          { id: "sum", type: "lamp", label: "SUM", x: 300, y: 0 },
          { id: "carry", type: "lamp", label: "CARRY", x: 300, y: 100 },
        ],
      },
    };
    const customPorts = wiringPorts([custom], () => ({ x: 0, y: 0 }));
    const all = [...ports, ...customPorts];
    expect(planPortConnections(outputs.slice(0, 2), customPorts[0], all, []).connections).toEqual([
      { from: "source", output: 0, to: "custom", input: 0 },
      { from: "source", output: 1, to: "custom", input: 1 },
    ]);
    expect(planPortConnections(inputs.slice(0, 2), customPorts[2], all, []).connections).toEqual([
      { from: "custom", output: 0, to: "target", input: 0 },
      { from: "custom", output: 1, to: "target", input: 1 },
    ]);
  });
  it("rejects the whole batch when one input has a different driver", () => {
    const wires: Wire[] = [{ id: "old", from: "clock", to: "target", output: 0, input: 3 }];
    const plan = planPortConnections(outputs.slice(0, 4), inputs[0], ports, wires);
    expect(plan.error).toContain("already wired");
    expect(plan.connections).toHaveLength(4);
    expect(plan.additions).toEqual([]);
    expect(wires).toHaveLength(1);
  });
  it("preserves existing identical connections and never adds duplicates", () => {
    const wires: Wire[] = [{ id: "old", from: "source", to: "target", input: 0 }];
    const plan = planPortConnections(outputs.slice(0, 2), inputs[0], ports, wires);
    expect(plan.error).toBeUndefined();
    expect(plan.additions).toEqual([{ from: "source", output: 1, to: "target", input: 1 }]);
  });
  it("rejects missing, mixed, self-connected, and oversized batches", () => {
    expect(
      planPortConnections([{ ...outputs[0], nodeId: "missing" }], inputs[0], ports, []).error,
    ).toBeTruthy();
    expect(planPortConnections([outputs[0], inputs[0]], inputs[1], ports, []).error).toBeTruthy();
    const gate = wiringPorts([{ id: "gate", type: "and", x: 0, y: 0 }], () => ({ x: 0, y: 0 }));
    expect(planPortConnections([gate[2]], gate[0], gate, []).error).toContain("itself");
    const many: Wire[] = Array.from({ length: 800 }, (_, i) => ({
      id: String(i),
      from: "a",
      to: `b${i}`,
      input: 0,
    }));
    expect(planPortConnections([outputs[0]], inputs[0], ports, many).error).toContain("800");
  });
});
