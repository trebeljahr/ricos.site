import { describe, expect, it } from "vitest";
import { checkLevels } from "./levelSuite";
import { LEVELS } from "./levels";

describe("the whole ladder", () => {
  it("has unique level ids and part ids", () => {
    expect(new Set(LEVELS.map((level) => level.id)).size).toBe(LEVELS.length);
    const parts = LEVELS.flatMap((level) => (level.makes ? [level.makes.part] : []));
    expect(new Set(parts).size).toBe(parts.length);
  });
  checkLevels([], LEVELS);
});
