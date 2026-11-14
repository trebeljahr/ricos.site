import { describe, expect, it } from "vitest";
import { beatRate, beatText, scopeDrift } from "./beats";

describe("beatRate", () => {
  it("is zero exactly on unison and on the octave", () => {
    expect(beatRate(220, 220)).toBe(0);
    expect(beatRate(220, 440)).toBe(0);
  });

  it("counts the gap to the nearer of unison and octave", () => {
    expect(beatRate(220, 223)).toBeCloseTo(3);
    expect(beatRate(220, 436)).toBeCloseTo(4);
    expect(beatRate(220, 445)).toBeCloseTo(5);
  });
});

describe("beatText", () => {
  it("says none on the octave, a rate near it, and never a dash", () => {
    expect(beatText(beatRate(220, 440))).toBe("none");
    expect(beatText(beatRate(220, 442.2))).toBe("2.2 per second");
    expect(beatText(beatRate(220, 330))).toBe("too fast to count");
    for (let r = 1; r <= 2.2; r += 0.0005) {
      const text = beatText(beatRate(220, 220 * r));
      expect(text).not.toMatch(/^[–—-]$/);
      expect(text.length).toBeGreaterThan(0);
    }
  });
});

describe("scopeDrift", () => {
  it("stands still on whole ratios and crawls, capped, between them", () => {
    expect(scopeDrift(220, 440)).toBe(0);
    expect(scopeDrift(220, 441)).toBeCloseTo(1);
    expect(scopeDrift(220, 439)).toBeCloseTo(-1);
    expect(Math.abs(scopeDrift(220, 330))).toBe(3);
  });
});
