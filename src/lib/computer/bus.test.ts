import { describe, expect, it } from "vitest";
import { bitsFromBus, busFromBits, formatBus, resolveBus } from "./bus";
import { type Circuit, initialSnapshot, type Node, PRESETS, step, validateCircuit, type Wire } from "./logic";

describe("bus resolution", () => {
  it("floats with no drivers, passes one, keeps agreeing drivers and flags fights", () => {
    expect(resolveBus([])).toBe("Z");
    expect(resolveBus(["Z", "Z"])).toBe("Z");
    expect(resolveBus(["Z", 0x42])).toBe(0x42);
    expect(resolveBus([0x42, 0x42])).toBe(0x42);
    expect(resolveBus([0x42, 0x43])).toBe("X");
    expect(resolveBus(["X", "Z"])).toBe("X");
  });
  it("converts between lanes and numbers", () => {
    expect(busFromBits([true, false, true, false, false, true, false, true])).toBe(0xa5);
    expect(bitsFromBus(0xa5)).toEqual([true, false, true, false, false, true, false, true]);
    expect(bitsFromBus("Z")).toEqual(Array(8).fill(false));
    expect(bitsFromBus("X")).toEqual(Array(8).fill(false));
    expect([formatBus(0x0f), formatBus("Z"), formatBus("X")]).toEqual(["0x0F", "Z", "X"]);
  });
});

/** Two 8-bit sources, each behind an enabled driver, on one bus that is split into lanes. */
function twoDrivers(a: number, b: number): Circuit {
  const nodes: Node[] = [
    { id: "a", type: "input8", x: 0, y: 0, numberValue: a },
    { id: "b", type: "input8", x: 0, y: 300, numberValue: b },
    { id: "en-a", type: "switch", x: 0, y: 150 },
    { id: "en-b", type: "switch", x: 0, y: 450 },
    { id: "merge-a", type: "merger", x: 200, y: 0 },
    { id: "merge-b", type: "merger", x: 200, y: 300 },
    { id: "drive-a", type: "busdriver", x: 400, y: 0 },
    { id: "drive-b", type: "busdriver", x: 400, y: 300 },
    { id: "bus", type: "bus", x: 600, y: 150 },
    { id: "split", type: "splitter", x: 800, y: 150 },
  ];
  const wires: Wire[] = [];
  const link = (from: string, to: string, input = 0, output = 0) =>
    wires.push({ id: `${from}-${output}-${to}-${input}`, from, to, input, output });
  for (let bit = 0; bit < 8; bit++) {
    link("a", "merge-a", bit, bit);
    link("b", "merge-b", bit, bit);
  }
  link("merge-a", "drive-a");
  link("en-a", "drive-a", 1);
  link("merge-b", "drive-b");
  link("en-b", "drive-b", 1);
  link("drive-a", "bus");
  link("drive-b", "bus", 1);
  link("bus", "split");
  return { name: "Two drivers", nodes, wires };
}
const run = (circuit: Circuit, enabled: Record<string, boolean>) =>
  step(circuit, initialSnapshot(), false, {}, enabled);

describe("bus nets in the engine", () => {
  const circuit = twoDrivers(0x2a, 0x99);
  it("accepts a hand-built bus circuit", () => {
    expect(validateCircuit(circuit)).not.toBeNull();
  });
  it("floats when no driver is enabled", () => {
    const state = run(circuit, { "en-a": false, "en-b": false });
    expect(state.buses?.["drive-a"]).toBe("Z");
    expect(state.buses?.bus).toBe("Z");
    expect(state.outputs.split).toEqual(Array(8).fill(false));
  });
  it("carries the one enabled driver's value", () => {
    const a = run(circuit, { "en-a": true, "en-b": false });
    expect(a.buses?.bus).toBe(0x2a);
    expect(busFromBits(a.outputs.split)).toBe(0x2a);
    const b = run(circuit, { "en-a": false, "en-b": true });
    expect(b.buses?.bus).toBe(0x99);
  });
  it("keeps the value when two enabled drivers agree", () => {
    const state = run(twoDrivers(0x5c, 0x5c), { "en-a": true, "en-b": true });
    expect(state.buses?.bus).toBe(0x5c);
  });
  it("shows a conflict when two enabled drivers fight", () => {
    const state = run(circuit, { "en-a": true, "en-b": true });
    expect(state.buses?.bus).toBe("X");
    expect(state.outputs.split).toEqual(Array(8).fill(false));
    expect(state.unstable).toBe(false);
  });
  it("leaves plain circuits without a bus record", () => {
    expect(step(PRESETS["Half adder"], initialSnapshot(), false).buses).toBeUndefined();
  });
  it("rejects wires between a bus port and a single-bit port", () => {
    const bad = structuredClone(circuit);
    bad.wires.push({ id: "bad", from: "en-a", to: "bus", input: 2, output: 0 });
    expect(validateCircuit(bad)).toBeNull();
    const reverse = structuredClone(circuit);
    reverse.wires.push({ id: "bad", from: "bus", to: "drive-a", input: 1, output: 0 });
    expect(validateCircuit(reverse)).toBeNull();
  });
  it("runs the shared bus preset beside its multiplexer", () => {
    const preset = PRESETS["8-bit shared bus"];
    expect(validateCircuit(preset)).not.toBeNull();
    const value = (state: ReturnType<typeof step>, id: string) => busFromBits(state.outputs[id]);
    const onlyA = run(preset, {});
    expect(onlyA.buses?.bus).toBe(0x2a);
    expect(value(onlyA, "bus-display")).toBe(0x2a);
    expect(value(onlyA, "mux-display")).toBe(0x2a);
    const both = run(preset, { "enable-b": true });
    expect(both.buses?.bus).toBe("X");
    const muxB = run(preset, { select: true });
    expect(value(muxB, "mux-display")).toBe(0x99);
  });
});
