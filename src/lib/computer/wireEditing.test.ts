import { describe, expect, it } from "vitest";
import { type Circuit, initialSnapshot, step, validateCircuit } from "./logic";
import { compileNetlist, NetlistSim } from "./netlist";
import { connectWireEnds, splitWire, type WireAnchor, wireJoinError } from "./wireEditing";
import { pathPoints, wireJunctions } from "./wireGeometry";
import { routeCircuitWires } from "./wireRouting";
import { wireNetKeys } from "./wireTopology";

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
  it("validates reverse input-to-wire previews without changing topology", () => {
    const before = JSON.stringify(base);
    expect(wireJoinError(base, { node: "branch", port: 0, kind: "input" }, anchor)).toBeUndefined();
    expect(wireJoinError(base, { node: "lamp", port: 0, kind: "input" }, anchor)).toMatch(
      /already has a driver/,
    );
    expect(JSON.stringify(base)).toBe(before);
  });
  it("joins transistor output wires with a two-input electrical knob, distinct from its route splice", () => {
    const circuit: Circuit = {
      name: "Transistor branches",
      nodes: [
        { id: "a", type: "switch", x: 0, y: 0, value: false },
        { id: "vdd", type: "high", x: 0, y: 100 },
        { id: "gnd", type: "ground", x: 0, y: 200 },
        { id: "p", type: "pmos", x: 150, y: 0 },
        { id: "n", type: "nmos", x: 150, y: 200 },
        { id: "x", type: "lamp", x: 400, y: 0 },
        { id: "y", type: "lamp", x: 400, y: 200 },
      ],
      wires: [
        { id: "ap", from: "a", to: "p", input: 0 },
        { id: "an", from: "a", to: "n", input: 0 },
        { id: "vp", from: "vdd", to: "p", input: 1 },
        { id: "gn", from: "gnd", to: "n", input: 1 },
        { id: "px", from: "p", to: "x", input: 0 },
        { id: "ny", from: "n", to: "y", input: 0 },
      ],
    };
    const source = { wire: "px", point: { x: 320, y: 50 }, path: "M 282 50 L 400 50" };
    const target = { wire: "ny", point: { x: 320, y: 250 }, path: "M 282 250 L 400 250" };
    expect(wireJoinError(circuit, source, target)).toBeUndefined();
    const next = connectWireEnds(circuit, source, target).circuit!;
    expect(next.nodes.filter((node) => node.type === "junction" && !node.splice)).toHaveLength(1);
    expect(next.nodes.filter((node) => node.splice)).toHaveLength(1);
    expect(validateCircuit(next)).toBeTruthy();
    const state = step(next, initialSnapshot(), false);
    expect(state.values.x).toBe(true);
    expect(state.values.y).toBe(true);
  });
  describe("drawn routes after a drop", () => {
    const inverter: Circuit = {
      name: "Inverter output",
      nodes: [
        { id: "p", type: "pmos", x: 100, y: 0 },
        { id: "n", type: "nmos", x: 100, y: 300 },
        { id: "lamp", type: "lamp", x: 600, y: 0 },
      ],
      wires: [{ id: "out", from: "p", to: "lamp", input: 0 }],
    };
    const route = "M 150 100 L 150 140 L 500 140 L 500 60 L 600 60";
    const drop: WireAnchor = { wire: "out", point: { x: 400, y: 150 }, path: route };
    const start = { x: 150, y: 300 };
    /** Draw every wire the way the board does, with the drain port as the routed start. */
    const drawn = (circuit: Circuit) => {
      const centre = (id: string) => {
        const node = circuit.nodes.find((item) => item.id === id)!;
        return { x: node.x + 5, y: node.y + 5 };
      };
      const net = wireNetKeys(circuit);
      const { paths } = routeCircuitWires(
        circuit.wires.map((wire) => ({
          id: wire.id,
          from: wire.from,
          to: wire.to,
          output: 0,
          start:
            wire.from === "n" ? start : wire.from === "p" ? { x: 150, y: 100 } : centre(wire.from),
          end: wire.to === "lamp" ? { x: 600, y: 60 } : centre(wire.to),
          startSide: wire.from === "n" ? "top" : wire.from === "p" ? "bottom" : "right",
          endSide: circuit.nodes.find((node) => node.id === wire.to)?.inputSide ?? "left",
          net: net[wire.id],
          points: wire.points,
        })),
        [],
      );
      return circuit.wires.map((wire) => ({
        id: wire.id,
        path: paths[wire.id],
        net: net[wire.id],
      }));
    };

    it("keeps the hit wire where it was and brings the dropped wire in across it", () => {
      const next = connectWireEnds(inverter, { node: "n", port: 0, kind: "output" }, drop).circuit!;
      const join = next.nodes.find((node) => node.type === "junction")!;
      expect({ x: join.x + 5, y: join.y + 5 }).toEqual({ x: 400, y: 140 });
      expect(join.inputSide).toBe("bottom");
      const head = next.wires.find((wire) => wire.from === "p")!;
      const tail = next.wires.find((wire) => wire.to === "lamp")!;
      expect(head.points).toEqual([
        { x: 150, y: 100 },
        { x: 150, y: 140 },
        { x: 400, y: 140 },
      ]);
      expect(tail.points).toEqual([
        { x: 400, y: 140 },
        { x: 500, y: 140 },
        { x: 500, y: 60 },
        { x: 600, y: 60 },
      ]);
      const wires = drawn(next);
      const dropped = pathPoints(
        wires.find((wire) => next.wires.find((w) => w.id === wire.id)?.from === "n")!.path,
      )[0];
      expect(dropped.at(-2)!.x).toBe(400);
      expect(dropped.at(-2)!.y).toBeGreaterThan(140);
      expect(wireJunctions(wires)).toEqual([expect.objectContaining({ x: 400, y: 140 })]);
    });
    it("keeps both drawn routes when one wire is dragged onto another", () => {
      const circuit: Circuit = {
        ...inverter,
        nodes: [...inverter.nodes, { id: "lamp2", type: "lamp", x: 600, y: 300 }],
        wires: [...inverter.wires, { id: "low", from: "n", to: "lamp2", input: 0 }],
      };
      const next = connectWireEnds(
        circuit,
        { wire: "low", point: { x: 300, y: 260 }, path: "M 150 300 L 150 260 L 600 260" },
        drop,
      ).circuit!;
      const start = next.nodes.find((node) => node.splice)!;
      expect({ x: start.x + 5, y: start.y + 5 }).toEqual({ x: 300, y: 260 });
      const lamp2 = next.wires.find((wire) => wire.to === "lamp2")!;
      expect(lamp2.points?.at(-1)).toEqual({ x: 600, y: 260 });
      expect(lamp2.points).toContainEqual({ x: 300, y: 260 });
      expect(next.wires.find((wire) => wire.from === "n")?.points?.at(-1)).toEqual({
        x: 300,
        y: 260,
      });
    });
    it("branches a port wire off square instead of along the trunk", () => {
      const horizontal = { ...anchor, path: "M 132 63 L 300 63" };
      const split = connectWireEnds(base, horizontal, { node: "branch", port: 0, kind: "input" });
      expect(split.circuit!.nodes.find((node) => node.splice)?.outputSide).toBe("bottom");
    });
  });
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
