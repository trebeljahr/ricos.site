import { describe, expect, it } from "vitest";
import {
  inputWiring,
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

  for (const style of WIRING_STYLES)
    for (const gate of WIRING_GATES)
      it(`${style} ${gate} draws a wire to everything that reads an input`, () => {
        const schematic = schematicFor(style, gate);
        const { buses, runs, stubX } = inputWiring(schematic);
        const isInput = (net: string) => ["a", "na", "b", "nb"].includes(net);
        const passesThrough = (net: string, x: number, y: number) =>
          runs.some(
            (run) =>
              run.net === net &&
              run.points.some(
                ([x0, y0], index) =>
                  index > 0 &&
                  x0 === x &&
                  run.points[index - 1][0] === x &&
                  Math.min(y0, run.points[index - 1][1]) <= y &&
                  Math.max(y0, run.points[index - 1][1]) >= y,
              ),
          );
        for (const element of schematic.elements) {
          if (element.kind === "res" || !isInput(element.gate)) continue;
          expect(passesThrough(element.gate, stubX[element.id], element.y), element.id).toBe(true);
        }
        for (const run of runs) {
          const bus = buses.find((candidate) => candidate.net === run.net);
          const end = run.points[run.points.length - 1];
          expect(end[1]).toBe(bus?.y);
          expect(end[0]).toBeLessThanOrEqual(bus?.toX ?? 0);
          expect(end[0]).toBeGreaterThanOrEqual(bus?.fromX ?? 0);
        }
        // A stub never lands on another input's wire.
        for (const element of schematic.elements) {
          if (element.kind === "res") continue;
          for (const run of runs)
            if (run.net !== element.gate && run.points[0][0] === stubX[element.id])
              expect(passesThrough(run.net, stubX[element.id], element.y)).toBe(false);
        }
      });

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
