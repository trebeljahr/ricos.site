import { describe, expect, it } from "vitest";
import { type Circuit, initialSnapshot, PRESETS, step, validateCircuit } from "./logic";

describe("logic circuit engine", () => {
  it("evaluates half adder sum and carry through wires", () => {
    const circuit = structuredClone(PRESETS["Half adder"]);
    const read = (a: boolean, b: boolean) => {
      circuit.nodes.find((node) => node.id === "a")!.value = a;
      circuit.nodes.find((node) => node.id === "b")!.value = b;
      return step(circuit, initialSnapshot(), false).values;
    };
    expect([read(false, false).sum, read(false, false).carry]).toEqual([false, false]);
    expect([read(true, false).sum, read(true, false).carry]).toEqual([true, false]);
    expect([read(true, true).sum, read(true, true).carry]).toEqual([false, true]);
  });
  it("captures data only on a rising clock edge", () => {
    const circuit = structuredClone(PRESETS["Clocked memory"]);
    const data = circuit.nodes.find((node) => node.id === "data")!;
    let state = step(circuit, initialSnapshot(), false);
    data.value = true;
    state = step(circuit, state, false);
    expect(state.values.out).toBe(false);
    state = step(circuit, state, true);
    expect(state.values.out).toBe(true);
    data.value = false;
    state = step(circuit, state, true);
    expect(state.values.out).toBe(true);
    state = step(circuit, state, false);
    state = step(circuit, state, true);
    expect(state.values.out).toBe(false);
  });
  it("rejects malformed imported circuits", () => {
    const bad = {
      name: "bad",
      nodes: [{ id: "a", type: "switch", x: 0, y: 0 }],
      wires: [{ id: "w", from: "missing", to: "a", input: 0 }],
    };
    expect(validateCircuit(bad)).toBeNull();
    expect(validateCircuit(PRESETS["Half adder"] as Circuit)?.nodes).toHaveLength(6);
  });
});
