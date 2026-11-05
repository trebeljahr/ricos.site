import { describe, expect, it } from "vitest";
import { gradeLevel, gradePassed } from "./grade";
import { compactStart, levelStart } from "./kit";
import { CATALOG, LEVELS } from "./levels";
import { wiredSolution } from "./wiredSolution";

// The CPU levels run real programs for hundreds of ticks.
const SLOW = 120_000;

describe.each(LEVELS.map((level) => [level.id, level] as const))(
  "wiring %s for the reader",
  (_, level) => {
    it(
      "builds a solution that passes every row, tick or program",
      () => {
        const start = levelStart(level);
        const circuit = wiredSolution(level, start);
        expect(circuit, "no stored solution").toBeTruthy();
        const grade = gradeLevel(circuit!, level, start.locked, CATALOG.allowed(level));
        if (grade.kind === "truth") {
          expect(grade.rows.length).toBeGreaterThan(0);
          expect(grade.rows.filter((row) => !row.pass)).toEqual([]);
        } else if (grade.kind === "sequence") {
          expect(grade.ticks.length).toBeGreaterThan(0);
          expect(grade.ticks.filter((tick) => !tick.pass)).toEqual([]);
        }
        expect(grade.kind === "structure" ? grade.problems : []).toEqual([]);
        expect(gradePassed(grade)).toBe(true);
      },
      SLOW,
    );

    it("also solves the phone layout, whose locked parts start elsewhere", () => {
      const start = compactStart(levelStart(level));
      const circuit = wiredSolution(level, start)!;
      expect(start.enforce(circuit)).toBe(circuit);
    });
  },
);
