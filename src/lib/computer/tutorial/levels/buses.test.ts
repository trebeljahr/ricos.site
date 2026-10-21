import { describe, expect, it } from "vitest";
import { feedback } from "../analysis";
import { gradeLevel, gradePassed } from "../grade";
import { levelStart } from "../kit";
import { checkLevels } from "../levelSuite";
import { BUS_LEVELS, busEnableLevel, sharedBusLevel } from "./buses";
import { GATE_LEVELS } from "./gates";
import { CATALOG } from "./index";

describe("bus construction", () => {
  checkLevels(BUS_LEVELS, [...GATE_LEVELS, ...BUS_LEVELS]);

  for (const level of [busEnableLevel, sharedBusLevel]) {
    it(`${level.id} grades the native bus and rejects missing or bypassed enables`, () => {
      const grade = (circuit: ReturnType<NonNullable<typeof level.reference>>) =>
        gradeLevel(circuit, level, levelStart(level).locked, CATALOG.allowed(level));
      const reference = level.reference!();
      expect(gradePassed(grade(reference))).toBe(true);
      expect(feedback(reference, level, levelStart(level).locked).notes).toEqual([]);
      expect(gradePassed(grade(levelStart(level).circuit))).toBe(false);
      const bypass = {
        ...reference,
        wires: reference.wires.map((wire) =>
          wire.from === "drive-a" && wire.to === "net" ? { ...wire, from: "merge-a" } : wire,
        ),
      };
      expect(gradePassed(grade(bypass))).toBe(false);
      const unconnected = {
        ...reference,
        wires: reference.wires.filter((wire) => wire.to !== "drive-a" || wire.input !== 1),
      };
      expect(gradePassed(grade(unconnected))).toBe(false);
    });
  }

  it("checks equal enabled drivers separately from contention", () => {
    if (sharedBusLevel.spec.kind !== "custom") throw new Error("custom bus spec");
    const result = sharedBusLevel.spec.grade(sharedBusLevel.reference!());
    expect(result.pass).toBe(true);
    // Wiring both enables to A wrongly drives both sources when A alone is selected.
    const wrong = sharedBusLevel.reference!();
    expect(
      sharedBusLevel.spec.grade({
        ...wrong,
        wires: wrong.wires.map((wire) => (wire.from === "eb" ? { ...wire, from: "ea" } : wire)),
      }).pass,
    ).toBe(false);
  });
});
