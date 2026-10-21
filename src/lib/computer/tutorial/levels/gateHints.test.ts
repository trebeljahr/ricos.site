import { describe, expect, it } from "vitest";
import { evalGate } from "../../gateLogic";
import { gateBlueprint, initialSnapshot, type LogicGate, step } from "../../logic";
import { gateConstructionHints } from "./gateHints";
import { andLevel, norLevel, notLevel, orLevel, xorLevel } from "./gates";
import { UNIVERSAL_GATE_LEVELS } from "./universalGates";

const COUNTS = {
  nand: { not: 1, and: 2, or: 3, nor: 4, xor: 4, xnor: 5 },
  nor: { not: 1, and: 3, or: 2, nand: 4, xor: 5, xnor: 4 },
} as const;

describe("requested gate construction hints", () => {
  for (const family of ["nand", "nor"] as const) {
    for (const [name, expected] of Object.entries(COUNTS[family])) {
      const target = name as LogicGate;
      it(`${target} from ${family} has staged hints matching its real primitive construction`, () => {
        const hints = gateConstructionHints(family, target);
        const reference = gateBlueprint(target, family);
        const gates = reference.nodes.filter((node) => node.type === family);
        expect(gates).toHaveLength(expected);
        expect(hints.map((hint) => hint.title)).toEqual(["Core idea", "Gate count", "Signal plan"]);
        expect(hints[1].text).toBe(
          `One construction uses ${expected} ${family.toUpperCase()} ${expected === 1 ? "gate" : "gates"}.`,
        );
        expect(hints.every((hint) => hint.when === undefined)).toBe(true);
        expect(hints[2].anchor).toBeUndefined();
        // A learner following only the disclosed plan gets the right truth table.
        const stages = [
          ...hints[2].text.matchAll(/(G\d+) = (NAND|NOR)\((A|B|G\d+), (A|B|G\d+)\)/g),
        ];
        expect(stages).toHaveLength(expected);
        const output = hints[2].text.match(/Connect (G\d+) to OUT/)![1];
        for (const a of [false, true])
          for (const b of [false, true]) {
            const signals: Record<string, boolean> = { A: a, B: b };
            for (const [, name, operation, left, right] of stages) {
              expect(left in signals && right in signals).toBe(true);
              signals[name] = evalGate(
                operation.toLowerCase() as LogicGate,
                signals[left],
                signals[right],
              );
            }
            expect(signals[output]).toBe(evalGate(target, a, b));
          }
        expect(
          UNIVERSAL_GATE_LEVELS.find((level) => level.id === `universal-${family}-${target}`)
            ?.hints,
        ).toEqual(hints);
      });
    }
  }

  it("distinguishes the equality stage of NOR XOR from its final difference output", () => {
    const reference = gateBlueprint("xor", "nor");
    const stages = reference.nodes.filter((node) => node.type === "nor");
    for (const a of [false, true])
      for (const b of [false, true]) {
        const snapshot = step(reference, initialSnapshot(), false, {}, { a, b });
        expect(snapshot.values[stages[0].id]).toBe(!a && !b);
        expect(snapshot.values[stages[3].id]).toBe(a === b);
        expect(snapshot.values.out).toBe(a !== b);
      }
    const hints = gateConstructionHints("nor", "xor");
    expect(hints[0].text).toContain("equality");
    expect(hints[0].text).toContain("final NOR");
  });

  it("provides the same NAND-only guidance on the ladder while qualifying earned-part block counts", () => {
    expect(notLevel.hints).toEqual(gateConstructionHints("nand", "not"));
    for (const level of [andLevel, orLevel, xorLevel, norLevel]) {
      expect(level.hints).toEqual(
        gateConstructionHints("nand", level.id as LogicGate, { reusableParts: true }),
      );
      expect(level.hints![1].text).toContain(
        "reusable earned parts can reduce the visible block count",
      );
    }
  });
});
