import { describe, expect, it } from "vitest";
import { LEVELS } from "./index";

const sentences = (text: string) => text.match(/[.!?](\s|$)/g)?.length ?? 0;

describe.each(LEVELS.map((level) => [level.id, level] as const))("text of %s", (_, level) => {
  it("states its goal in one short line", () => {
    expect(level.goal.length).toBeLessThanOrEqual(95);
    expect(sentences(level.goal)).toBe(1);
    expect(level.goal).not.toMatch(/\bCheck\b|\bhint/i);
  });

  it("keeps an intro to two short sentences", () => {
    if (!level.intro) return;
    expect(level.intro.length).toBeLessThanOrEqual(150);
    expect(sentences(level.intro)).toBeLessThanOrEqual(2);
  });

  it("ends its hints with the idea of the wiring in one plain sentence", () => {
    const last = level.hints?.at(-1);
    expect(last?.title).toBe("Last hint");
    expect(sentences(last!.text)).toBe(1);
    expect(last!.text.length).toBeLessThanOrEqual(175);
    // A named stage for every gate is the connection list this hint replaced.
    expect(last!.text).not.toMatch(/\bG\d\b|=|→/);
    expect(level.hints!.filter((hint) => hint.title === "Last hint")).toHaveLength(1);
  });

  it("never sends the reader to a Check button", () => {
    for (const hint of level.hints ?? [])
      expect(hint.text).not.toMatch(/\bRun Check\b|press Check/i);
  });
});
