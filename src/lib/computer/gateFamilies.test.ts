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
    ["bjt", "xor", 6, 9],
    ["nmos", "nand", 2, 1],
    ["nmos", "xor", 6, 3],
    ["pass", "not", 4, 0],
    ["pass", "nand", 6, 0],
    ["tgate", "not", 6, 0],
    ["tgate", "nand", 8, 0],
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

  it("counts the current of the inverters a loaded XOR needs", () => {
    const idle = (a: boolean, b: boolean) =>
      solveWiring(schematicFor("nmos", "xor"), "nmos", a, b).idleAmps;
    // Neither inverter draws current, and the Ā·B̄ pair pulls the output low through the load.
    expect(idle(false, false)).toBeCloseTo(1e-4);
    // A's inverter conducts, and the output is high with no path through the load.
    expect(idle(true, false)).toBeCloseTo(1e-4);
    // Both inverters conduct, and the A·B pair pulls the output low through the load.
    expect(idle(true, true)).toBeCloseTo(3e-4);
  });

  it("drives a NOT from rails when it is wired as pass transistors, with the same weak high", () => {
    expect(solveWiring(schematicFor("pass", "not"), "pass", false, false).outputVolts).toBeCloseTo(
      0.7,
    );
    expect(
      solveWiring(schematicFor("tgate", "not"), "tgate", false, false).outputVolts,
    ).toBeCloseTo(1);
    expect(solveWiring(schematicFor("tgate", "not"), "tgate", true, false).outputVolts).toBe(0);
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
