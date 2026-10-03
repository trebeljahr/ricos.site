import { describe, expect, it } from "vitest";
import { initialSnapshot, moduleInputs, moduleOutputs, PRESETS, step, validateCircuit } from "./logic";
import type { Circuit, Snapshot } from "./logic";

function setInputs(circuit: Circuit, values: Record<string, boolean>): void {
  for (const node of circuit.nodes) {
    if (node.type === "switch" && node.id in values) node.value = values[node.id];
  }
}

function pulse(circuit: Circuit, previous: Snapshot): Snapshot {
  const low = step(circuit, previous, false);
  return step(circuit, low, true);
}

function bits(circuit: Circuit, state: Snapshot, count: number): boolean[] {
  return Array.from({ length: count }, (_, bit) => Boolean(state.values[`q${bit}`]));
}

describe("expandable memory circuits", () => {
  it("exposes valid black boxes with inspectable internal cells", () => {
    for (const name of ["8-bit parallel register", "4 × 4 SRAM", "4 × 4 DRAM", "4 × 4 flash memory"]) {
      const circuit = PRESETS[name];
      expect(validateCircuit(circuit), name).not.toBeNull();
      expect(moduleInputs(circuit).length, name).toBeLessThanOrEqual(24);
      expect(moduleOutputs(circuit).length, name).toBeGreaterThan(0);
      expect(circuit.nodes.some((node) => ["dff", "dlatch", "dramcell"].includes(node.type)), name).toBe(true);
    }
  });

  it("loads and holds a full 8-bit register word", () => {
    const circuit = structuredClone(PRESETS["8-bit parallel register"]);
    setInputs(circuit, { load: true, d0: true, d3: true, d7: true });
    let state = pulse(circuit, initialSnapshot());
    expect(bits(circuit, state, 8)).toEqual([true, false, false, true, false, false, false, true]);
    setInputs(circuit, { load: false, d0: false, d3: false, d7: false });
    state = pulse(circuit, state);
    expect(bits(circuit, state, 8)).toEqual([true, false, false, true, false, false, false, true]);
  });

  for (const name of ["4 × 4 SRAM", "4 × 4 DRAM"] as const) {
    it(`writes and reads separate rows in ${name}`, () => {
      const circuit = structuredClone(PRESETS[name]);
      setInputs(circuit, { write: true, read: true, d0: true, d2: true });
      let state = pulse(circuit, initialSnapshot());
      expect(bits(circuit, state, 4)).toEqual([true, false, true, false]);
      setInputs(circuit, { a0: true, d0: false, d1: true, d2: false });
      state = pulse(circuit, state);
      expect(bits(circuit, state, 4)).toEqual([false, true, false, false]);
      setInputs(circuit, { a0: false, write: false });
      state = step(circuit, state, false);
      expect(bits(circuit, state, 4)).toEqual([true, false, true, false]);
    });
  }

  it("loses DRAM charge after four clock cycles without refresh", () => {
    const circuit = structuredClone(PRESETS["4 × 4 DRAM"]);
    setInputs(circuit, { write: true, read: true, d0: true });
    let state = pulse(circuit, initialSnapshot());
    setInputs(circuit, { write: false });
    for (let cycle = 0; cycle < 3; cycle++) {
      state = pulse(circuit, state);
      expect(state.values.q0).toBe(true);
    }
    state = pulse(circuit, state);
    expect(state.values.q0).toBe(false);
  });

  it("programs zero and erases flash back to one", () => {
    const circuit = structuredClone(PRESETS["4 × 4 flash memory"]);
    setInputs(circuit, { read: true, d0: true });
    let state = step(circuit, initialSnapshot(), false);
    expect(bits(circuit, state, 4)).toEqual([true, true, true, true]);
    setInputs(circuit, { program: true });
    state = pulse(circuit, state);
    expect(bits(circuit, state, 4)).toEqual([true, false, false, false]);
    setInputs(circuit, { d0: false });
    state = pulse(circuit, state);
    expect(bits(circuit, state, 4)).toEqual([false, false, false, false]);
    setInputs(circuit, { d0: true });
    state = pulse(circuit, state);
    expect(bits(circuit, state, 4)).toEqual([false, false, false, false]);
    setInputs(circuit, { program: false, erase: true });
    state = pulse(circuit, state);
    expect(bits(circuit, state, 4)).toEqual([true, true, true, true]);
  });
});
