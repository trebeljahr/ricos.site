import { describe, expect, it } from "vitest";
import { gradeLevel, gradePassed } from "../grade";
import { levelStart } from "../kit";
import { checkLevels } from "../levelSuite";
import { PartCatalog } from "../parts";
import { ARITHMETIC_LEVELS } from "./arithmetic";
import { GATE_LEVELS } from "./gates";
import { MEMORY_LEVELS } from "./memory";
import { STORAGE_VARIANT_LEVELS, shiftRegisterLevel, tLatchLevel } from "./storageVariants";
import { SWITCHING_LEVELS } from "./switching";

describe("storage variant lessons", () =>
  checkLevels(STORAGE_VARIANT_LEVELS, [
    ...GATE_LEVELS,
    ...ARITHMETIC_LEVELS,
    ...SWITCHING_LEVELS,
    ...MEMORY_LEVELS,
    ...STORAGE_VARIANT_LEVELS,
  ]));

it("rejects a shift register without its last stage and a T latch without feedback", () => {
  const catalog = new PartCatalog([
    ...GATE_LEVELS,
    ...ARITHMETIC_LEVELS,
    ...SWITCHING_LEVELS,
    ...MEMORY_LEVELS,
    ...STORAGE_VARIANT_LEVELS,
  ]);
  const shift = shiftRegisterLevel.reference!();
  const lastStage = shift.wires.find((wire) => wire.to === "q7")!.from;
  const cutShift = {
    ...shift,
    wires: shift.wires.filter((wire) => wire.to !== lastStage || wire.input !== 1),
  };
  expect(
    gradePassed(
      gradeLevel(
        cutShift,
        shiftRegisterLevel,
        levelStart(shiftRegisterLevel).locked,
        catalog.allowed(shiftRegisterLevel),
      ),
    ),
  ).toBe(false);

  const latch = tLatchLevel.reference!();
  const feedback = latch.wires.find((wire) => wire.to === "q")!.from;
  const cutLatch = {
    ...latch,
    wires: latch.wires.filter(
      (wire) => wire.from !== feedback || wire.to === "q" || wire.to === "nq",
    ),
  };
  expect(
    gradePassed(
      gradeLevel(
        cutLatch,
        tLatchLevel,
        levelStart(tLatchLevel).locked,
        catalog.allowed(tLatchLevel),
      ),
    ),
  ).toBe(false);
});
