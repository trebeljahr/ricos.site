import { describe, expect, it } from "vitest";
import { type Circuit, initialSnapshot, type Snapshot, step, validateCircuit } from "./logic";
import { memoryByteDemo, memoryCellDemo, smallRamDemo } from "./memoryDemos";

/** Drives a demo the way a reader does: switches and byte inputs change, the circuit settles. */
function bench(source: Circuit) {
  let circuit = source;
  let snapshot: Snapshot = step(circuit, initialSnapshot(), false);
  const set = (values: Record<string, boolean | number>) => {
    circuit = {
      ...circuit,
      nodes: circuit.nodes.map((node) =>
        node.id in values
          ? typeof values[node.id] === "number"
            ? { ...node, numberValue: values[node.id] as number }
            : { ...node, value: values[node.id] as boolean }
          : node,
      ),
    };
    snapshot = step(circuit, snapshot, false);
    return snapshot;
  };
  /** One clock pulse: high, then low. */
  const pulse = () => {
    snapshot = step(circuit, snapshot, true);
    snapshot = step(circuit, snapshot, false);
  };
  return { set, pulse, snapshot: () => snapshot };
}

describe("memory demos", () => {
  it("are valid circuits", () => {
    for (const make of [memoryCellDemo, memoryByteDemo, smallRamDemo])
      expect(validateCircuit(make())).toBeTruthy();
  });

  it("writes the cell only while it is selected, and lets it out only on a read", () => {
    const cell = bench(memoryCellDemo());
    cell.set({ data: true, write: true });
    expect(cell.snapshot().values.stored).toBe(false);
    cell.set({ select: true });
    expect(cell.snapshot().values.stored).toBe(true);
    cell.set({ write: false, data: false });
    expect(cell.snapshot().values.stored).toBe(true);
    expect(cell.snapshot().values.out).toBe(false);
    cell.set({ read: true });
    expect(cell.snapshot().values.out).toBe(true);
    cell.set({ select: false });
    expect(cell.snapshot().values.out).toBe(false);
    cell.set({ select: true, write: true });
    expect(cell.snapshot().values.stored).toBe(false);
    expect(cell.snapshot().unstable).toBeFalsy();
  });

  it("writes the typed byte into all eight cells and drives the bus only on a read", () => {
    const byte = bench(memoryByteDemo());
    const stored = () => byte.snapshot().buses?.lanes;
    byte.set({ write: true });
    expect(stored()).toBe(0);
    byte.set({ select: true });
    expect(stored()).toBe(0x2a);
    byte.set({ write: false, data: 0x99 });
    expect(stored()).toBe(0x2a);
    expect(byte.snapshot().buses?.bus).toBe("Z");
    byte.set({ read: true });
    expect(byte.snapshot().buses?.bus).toBe(0x2a);
    byte.set({ select: false });
    expect(byte.snapshot().buses?.bus).toBe("Z");
  });

  it("copies a byte from one address to another through the register, one bus cycle each", () => {
    const ram = bench(smallRamDemo());
    const stored = (id: string) => ram.snapshot().buses?.[`${id}-lanes`];
    // Cycle 1: DATA IN onto the bus, stored at address 0 on the pulse.
    ram.set({ "send-data": true, write: true });
    expect(stored("byte0")).toBe(0);
    ram.pulse();
    expect(stored("byte0")).toBe(0x2a);
    // Cycle 2: address 0 drives the bus, the register loads it.
    ram.set({ "send-data": false, write: false, read: true, load: true });
    expect(ram.snapshot().buses?.bus).toBe(0x2a);
    ram.pulse();
    expect(stored("register")).toBe(0x2a);
    // Cycle 3: the register drives the bus, address 3 stores it.
    ram.set({ read: false, load: false, a0: true, a1: true, "send-register": true, write: true });
    ram.pulse();
    expect(stored("byte3")).toBe(0x2a);
    for (const id of ["byte1", "byte2"]) expect(stored(id)).toBe(0);
    expect(stored("register")).toBe(0x2a);
  });

  it("shows a conflict when two drivers are on at once", () => {
    const ram = bench(smallRamDemo());
    ram.set({ "send-data": true, write: true });
    ram.pulse();
    ram.set({ write: false, "send-data": true, read: true, data: 0x13 });
    expect(ram.snapshot().buses?.bus).toBe("X");
  });
});
