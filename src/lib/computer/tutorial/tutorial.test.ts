import { describe, expect, it } from "vitest";
import type { Circuit, Node } from "../logic";
import { feedback } from "./analysis";
import { gradeLevel, gradePassed } from "./grade";
import { levelPorts, levelStart } from "./kit";
import { CATALOG, LEVELS } from "./levels";
import { applyAction, matchReference, nextAction } from "./matcher";
import { isPartRef, partOf } from "./parts";
import type { Level, TutorialContext } from "./types";

const grade = (level: Level, circuit: Circuit) =>
  gradeLevel(circuit, level, levelStart(level).locked, CATALOG.allowed(level));

const gateLevels = LEVELS.filter((level) => level.spec.kind !== "custom");

describe("the ladder", () => {
  it("has unique level ids and part ids", () => {
    expect(new Set(LEVELS.map((level) => level.id)).size).toBe(LEVELS.length);
    const parts = LEVELS.flatMap((level) => (level.makes ? [level.makes.part] : []));
    expect(new Set(parts).size).toBe(parts.length);
  });
  it("only offers parts that an earlier level makes", () => {
    const made = new Set<string>();
    for (const level of LEVELS) {
      for (const ref of level.palette)
        if (isPartRef(ref)) expect(made.has(partOf(ref)), `${level.id} offers ${ref}`).toBe(true);
      if (level.makes) made.add(level.makes.part);
    }
  });
});

describe.each(gateLevels.map((level) => [level.id, level] as const))("level %s", (_, level) => {
  it("passes with its reference solution", () => {
    const result = grade(level, level.reference!());
    if (!gradePassed(result)) console.log(level.id, JSON.stringify(result, null, 1).slice(0, 1500));
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
    let count = 0;
    for (; count < 400; count++) {
      const match = matchReference(circuit, reference, start.locked, CATALOG.gateParts);
      const context: TutorialContext = { circuit, match, passing: false, reference };
      level.steps?.forEach((step, index) => {
        if (step.done(context)) finished.add(index);
      });
      const action = nextAction(circuit, reference, match);
      if (!action) break;
      circuit = applyAction(circuit, action, (ref) => ({ ...ref, id: `mine-${count}` }));
    }
    expect(count).toBeLessThan(400);
    const result = grade(level, circuit);
    expect(gradePassed(result)).toBe(true);
    const match = matchReference(circuit, reference, start.locked, CATALOG.gateParts);
    const context: TutorialContext = { circuit, match, passing: true, reference };
    level.steps?.forEach((step, index) => {
      if (step.done(context)) finished.add(index);
    });
    expect([...finished].sort((a, b) => a - b)).toEqual(
      level.steps?.map((_, index) => index) ?? [],
    );
  });
  it("finds nothing to improve in its reference", () => {
    const start = levelStart(level);
    const reference = level.reference!();
    const result = feedback(reference, level, start.locked, {
      reference,
      known: CATALOG.known(level),
    });
    expect(result.notes.filter((note) => note.tone !== "good")).toEqual([]);
  });
  if (level.makes) {
    it("passes with the built-in part wired straight to its ports", () => {
      const start = levelStart(level);
      const { inputs, outputs } = levelPorts(level);
      const builtIn = level.makes!.builtIn;
      const module = CATALOG.builtInModule(level.makes!.part);
      const part: Node = module
        ? {
            id: "box",
            type: "module",
            module,
            part: level.makes!.part,
            x: 400,
            y: 40,
            label: level.makes!.label,
          }
        : { id: "box", type: (builtIn as { gate: Node["type"] }).gate, x: 400, y: 40 };
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
      // A level's own part is not on its palette, so check the spec without the level's rules.
      const result = gradeLevel(circuit, { ...level, rules: undefined }, start.locked, {
        gates: new Set([part.type]),
        parts: new Set([level.makes!.part]),
      });
      if (!gradePassed(result))
        console.log(level.id, JSON.stringify(result, null, 1).slice(0, 1500));
      expect(gradePassed(result)).toBe(true);
    });
  }
});
