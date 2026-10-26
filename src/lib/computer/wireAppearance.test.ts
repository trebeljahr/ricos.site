import { expect, it } from "vitest";
import { type Circuit, initialSnapshot } from "./logic";
import { wireNetKeys } from "./wireTopology";
import { recolorWireNets, wireNetColors, wireSignal } from "./wireAppearance";

it("reads the individual output, including a low output on a live multi-output source", () => {
  const snapshot = {
    ...initialSnapshot(),
    values: { source: true },
    outputs: { source: [true, false] },
  };
  expect(wireSignal(snapshot, "source", 0)).toBe("high");
  expect(wireSignal(snapshot, "source", 1)).toBe("low");
  expect(wireSignal(snapshot, "missing")).toBe("low");
});

it("keeps floating and conflicting buses distinct from binary low", () => {
  const snapshot = {
    ...initialSnapshot(),
    buses: { floating: "Z" as const, conflict: "X" as const, zero: 0, active: 128 },
  };
  expect(wireSignal(snapshot, "floating", 0, 8)).toBe("floating");
  expect(wireSignal(snapshot, "conflict", 0, 8)).toBe("conflict");
  expect(wireSignal(snapshot, "zero", 0, 8)).toBe("low");
  expect(wireSignal(snapshot, "active", 0, 8)).toBe("high");
});

const junctionCircuit: Circuit = {
  name: "Joined signals",
  nodes: [
    { id: "source", type: "switch", x: 0, y: 0 },
    { id: "join", type: "junction", x: 200, y: 0 },
    { id: "next", type: "junction", x: 300, y: 0 },
    { id: "lamp", type: "lamp", x: 400, y: 0 },
    { id: "other", type: "switch", x: 0, y: 200 },
  ],
  wires: [
    { id: "incoming", from: "source", to: "join", input: 0 },
    { id: "middle", from: "join", to: "next", input: 0 },
    { id: "outgoing", from: "next", to: "lamp", input: 0 },
    { id: "separate", from: "other", to: "lamp", input: 0 },
  ],
};
const colors = (circuit: Circuit) =>
  wireNetColors(circuit, wireNetKeys(circuit), (from) => (from === "source" ? "cyan" : "amber"));

it("keeps the source color through chained junctions without recoloring other signals", () => {
  expect(colors(junctionCircuit)).toEqual({
    incoming: "cyan",
    middle: "cyan",
    outgoing: "cyan",
    separate: "amber",
  });
  expect(colors({ ...junctionCircuit, wires: [...junctionCircuit.wires].reverse() })).toEqual(
    colors(junctionCircuit),
  );
});

it("uses a saved custom color across the whole joined signal", () => {
  const saved = {
    ...junctionCircuit,
    wires: junctionCircuit.wires.map((wire) =>
      wire.id === "outgoing" ? { ...wire, color: "violet" as const } : wire,
    ),
  };
  expect(colors(saved)).toEqual({
    incoming: "violet",
    middle: "violet",
    outgoing: "violet",
    separate: "amber",
  });
});

it("recolors every joined segment when any one segment is recolored", () => {
  const updated = recolorWireNets(junctionCircuit, ["middle"], "coral");
  expect(updated.wires.map((wire) => wire.color)).toEqual(["coral", "coral", "coral", undefined]);
  expect(junctionCircuit.wires.every((wire) => wire.color === undefined)).toBe(true);
});

it("resolves conflicting saved segment colors consistently regardless of wire order", () => {
  const saved = {
    ...junctionCircuit,
    wires: junctionCircuit.wires.map((wire) => ({
      ...wire,
      color: wire.id === "incoming" ? ("violet" as const) : ("coral" as const),
    })),
  };
  expect(colors(saved).incoming).toBe("violet");
  expect(colors({ ...saved, wires: [...saved.wires].reverse() })).toEqual(colors(saved));
});

it("keeps bus splice segments the same color while reserving coral for conflicts", () => {
  const circuit: Circuit = {
    name: "Spliced bus",
    nodes: [
      { id: "source", type: "merger", x: 0, y: 0 },
      { id: "join", type: "bus", splice: true, x: 200, y: 0 },
      { id: "target", type: "splitter", x: 400, y: 0 },
    ],
    wires: [
      { id: "in", from: "source", to: "join", input: 0, color: "coral" },
      { id: "out", from: "join", to: "target", input: 0 },
    ],
  };
  expect(wireNetColors(circuit, wireNetKeys(circuit), () => "amber")).toEqual({
    in: "blue",
    out: "blue",
  });
});
