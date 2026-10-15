// The checks every tutorial level must pass, as a vitest suite. Each section's
// test file runs it on its own levels, with the levels before it for the part
// catalog. Imported only by test files.
import { describe, expect, it } from "vitest";
import type { Circuit, Node } from "../logic";
import { feedback } from "./analysis";
import { gradeLevel, gradePassed } from "./grade";
import { levelPorts, levelStart } from "./kit";
import { registerCatalog } from "./levels/shared";
import { applyAction, matchReference, nextAction } from "./matcher";
import { isPartRef, PartCatalog, partOf } from "./parts";
import type { Level, TutorialContext } from "./types";

/**
 * Runs the level checks on `levels`. `ladder` is every level up to and
 * including them, in order: the catalog of parts is built from it.
 */
export function checkLevels(levels: readonly Level[], ladder: readonly Level[]) {
  const catalog = new PartCatalog(ladder);
  registerCatalog(catalog);
  const grade = (level: Level, circuit: Circuit) =>
    gradeLevel(circuit, level, levelStart(level).locked, catalog.allowed(level));

  it("offers only parts that an earlier level makes", () => {
    const made = new Set<string>();
    for (const level of ladder) {
      for (const ref of level.palette)
        if (isPartRef(ref)) expect(made.has(partOf(ref)), `${level.id} offers ${ref}`).toBe(true);
      if (level.makes) made.add(level.makes.part);
    }
  });

  const gateLevels = levels.filter((level) => level.spec.kind !== "custom");
  describe.each(gateLevels.map((level) => [level.id, level] as const))("level %s", (_, level) => {
    it("passes with its reference solution", () => {
      const result = grade(level, level.reference!());
      if (!gradePassed(result))
        console.log(level.id, JSON.stringify(result, null, 1).slice(0, 1500));
      expect(gradePassed(result)).toBe(true);
    });
    it("does not pass with its start circuit", () => {
      expect(gradePassed(grade(level, levelStart(level).circuit))).toBe(false);
    });
    it("reaches a passing circuit by pressing Show me, finishing every step", () => {
      const start = levelStart(level);
      const reference = level.reference!();
      let circuit = start.circuit;
      const finished = new Set<number>();
      const markSteps = (passing: boolean) => {
        const match = matchReference(circuit, reference, start.locked, catalog.gateParts);
        const context: TutorialContext = { circuit, match, passing, reference };
        level.steps?.forEach((step, index) => {
          if (step.done(context)) finished.add(index);
        });
        return match;
      };
      let count = 0;
      for (; count < 600; count++) {
        const match = markSteps(false);
        const action = nextAction(circuit, reference, match);
        if (!action) break;
        circuit = applyAction(circuit, action, (ref) => ({ ...ref, id: `mine-${count}` }));
      }
      expect(count).toBeLessThan(600);
      expect(gradePassed(grade(level, circuit))).toBe(true);
      markSteps(true);
      expect([...finished].sort((a, b) => a - b)).toEqual(
        level.steps?.map((_, index) => index) ?? [],
      );
    });
    it("finds nothing to improve in its reference", () => {
      const start = levelStart(level);
      const reference = level.reference!();
      const result = feedback(reference, level, start.locked, {
        reference,
        known: catalog.known(level),
      });
      expect(result.notes.filter((note) => note.tone !== "good")).toEqual([]);
    });
    if (level.makes) {
      it("passes with the built-in part wired straight to its ports", () => {
        const start = levelStart(level);
        const { inputs, outputs } = levelPorts(level);
        const makes = level.makes!;
        const module = catalog.builtInModule(makes.part);
        const part: Node = module
          ? {
              id: "box",
              type: "module",
              module,
              part: makes.part,
              x: 400,
              y: 40,
              label: makes.label,
            }
          : { id: "box", type: (makes.builtIn as { gate: Node["type"] }).gate, x: 400, y: 40 };
        const circuit: Circuit = {
          ...start.circuit,
          nodes: [...start.circuit.nodes, part],
          wires: [
            ...inputs.map((port, input) => ({ id: `in${input}`, from: port.id, to: "box", input })),
            ...outputs.map((port, output) => ({
              id: `out${output}`,
              from: "box",
              output,
              to: port.id,
              input: 0,
            })),
          ],
        };
        // A level's own part is not on its palette: check the spec without the level's rules.
        const result = gradeLevel(circuit, { ...level, rules: undefined }, start.locked, {
          gates: new Set([part.type]),
          parts: new Set([makes.part]),
        });
        if (!gradePassed(result))
          console.log(level.id, JSON.stringify(result, null, 1).slice(0, 1500));
        expect(gradePassed(result)).toBe(true);
      });
    }
  });
}
