import { describe, expect, it } from "vitest";
import { gradeLevel, gradePassed } from "../grade";
import { levelStart } from "../kit";
import { checkLevels } from "../levelSuite";
import { PartCatalog } from "../parts";
import { ARITHMETIC_LEVELS } from "./arithmetic";
import { GATE_LEVELS } from "./gates";
import { MEMORY_LEVELS } from "./memory";
import { dramArrayLevel, flashArrayLevel, MEMORY_TECHNOLOGY_LEVELS } from "./memoryTechnologies";
import { SWITCHING_LEVELS } from "./switching";

describe("DRAM and flash lessons", () =>
  checkLevels(MEMORY_TECHNOLOGY_LEVELS, [
    ...GATE_LEVELS,
    ...ARITHMETIC_LEVELS,
    ...SWITCHING_LEVELS,
    ...MEMORY_LEVELS,
    ...MEMORY_TECHNOLOGY_LEVELS,
  ]));

it("requires the DRAM refresh path and flash global erase path", () => {
  const catalog = new PartCatalog([
    ...GATE_LEVELS,
    ...ARITHMETIC_LEVELS,
    ...SWITCHING_LEVELS,
    ...MEMORY_LEVELS,
    ...MEMORY_TECHNOLOGY_LEVELS,
  ]);
  for (const [level, control] of [
    [dramArrayLevel, "refresh"],
    [flashArrayLevel, "erase"],
  ] as const) {
    const reference = level.reference!();
    const disconnected = {
      ...reference,
      wires: reference.wires.filter((wire) => wire.from !== control),
    };
    const result = gradeLevel(
      disconnected,
      level,
      levelStart(level).locked,
      catalog.allowed(level),
    );
    expect(gradePassed(result), `${level.id} accepted a missing ${control} path`).toBe(false);
  }
});
