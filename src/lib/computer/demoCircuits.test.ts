import { describe, expect, it } from "vitest";
import type { BigScreenCard } from "./bigScreenBlocks";
import { toNumber } from "./blockBuilder";
import { screenRows } from "./datapathBlocks";
import {
  adderDemo,
  DEVICE_KINDS,
  deviceDemo,
  routingDemo,
  switchLampDemo,
  transistorDemo,
} from "./demoCircuits";
import {
  type Circuit,
  initialSnapshot,
  moduleInputs,
  moduleOutputs,
  step,
  validateCircuit,
} from "./logic";

const read = (circuit: Circuit, inputs: Record<string, boolean>) =>
  step(circuit, initialSnapshot(), false, {}, inputs);
const bits = (prefix: string, value: number, width: number) =>
  Object.fromEntries(
    Array.from({ length: width }, (_, bit) => [`${prefix}${bit}`, Boolean(value & (1 << bit))]),
  );

function busBench(kind: (typeof DEVICE_KINDS)[number]) {
  let circuit = deviceDemo(kind);
  let snapshot = step(circuit, initialSnapshot(), false);
  const setBus = (address: number, data: number, write: boolean, re = false) => {
    circuit = {
      ...circuit,
      nodes: circuit.nodes.map((node) =>
        node.id === "address"
          ? { ...node, numberValue: address }
          : node.id === "data"
            ? { ...node, numberValue: data }
            : node.id === "we"
              ? { ...node, value: write }
              : node.id === "re"
                ? { ...node, value: re }
                : node,
      ),
    };
    snapshot = step(circuit, snapshot, false);
  };
  const cycle = () => {
    snapshot = step(circuit, snapshot, true);
    snapshot = step(circuit, snapshot, false);
  };
  return {
    circuit,
    snapshot: () => snapshot,
    store: (address: number, data: number) => {
      setBus(address, data, true);
      cycle();
      setBus(address, data, false);
    },
    read: (address: number) => {
      setBus(address, 0, false);
      return toNumber(snapshot.outputs.read);
    },
    cycle,
    setBus,
  };
}

describe("chapter circuits", () => {
  it("runs every lamp path through native transistor contacts", () => {
    const outputs = {
      single: (a: boolean, _b: boolean) => a,
      series: (a: boolean, b: boolean) => a && b,
      parallel: (a: boolean, b: boolean) => a || b,
      not: (a: boolean, _b: boolean) => !a,
      nand: (a: boolean, b: boolean) => !(a && b),
      nor: (a: boolean, b: boolean) => !(a || b),
      xor: (a: boolean, b: boolean) => a !== b,
      xnor: (a: boolean, b: boolean) => a === b,
    };
    for (const wiring of Object.keys(outputs) as (keyof typeof outputs)[]) {
      const circuit = switchLampDemo(wiring);
      expect(validateCircuit(circuit)).toBeTruthy();
      expect(
        circuit.nodes.filter((node) => node.type === "nmos" || node.type === "pmos"),
      ).toHaveLength(
        wiring === "single" || wiring === "not" ? 1 : wiring === "xor" || wiring === "xnor" ? 4 : 2,
      );
      for (const a of [false, true])
        for (const b of [false, true]) {
          expect(read(circuit, { a, b }).values.lamp).toBe(outputs[wiring](a, b));
        }
    }
  });
  it("uses real XOR/AND and full-adder wiring for every input row", () => {
    for (const kind of ["sum", "half", "full", "boxed-full"] as const) {
      const circuit = adderDemo(kind);
      expect(validateCircuit(circuit)).toBeTruthy();
      for (let row = 0; row < (kind.includes("full") ? 8 : 4); row++) {
        const a = Boolean(row & 1),
          b = Boolean(row & 2),
          cin = Boolean(row & 4);
        const total = Number(a) + Number(b) + Number(cin);
        const snapshot = read(circuit, { a, b, cin });
        expect(snapshot.values.sum).toBe(Boolean(total & 1));
        if (kind !== "sum") expect(snapshot.values.carry).toBe(total >= 2);
      }
    }
  });

  it("propagates carry through the same eight full-adder modules as the lab", () => {
    const source = adderDemo("byte");
    expect(validateCircuit(source)).toBeTruthy();
    for (const [a, b, cin] of [
      [13, 29, 0],
      [255, 1, 0],
      [100, 200, 0],
      [255, 255, 1],
    ]) {
      const circuit = {
        ...source,
        nodes: source.nodes.map((node) =>
          node.id === "a"
            ? { ...node, numberValue: a }
            : node.id === "b"
              ? { ...node, numberValue: b }
              : node,
        ),
      };
      const snapshot = read(circuit, { cin: Boolean(cin) });
      const out = moduleOutputs(circuit).map((node) => snapshot.values[node.id]);
      expect(toNumber(out.slice(0, 8))).toBe((a + b + cin) & 255);
      expect(out[8]).toBe(a + b + cin > 255);
    }
  });

  it("runs every CMOS gate through the editor's transistor networks", () => {
    const truth = {
      not: (a: boolean, _b: boolean) => !a,
      nand: (a: boolean, b: boolean) => !(a && b),
      nor: (a: boolean, b: boolean) => !(a || b),
      and: (a: boolean, b: boolean) => a && b,
      or: (a: boolean, b: boolean) => a || b,
      xor: (a: boolean, b: boolean) => a !== b,
      xnor: (a: boolean, b: boolean) => a === b,
    };
    for (const gate of Object.keys(truth) as (keyof typeof truth)[]) {
      const circuit = transistorDemo(gate);
      const counts = { not: 2, nand: 4, nor: 4, and: 6, or: 6, xor: 16, xnor: 18 };
      expect(
        circuit.nodes.filter((node) => node.type === "nmos" || node.type === "pmos"),
      ).toHaveLength(counts[gate]);
      expect(validateCircuit(circuit)).toBeTruthy();
      for (let row = 0; row < 4; row++) {
        const a = Boolean(row & 1),
          b = Boolean(row & 2);
        const snapshot = read(circuit, { a, b });
        expect(snapshot.values.out).toBe(truth[gate](a, b));
      }
    }
  });

  it("decodes all addresses and routes all four-bit data patterns", () => {
    const decoder = routingDemo("decoder"),
      mux = routingDemo("mux");
    for (let address = 0; address < 4; address++) {
      const decoded = read(decoder, bits("a", address, 2));
      for (let line = 0; line < 4; line++)
        expect(decoded.values[`y${line}`]).toBe(line === address);
      for (let pattern = 0; pattern < 16; pattern++) {
        const selected = read(mux, { ...bits("a", address, 2), ...bits("d", pattern, 4) });
        expect(selected.values.out).toBe(Boolean(pattern & (1 << address)));
      }
    }
  });

  it("writes only the selected RAM cell, retains it on reads and supports clearing a bit", () => {
    const circuit = routingDemo("memory");
    let snapshot = initialSnapshot();
    const tick = (address: number, data: boolean, we: boolean) => {
      const inputs = { ...bits("a", address, 4), data, we };
      snapshot = step(circuit, snapshot, false, {}, inputs);
      snapshot = step(circuit, snapshot, true, {}, inputs);
      snapshot = step(circuit, snapshot, false, {}, inputs);
      return snapshot.values.read;
    };
    for (const address of [0, 6, 15]) tick(address, true, true);
    for (let address = 0; address < 16; address++)
      expect(tick(address, false, false)).toBe([0, 6, 15].includes(address));
    expect(tick(6, false, true)).toBe(false);
    expect(tick(15, false, false)).toBe(true);
  });
});

describe("device demos on the CPU memory bus", () => {
  it.each(DEVICE_KINDS)("keeps %s editable and serializable as an ordinary circuit", (kind) => {
    const circuit = deviceDemo(kind);
    expect(validateCircuit(JSON.parse(JSON.stringify(circuit)))).toBeTruthy();
    expect(moduleInputs(circuit).some((node) => node.id === "clock")).toBe(true);
    expect(
      circuit.nodes.some((node) => node.behaviour === "screen8x8" || node.behaviour === "vram8x8"),
    ).toBe(true);
  });

  it("stores screen bytes through F0–F7 and preserves neighbours when plotting through F8–FA", () => {
    const bench = busBench("pixel");
    bench.store(0xf3, 0x81);
    expect(screenRows(bench.snapshot().blocks!.screen)[3]).toBe(0x81);
    bench.store(0xf8, 3);
    bench.store(0xf9, 3);
    bench.store(0xfa, 1);
    expect(bench.read(0xf3)).toBe(0x89);
    bench.store(0xfa, 0);
    expect(bench.read(0xf3)).toBe(0x81);
  });

  it("selects bank windows and advances the same VRAM port as the CPU", () => {
    const bench = busBench("vram");
    bench.store(0xd8, 5);
    bench.store(0xd0, 0x3c);
    expect(bench.read(0xd0)).toBe(0x3c);
    bench.store(0xd8, 0);
    expect(bench.read(0xd0)).toBe(0);
    bench.store(0xd9, 127);
    bench.store(0xdb, 0);
    bench.store(0xda, 0xa5);
    const card = bench.snapshot().blocks!["big-screen"] as BigScreenCard;
    expect(card.bytes[127]).toBe(0xa5);
    expect(card.portAddr).toBe(0);
  });

  it("runs the blitter from command writes while the bus is idle", () => {
    const bench = busBench("blitter");
    bench.store(0xe1, 3);
    bench.store(0xe2, 0xa5);
    bench.store(0xe4, 2);
    for (let i = 0; i < 3; i++) bench.cycle();
    expect(bench.read(0xf3)).toBe(0xa5);
  });

  it("runs the big blitter on the actual screen card", () => {
    const bench = busBench("big-blitter");
    bench.store(0xdc, 46);
    bench.store(0xdd, 0xa5);
    bench.store(0xde, 0);
    bench.store(0xdf, 1);
    for (let i = 0; i < 3; i++) bench.cycle();
    const card = bench.snapshot().blocks!["big-screen"] as BigScreenCard;
    expect(card.bytes[46]).toBe(0xa5);
  });

  it("clocks the scanout and monitor from the same VRAM as the screen writes", () => {
    const bench = busBench("scanout");
    bench.store(0xf0, 0xff);
    for (let i = 0; i < 200; i++) bench.cycle();
    const monitor = bench.snapshot().blocks!.monitor as { bytes: number[] };
    expect(monitor.bytes[0]).toBe(0xff);
    expect(bench.snapshot().blocks!.scanout).toBeTruthy();
  });
});
