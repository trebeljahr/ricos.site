import { describe, expect, it } from "vitest";
import { probesToSnapshot } from "../computerStepper";
import { type Circuit, initialSnapshot, step, validateCircuit, type Wire } from "./logic";
import { duplicateProbes, listProbes, readProbes } from "./probes";

const byteWires = (from: string, to: string): Wire[] =>
  Array.from({ length: 8 }, (_, bit) => ({
    id: `${from}-${to}-${bit}`,
    from,
    to,
    input: bit,
    output: bit,
  }));

const registers = (acc: number, pc: number): Circuit => ({
  name: "Registers",
  nodes: [
    { id: "acc-in", type: "input8", x: 0, y: 0, numberValue: acc },
    { id: "pc-in", type: "input8", x: 0, y: 100, numberValue: pc },
    { id: "acc", type: "display8", x: 200, y: 0, probe: "ACC" },
    { id: "pc", type: "display8", x: 200, y: 100, probe: "PC" },
    { id: "out", type: "lamp", x: 400, y: 0 },
  ],
  wires: [...byteWires("acc-in", "acc"), ...byteWires("pc-in", "pc")],
});

const nested = (inner: Circuit): Circuit => ({
  name: "Computer",
  nodes: [
    {
      id: "cpu",
      type: "module",
      x: 0,
      y: 0,
      module: {
        name: "CPU",
        nodes: [
          { id: "regs", type: "module", x: 0, y: 0, module: inner },
          { id: "out", type: "lamp", x: 300, y: 0 },
        ],
        wires: [],
      },
    },
  ],
  wires: [],
});

describe("readProbes", () => {
  it("reads ACC and PC from probes nested two modules deep", () => {
    const circuit = nested(registers(42, 6));
    const snapshot = step(circuit, initialSnapshot(), false);
    expect(readProbes(circuit, snapshot)).toEqual({ ACC: 42, PC: 6 });
    expect(listProbes(circuit).map((probe) => probe.path)).toEqual([
      ["cpu", "regs", "acc"],
      ["cpu", "regs", "pc"],
    ]);
  });

  it("reports 0 for a probe the snapshot has not reached yet", () => {
    expect(readProbes(nested(registers(42, 6)), initialSnapshot())).toEqual({ ACC: 0, PC: 0 });
  });

  it("lets the shallowest probe win a duplicate name", () => {
    const inner = nested(registers(42, 6));
    const circuit: Circuit = {
      ...inner,
      nodes: [
        ...inner.nodes,
        { id: "top-in", type: "input8", x: 0, y: 300, numberValue: 9 },
        { id: "top-acc", type: "display8", x: 200, y: 300, probe: "ACC" },
      ],
      wires: byteWires("top-in", "top-acc"),
    };
    const snapshot = step(circuit, initialSnapshot(), false);
    expect(readProbes(circuit, snapshot)).toEqual({ ACC: 9, PC: 6 });
    expect(duplicateProbes(circuit)).toEqual(["ACC"]);
  });

  it("feeds the stepper snapshot shape", () => {
    expect(probesToSnapshot({ ACC: 42, PC: 6, FLAGS: 0b10, BUS: 3 })).toEqual({
      accumulator: 42,
      pc: 6,
      zero: true,
      carry: false,
      bus: 3,
    });
    expect(probesToSnapshot({}).ir).toBeUndefined();
  });
});

describe("validateCircuit probes", () => {
  it("keeps probe names through a save round trip", () => {
    const circuit = nested(registers(42, 6));
    const restored = validateCircuit(JSON.parse(JSON.stringify(circuit)))!;
    expect(listProbes(restored).map((probe) => probe.name)).toEqual(["ACC", "PC"]);
  });

  it("rejects malformed probes and probes on non-display parts", () => {
    const base = registers(1, 2);
    const withNode = (id: string, patch: object) => ({
      ...base,
      nodes: base.nodes.map((node) => (node.id === id ? { ...node, ...patch } : node)),
    });
    expect(validateCircuit(withNode("acc", { probe: "ACC" }))).not.toBeNull();
    expect(validateCircuit(withNode("acc", { probe: "acc" }))).toBeNull();
    expect(validateCircuit(withNode("acc", { probe: 7 }))).toBeNull();
    expect(validateCircuit(withNode("out", { probe: "OUT" }))).toBeNull();
  });
});
