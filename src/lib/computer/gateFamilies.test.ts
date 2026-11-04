import { describe, expect, it } from "vitest";
import {
  partCounts,
  schematicFor,
  solveWiring,
  WIRING_GATES,
  WIRING_STYLES,
  type WiringGate,
} from "./gateFamilies";

const TRUTH: Record<WiringGate, (a: boolean, b: boolean) => boolean> = {
  not: (a) => !a,
  nand: (a, b) => !(a && b),
  and: (a, b) => a && b,
  xor: (a, b) => a !== b,
};
const PAIRS = [
  [false, false],
  [false, true],
  [true, false],
  [true, true],
] as const;

describe("gate wirings", () => {
  for (const style of WIRING_STYLES)
    for (const gate of WIRING_GATES) {
      const schematic = schematicFor(style, gate);
      if (!schematic) continue;
      it(`${style} ${gate} matches its truth table`, () => {
        for (const [a, b] of PAIRS)
          expect(solveWiring(schematic, style, a, b).output, `A=${a} B=${b}`).toBe(
            TRUTH[gate](a, b),
          );
      });
    }

  it.each([
    ["bjt", "not", 1, 2],
    ["bjt", "nand", 2, 3],
    ["bjt", "and", 2, 3],
    ["nmos", "not", 1, 1],
    ["nmos", "and", 3, 2],
    ["cmos", "not", 2, 0],
    ["cmos", "nand", 4, 0],
    ["cmos", "and", 6, 0],
    ["cmos", "xor", 12, 0],
    ["pass", "and", 4, 0],
    ["pass", "xor", 6, 0],
    ["tgate", "and", 5, 0],
    ["tgate", "xor", 8, 0],
  ] as const)(
    "%s %s has %i transistors and %i resistors",
    (style, gate, transistors, resistors) => {
      expect(partCounts(style, gate)).toEqual({ transistors, resistors });
    },
  );

  it("burns steady current only in the resistor styles", () => {
    const low = (style: "bjt" | "nmos" | "cmos") =>
      solveWiring(schematicFor(style, "not")!, style, true, false);
    expect(low("bjt").idleAmps).toBeCloseTo(5e-3 + 430e-6);
    expect(low("nmos").idleAmps).toBeCloseTo(1e-4);
    expect(low("cmos").idleAmps).toBe(0);
    expect(low("cmos").outputVolts).toBe(0);
  });

  it("loses a threshold through a lone NMOS and keeps the full level through a transmission gate", () => {
    const high = (style: "pass" | "tgate") =>
      solveWiring(schematicFor(style, "and")!, style, true, true).outputVolts;
    expect(high("pass")).toBeCloseTo(0.7);
    expect(high("tgate")).toBeCloseTo(1);
  });

  it("gives Ben Eater's BJT AND an emitter-follower drop and a clean low", () => {
    const schematic = schematicFor("bjt", "and")!;
    expect(solveWiring(schematic, "bjt", true, true).outputVolts).toBeCloseTo(4.3);
    expect(solveWiring(schematic, "bjt", true, false).outputVolts).toBe(0);
  });
});
