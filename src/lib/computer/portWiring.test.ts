import { describe, expect, it } from "vitest";
import { type Node, PRESETS, type Wire } from "./logic";
import {
  type PortConnection,
  planPortConnections,
  planSeriesRest,
  wiringPorts,
} from "./portWiring";

const nodes: Node[] = [
  { id: "source", type: "input8", x: 0, y: 0 },
  { id: "target", type: "display8", x: 400, y: 0 },
  { id: "clock", type: "clock", x: 0, y: 400 },
];
const ports = wiringPorts(nodes, (node, index) => ({ x: node.x, y: node.y + index * 25 }));
const outputs = ports.filter((port) => port.nodeId === "source");
const inputs = ports.filter((port) => port.nodeId === "target");

describe("carrying a wire on along its numbered series", () => {
  const row = (type: Node["type"], prefix: string, count: number, first = 0): Node[] =>
    Array.from({ length: count }, (_, index) => ({
      id: `${prefix}${index + first}`,
      type,
      label: `${prefix}${index + first}`,
      x: 0,
      y: index * 100,
    }));
  const wired = ({ from, to, input, output }: PortConnection, id = "done"): Wire => ({
    id,
    from,
    to,
    input,
    output,
  });
  const rest = (parts: Node[], wire: PortConnection, wires: Wire[] = []) =>
    planSeriesRest(
      wire,
      wiringPorts(parts, (node) => node),
      [wired(wire), ...wires],
    );
  const pairs = (plan: ReturnType<typeof rest>) =>
    plan?.connections.map((wire) => `${wire.from}.${wire.output}>${wire.to}.${wire.input}`);

  it("lines a row of switches up with a row of lamps", () => {
    const plan = rest([...row("switch", "A", 3), ...row("lamp", "OUT", 3)], {
      from: "A0",
      output: 0,
      to: "OUT0",
      input: 0,
    });
    expect(pairs(plan)).toEqual(["A1.0>OUT1.0", "A2.0>OUT2.0"]);
    expect(plan?.names).toBe("OUT1–OUT2");
  });
  it("runs through a part's own numbered ports, in both directions from the wire", () => {
    const plan = rest(nodes, { from: "source", output: 3, to: "target", input: 3 });
    expect(pairs(plan)).toEqual([0, 1, 2, 4, 5, 6, 7].map((bit) => `source.${bit}>target.${bit}`));
    expect(plan?.names).toBe("Bit 0–Bit 7");
  });
  it("lines up places in a run, so bits find their binary weights", () => {
    const weights = [1, 2, 4, 8].map((weight, index) => ({
      id: `w${weight}`,
      type: "lamp" as const,
      label: `WEIGHT ${weight}`,
      x: 0,
      y: index * 100,
    }));
    const plan = rest([nodes[0], ...weights], { from: "source", output: 0, to: "w1", input: 0 });
    expect(pairs(plan)).toEqual(["source.1>w2.0", "source.2>w4.0", "source.3>w8.0"]);
    expect(plan?.names).toBe("WEIGHT 2–WEIGHT 8");
  });
  it("keeps the offset of the wire it carries on from, and stops where a series ends", () => {
    const parts = [...row("switch", "A", 8), ...row("lamp", "OUT", 4)];
    expect(pairs(rest(parts, { from: "A4", output: 0, to: "OUT0", input: 0 }))).toEqual([
      "A5.0>OUT1.0",
      "A6.0>OUT2.0",
      "A7.0>OUT3.0",
    ]);
  });
  it("leaves out an input something else drives, and a wire already there", () => {
    const parts = [...row("switch", "A", 4), ...row("switch", "B", 1), ...row("lamp", "OUT", 4)];
    const plan = rest(parts, { from: "A0", output: 0, to: "OUT0", input: 0 }, [
      { id: "other", from: "B0", to: "OUT1", input: 0 },
      { id: "same", from: "A2", to: "OUT2", input: 0 },
    ]);
    expect(pairs(plan)).toEqual(["A3.0>OUT3.0"]);
    expect(plan?.names).toBe("OUT3");
  });
  it("offers nothing for a gate's plain inputs", () => {
    const gate: Node = { id: "gate", type: "nand", x: 0, y: 0 };
    expect(
      rest([...row("switch", "A", 2), gate], { from: "A0", output: 0, to: "gate", input: 0 }),
    ).toBeNull();
  });
  it("offers nothing where two parts share a number, or once the wire is gone", () => {
    const twins = [...row("switch", "A", 2), { ...row("switch", "A", 1, 1)[0], id: "twin" }];
    expect(
      rest([...twins, ...row("lamp", "OUT", 2)], { from: "A0", output: 0, to: "OUT0", input: 0 }),
    ).toBeNull();
    const parts = [...row("switch", "A", 2), ...row("lamp", "OUT", 2)];
    const ports = wiringPorts(parts, (node) => node);
    expect(planSeriesRest({ from: "A0", output: 0, to: "OUT0", input: 0 }, ports, [])).toBeNull();
  });
});

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

describe("bus port wiring", () => {
  const parts: Node[] = [
    { id: "bits", type: "input8", x: 0, y: 0 },
    { id: "merge", type: "merger", x: 200, y: 0 },
    { id: "drive", type: "busdriver", x: 400, y: 0 },
    { id: "bus", type: "bus", x: 600, y: 0 },
    { id: "lamp", type: "lamp", x: 800, y: 0 },
  ];
  const all = wiringPorts(parts, (node, index) => ({ x: node.x, y: node.y + index * 25 }));
  const port = (nodeId: string, kind: "input" | "output", index = 0) =>
    all.find((item) => item.nodeId === nodeId && item.kind === kind && item.index === index)!;
  it("connects 8 bits into a merger and buses to bus inputs", () => {
    const bits = all.filter((item) => item.nodeId === "bits");
    expect(planPortConnections(bits, port("merge", "input"), all, []).connections).toHaveLength(8);
    expect(
      planPortConnections([port("merge", "output")], port("drive", "input"), all, []).error,
    ).toBeUndefined();
    expect(
      planPortConnections([port("drive", "output")], port("bus", "input", 1), all, []).error,
    ).toBeUndefined();
  });
  it("refuses to join a bus port with a single-bit port", () => {
    expect(
      planPortConnections([port("bus", "output")], port("lamp", "input"), all, []).error,
    ).toContain("Bus ports");
    expect(
      planPortConnections([port("bits", "output")], port("drive", "input"), all, []).error,
    ).toContain("Bus ports");
    expect(
      planPortConnections([port("bits", "output")], port("drive", "input", 1), all, []).error,
    ).toBeUndefined();
  });
});
