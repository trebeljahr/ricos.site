import { describe, expect, it } from "vitest";
import {
  cloneCircuit,
  copyCircuit,
  insertCircuitCopy,
  parseCircuitClip,
  remapCircuitPath,
} from "./circuitClipboard";
import {
  datapathCircuit,
  foldBlockState,
  romBytes,
  toNumber,
  unfoldBlockState,
} from "./datapathBlocks";
import { type Circuit, initialSnapshot, step } from "./logic";

const circuit: Circuit = {
  name: "Pair",
  nodes: [
    { id: "in", type: "switch", x: 0, y: 0, value: true, outputSide: "bottom" },
    { id: "gate", type: "not", x: 200, y: 0 },
    { id: "out", type: "lamp", x: 400, y: 0 },
  ],
  wires: [
    { id: "a", from: "in", to: "gate", input: 0 },
    { id: "b", from: "gate", to: "out", input: 0 },
  ],
  groups: [{ id: "g", label: "Pair", nodeIds: ["in", "gate"], activeWhen: "in" }],
};

describe("circuit clipboard", () => {
  it("omits boundary wires and includes selected wire endpoints", () => {
    expect(copyCircuit(circuit, ["gate", "out"], []).circuit.wires.map((wire) => wire.id)).toEqual([
      "b",
    ]);
    const selected = copyCircuit(circuit, [], ["a"]).circuit;
    expect(selected.nodes.map((node) => node.id)).toEqual(["in", "gate"]);
    expect(selected.wires.map((wire) => wire.id)).toEqual(["a"]);
    expect(copyCircuit(circuit, ["gate"], []).circuit.groups?.[0].activeWhen).toBeUndefined();
  });
  it("remaps nested nodes, wire ports, groups, activation and fold paths", () => {
    const source: Circuit = {
      name: "Box",
      nodes: [{ id: "box", type: "module", x: 2, y: 3, module: circuit }],
      wires: [],
      groups: [{ id: "outer", label: "Box", nodeIds: ["box"], activeWhen: "box" }],
    };
    const copy = cloneCircuit(source, 24, 24);
    const box = copy.circuit.nodes[0],
      inner = box.module!;
    expect(box.id).not.toBe("box");
    expect(box.x).toBe(26);
    expect(inner.nodes[0]).toMatchObject({ x: 0, value: true, outputSide: "bottom" });
    expect(inner.wires[0]).toMatchObject({
      from: inner.nodes[0].id,
      to: inner.nodes[1].id,
      input: 0,
    });
    expect(inner.groups?.[0]).toMatchObject({
      nodeIds: inner.nodes.slice(0, 2).map((node) => node.id),
      activeWhen: inner.nodes[0].id,
    });
    expect(copy.circuit.groups?.[0].activeWhen).toBe(box.id);
    expect(copy.paths.get("box/gate")).toBe(`${box.id}/${inner.nodes[1].id}`);
    expect(remapCircuitPath(copy.paths, "box/gate/transistor")).toBe(
      `${box.id}/${inner.nodes[1].id}/transistor`,
    );
  });
  it("preserves ROM bytes and behavioral block state across fold/unfold in new scopes", () => {
    const source: Circuit = {
      name: "Hardware",
      nodes: [
        {
          id: "rom",
          type: "module",
          behaviour: "rom256",
          module: datapathCircuit("rom256", [0xa5, 0x5a]),
          x: 0,
          y: 0,
        },
        {
          id: "register",
          type: "module",
          behaviour: "register8",
          module: datapathCircuit("register8"),
          x: 300,
          y: 0,
        },
      ],
      wires: [],
    };
    const copied = cloneCircuit(source, 24, 24),
      [rom, register] = copied.circuit.nodes;
    expect(rom.id).not.toBe("rom");
    expect(register.id).not.toBe("register");
    expect(romBytes(rom.module!)).toEqual(romBytes(source.nodes[0].module!));
    expect(toNumber(step(copied.circuit, initialSnapshot(), false).outputs[rom.id])).toBe(0xa5);
    const gates = step(
      register.module!,
      unfoldBlockState(register, { q: 0xa5, clock: false }),
      false,
    );
    expect(foldBlockState(register, gates)).toMatchObject({ q: 0xa5 });
    expect(copied.paths.get("rom/page0")).toBe(`${rom.id}/page0`);
    expect(register.module!.wires[0].id).not.toBe(source.nodes[1].module!.wires[0].id);
  });
  it("pastes an independent working circuit and translates route geometry", () => {
    const source = structuredClone(circuit);
    source.wires[0].points = [
      { x: 132, y: 63 },
      { x: 200, y: 58 },
    ];
    const inserted = insertCircuitCopy(circuit, source, { x: 800, y: 500 })!;
    const nodes = inserted.circuit.nodes.slice(3);
    const off = {
      ...inserted.circuit,
      nodes: inserted.circuit.nodes.map((node) =>
        node.id === nodes[0].id ? { ...node, value: false } : node,
      ),
    };
    const state = step(off, initialSnapshot(), false);
    expect(state.values.out).toBe(false);
    expect(state.values[nodes[2].id]).toBe(true);
    expect(inserted.circuit.wires[2].points?.[0].x).toBe(nodes[0].x + 132);
    expect(inserted.selected).toEqual(nodes.map((node) => node.id));
  });
  it("includes transparent splices between selected gates without outside consumers", () => {
    const branched: Circuit = {
      ...circuit,
      nodes: [...circuit.nodes, { id: "join", type: "junction", splice: true, x: 100, y: 50 }],
      wires: [
        { id: "j0", from: "in", to: "join", input: 0 },
        { id: "j1", from: "join", to: "gate", input: 0 },
        { id: "j2", from: "join", to: "out", input: 0 },
      ],
    };
    const copied = copyCircuit(branched, ["in", "gate"], []).circuit;
    expect(copied.nodes.map((node) => node.id)).toEqual(["in", "gate", "join"]);
    expect(copied.wires.map((wire) => wire.id)).toEqual(["j0", "j1"]);
  });
  it("rejects malformed, oversized and over-limit payloads", () => {
    expect(parseCircuitClip("not JSON")).toBeNull();
    expect(parseCircuitClip(" ".repeat(2_000_001))).toBeNull();
    expect(
      parseCircuitClip(
        JSON.stringify({
          ...circuit,
          wires: [{ id: "dangling", from: "missing", to: "out", input: 0 }],
        }),
      ),
    ).toBeNull();
    expect(
      insertCircuitCopy(
        {
          ...circuit,
          nodes: Array.from({ length: 2000 }, (_, i) => ({ ...circuit.nodes[0], id: String(i) })),
          wires: [],
        },
        circuit,
        { x: 0, y: 0 },
      ),
    ).toBeNull();
    expect(parseCircuitClip(JSON.stringify(copyCircuit(circuit, [], [])))?.circuit.name).toBe(
      "Pair",
    );
  });
});
