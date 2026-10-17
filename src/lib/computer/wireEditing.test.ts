import { describe, expect, it } from "vitest";
import { type Circuit, initialSnapshot, step, validateCircuit } from "./logic";
import { connectWireEnds, splitWire, type WireAnchor } from "./wireEditing";
import { compileNetlist, NetlistSim } from "./netlist";
const base: Circuit = {
  name: "Branches",
  nodes: [
    { id: "source", type: "switch", x: 0, y: 0, value: true },
    { id: "lamp", type: "lamp", x: 300, y: 0 },
    { id: "branch", type: "lamp", x: 300, y: 150 },
  ],
  wires: [{ id: "original", from: "source", to: "lamp", input: 0 }],
};
const anchor: WireAnchor = {
  wire: "original",
  point: { x: 200, y: 63 },
  path: "M 132 63 L 200 63 L 300 63",
};

describe("wire connectivity", () => {
  it("branches at the actual route and preserves its signal after save/reload", () => {
    const next = connectWireEnds(base, anchor, { node: "branch", port: 0, kind: "input" }).circuit!;
    expect(next.nodes.filter((node) => node.splice)).toHaveLength(1);
    const reloaded = validateCircuit(JSON.parse(JSON.stringify(next)))!;
    const state = step(reloaded, initialSnapshot(), false);
    expect(state.values.lamp).toBe(true);
    expect(state.values.branch).toBe(true);
    expect(reloaded.wires.find((wire) => wire.id === "original")?.points?.at(-1)).toEqual(
      anchor.point,
    );
    const off = {
      ...reloaded,
      nodes: reloaded.nodes.map((node) =>
        node.id === "source" ? { ...node, value: false } : node,
      ),
    };
    expect(step(off, state, false).values.branch).toBe(false);
    const netlist = compileNetlist(reloaded),
      sim = new NetlistSim(netlist);
    sim.step(false);
    expect(sim.bit(netlist.nodes.get("branch")![0])).toBe(true);
  });
  it("supports drawing from an input back to a wire and reuses existing dots", () => {
    const next = connectWireEnds(base, { node: "branch", port: 0, kind: "input" }, anchor).circuit!;
    const join = next.nodes.find((node) => node.splice)!;
    const feed = next.wires.find((wire) => wire.to === join.id)!;
    const again = splitWire(next, { wire: feed.id, point: anchor.point, path: anchor.path })!;
    expect(again.node.id).toBe(join.id);
  });
  it("keeps crossed wires independent and rejects separate one-bit drivers", () => {
    const next: Circuit = {
      ...base,
      nodes: [...base.nodes, { id: "other", type: "switch", x: 150, y: -100, value: false }],
      wires: [...base.wires, { id: "cross", from: "other", to: "branch", input: 0 }],
    };
    expect(step(next, initialSnapshot(), false).values.branch).toBe(false);
    const joined = connectWireEnds(next, anchor, {
      wire: "cross",
      point: { x: 200, y: 150 },
      path: "M 200 0 L 200 200",
    });
    expect(joined.circuit).toBeUndefined();
    expect(joined.error).toMatch(/separate one-bit drivers/);
    expect(next.nodes).toHaveLength(4);
  });
  it("rejects mismatched widths and occupied inputs without changing topology", () => {
    const next: Circuit = {
      ...base,
      nodes: [...base.nodes, { id: "bits", type: "splitter", x: 0, y: 200 }],
    };
    expect(connectWireEnds(next, anchor, { node: "bits", port: 0, kind: "input" }).error).toMatch(
      /single bit/,
    );
    expect(connectWireEnds(base, anchor, { node: "lamp", port: 0, kind: "input" }).error).toMatch(
      /already has a driver/,
    );
  });
  it("joins complete bus nets and resolves conflicting drivers for all consumers", () => {
    const bus: Circuit = {
      name: "Bus join",
      nodes: [
        { id: "a", type: "merger", x: 0, y: 0 },
        { id: "b", type: "merger", x: 0, y: 200 },
        { id: "one", type: "high", x: -200, y: 0 },
        { id: "x", type: "splitter", x: 400, y: 0 },
        { id: "y", type: "splitter", x: 400, y: 200 },
        { id: "z", type: "splitter", x: 400, y: 400 },
      ],
      wires: [
        { id: "bit", from: "one", to: "a", input: 0 },
        { id: "wa", from: "a", to: "x", input: 0 },
        { id: "wb", from: "b", to: "y", input: 0 },
        { id: "fan", from: "a", to: "z", input: 0 },
      ],
    };
    const joined = connectWireEnds(
      bus,
      { wire: "wa", point: { x: 200, y: 50 }, path: "M 132 50 L 400 50" },
      { wire: "wb", point: { x: 250, y: 250 }, path: "M 132 250 L 400 250" },
    ).circuit!;
    expect(joined).toBeTruthy();
    const state = step(joined, initialSnapshot(), false);
    const resolver = joined.nodes.filter((node) => node.splice).at(-1)!;
    expect(state.buses?.[resolver.id]).toBe("X");
    for (const target of ["x", "y", "z"])
      expect(joined.wires.find((wire) => wire.to === target)?.from).toBe(resolver.id);
    expect(validateCircuit(JSON.parse(JSON.stringify(joined)))).not.toBeNull();
    const netlist = compileNetlist(joined),
      sim = new NetlistSim(netlist);
    sim.step(false);
    expect(sim.bus(netlist.buses.get(resolver.id)!)).toBe("X");
    // A disabled tri-state driver must float rather than overwrite the driven value.
    const triState: Circuit = {
      ...joined,
      nodes: [
        ...joined.nodes.map((node) =>
          node.id === "b" ? { ...node, type: "busdriver" as const } : node,
        ),
        { id: "data", type: "merger", x: -200, y: 200 },
        { id: "enable", type: "switch", x: -400, y: 200, value: false },
      ],
      wires: [
        ...joined.wires,
        { id: "data-b", from: "data", to: "b", input: 0 },
        { id: "enable-b", from: "enable", to: "b", input: 1 },
      ],
    };
    expect(step(triState, initialSnapshot(), false).buses?.[resolver.id]).toBe(1);
    const enabled: Circuit = {
      ...triState,
      nodes: triState.nodes.map((node) => (node.id === "enable" ? { ...node, value: true } : node)),
    };
    expect(step(enabled, initialSnapshot(), false).buses?.[resolver.id]).toBe("X");
  });
});
