import { describe, expect, it } from "vitest";
import {
  type Circuit,
  initialSnapshot,
  inputCount,
  inputLabel,
  moduleInputs,
  moduleOutputs,
  outputCount,
  step,
  validateCircuit,
} from "./logic";
import { compileNetlist, NetlistSim } from "./netlist";
import { simulationCircuit } from "./blockFolding";
import { recognizeCircuitSync, verifiedCircuitIdentity } from "./recognition";
import {
  ADD3,
  BCD_DECODER,
  DIGIT_COUNTS,
  SEGMENTS,
  add3Circuit,
  bcdDecoderCircuit,
  bcdSegmentDemo,
  binaryBits,
  decimalBits,
  decimalConversionCircuit,
  decimalSegmentDemo,
  rawSegmentDemo,
  segmentBits,
} from "./sevenSegment";
import { DISPLAY_LEVELS, decimalRows } from "./tutorial/levels/displays";
import { CATALOG } from "./tutorial/levels";
import { gradeLevel, gradePassed } from "./tutorial/grade";
import { levelStart } from "./tutorial/kit";
const netDisplay = (c: Circuit, id: string) => {
  const netlist = compileNetlist(c);
  const sim = new NetlistSim(netlist);
  sim.step(false);
  return Array.from({ length: inputCount(c.nodes.find((n) => n.id === id)!) }, (_, input) => {
    const wire = c.wires.find((w) => w.to === id && w.input === input)!;
    return sim.bit(netlist.nodes.get(wire.from)![wire.output ?? 0]);
  });
};
const run = (c: Circuit, n: number) => {
  const overrides = Object.fromEntries(
    moduleInputs(c).map((p, i) => [p.id, Boolean(n & (2 ** i))]),
  );
  const s = step(c, initialSnapshot(), false, {}, overrides);
  expect(s.unstable).toBe(false);
  return moduleOutputs(c).map((p) => Boolean(s.values[p.id]));
};
// Independent canonical patterns in a,b,c,d,e,f,g order.
const patterns = [
  "1111110",
  "0110000",
  "1101101",
  "1111001",
  "0110011",
  "1011011",
  "1011111",
  "1110000",
  "1111111",
  "1111011",
];
it("raw bars are independent for every combination", () => {
  const c = rawSegmentDemo();
  for (let n = 0; n < 128; n++) {
    const s = step(
      c,
      initialSnapshot(),
      false,
      {},
      Object.fromEntries(SEGMENTS.map((p, i) => [p, Boolean(n & (2 ** i))])),
    );
    expect(s.outputs.digit).toEqual(binaryBits(n, 7));
  }
});
it("all ten glyphs and invalid BCD agree in gate, registered, nested and netlist forms", () => {
  const c = bcdDecoderCircuit();
  expect(recognizeCircuitSync(c, c.ports!, "bcd-seven-segment").status).toBe("equivalent");
  expect(verifiedCircuitIdentity(BCD_DECODER)?.component.symbol).toBe("decoder");
  for (let n = 0; n < 16; n++) {
    const expected = (patterns[n] ?? "0000000").split("").map((x) => x === "1");
    expect(run(c, n)).toEqual(expected);
    const demo = bcdSegmentDemo();
    demo.nodes = demo.nodes.map((p) => (p.id === "number" ? { ...p, numberValue: n } : p));
    expect(step(demo, initialSnapshot(), false).outputs.digit).toEqual(expected);
    expect(netDisplay(demo, "digit")).toEqual(expected);
  }
});
it("add-three gates implement all sixteen rows", () => {
  for (let n = 0; n < 16; n++)
    expect(run(add3Circuit(), n)).toEqual(binaryBits(n < 5 ? n : (n + 3) % 16, 4));
  expect(verifiedCircuitIdentity(ADD3)).not.toBeNull();
});
describe.each(DIGIT_COUNTS)("%i digit banks", (digits) => {
  it("converts all eight-bit inputs and wide boundaries/spread cases", () => {
    const byte = decimalConversionCircuit(8, digits);
    for (let n = 0; n < 256; n++) expect(run(byte, n)).toEqual(decimalBits(n, digits));
    const wide = decimalConversionCircuit(14, digits);
    for (const row of decimalRows(14)) {
      const n = row.reduce((v, b, i) => v + (b ? 2 ** i : 0), 0);
      expect(run(wide, n)).toEqual(decimalBits(n, digits));
    }
  });
  it("saves, exposes ordered pins, and agrees with unfolded gates and flattened netlist", () => {
    const demo = decimalSegmentDemo(digits, 14);
    expect(validateCircuit(JSON.parse(JSON.stringify(demo)))).not.toBeNull();
    const display = { id: "raw", type: "sevensegment" as const, digits, x: 0, y: 0 };
    expect(inputCount(display)).toBe(digits * 7);
    expect(outputCount(display)).toBe(0);
    expect(inputLabel(display, 0)).toBe(digits === 1 ? "a" : "units a");
    expect(inputLabel(display, digits * 7 - 1)).toBe(
      digits === 1 ? "g" : `${["units", "tens", "hundreds", "thousands"][digits - 1]} g`,
    );
    for (const n of [9, 10, 99, 100, 255, 9999, 10000, 16383]) {
      const c = {
        ...demo,
        nodes: demo.nodes.map((p) => (p.id === "number" ? { ...p, numberValue: n } : p)),
      };
      const expected = Array.from({ length: digits }, (_, d) =>
        segmentBits(Math.floor(n / 10 ** d) % 10),
      ).flat();
      const closed = step(c, initialSnapshot(), false);
      expect(
        Array.from({ length: digits }, (_, d) => closed.modules.digits.outputs[`raw${d}`]).flat(),
      ).toEqual(expected);
      expect(closed.values.overflow).toBe(n >= 10 ** digits);
      const opened = simulationCircuit(
        c,
        new Set([
          "decimal",
          "digits",
          ...Array.from({ length: digits }, (_, d) => `digits/decode${d}`),
        ]),
      );
      expect(
        Array.from(
          { length: digits },
          (_, d) => step(opened, initialSnapshot(), false).modules.digits.outputs[`raw${d}`],
        ).flat(),
      ).toEqual(expected);
      const netlist = compileNetlist(c);
      const sim = new NetlistSim(netlist);
      sim.step(false);
      expect(
        Array.from({ length: digits }, (_, d) =>
          netlist.nodes.get(`digits/decode${d}`)!.map((net) => sim.bit(net)),
        ).flat(),
      ).toEqual(expected);
    }
  });
});
it("14-bit range validation leaves input4/input8 ranges unchanged", () => {
  for (const [type, max] of [
    ["input4", 15],
    ["input8", 255],
    ["input14", 16383],
  ] as const) {
    const c: Circuit = {
      name: "source",
      wires: [],
      nodes: [{ id: "source", type, numberValue: max, x: 0, y: 0 }],
    };
    expect(validateCircuit(c)).not.toBeNull();
    expect(step(c, initialSnapshot(), false).outputs.source.every(Boolean)).toBe(true);
    expect(validateCircuit({ ...c, nodes: [{ ...c.nodes[0], numberValue: max + 1 }] })).toBeNull();
  }
});
it.each(DISPLAY_LEVELS)("grades $id and rejects unfinished construction", (level) => {
  const start = levelStart(level);
  expect(
    gradePassed(gradeLevel(level.reference!(), level, start.locked, CATALOG.allowed(level))),
  ).toBe(true);
  expect(gradePassed(gradeLevel(start.circuit, level, start.locked, CATALOG.allowed(level)))).toBe(
    false,
  );
  expect(level.hints?.every((h) => !h.when)).toBe(true);
});
