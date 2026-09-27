import { fractionAcross, photoAtFraction } from "src/lib/utils/spectrumScale";
import { describe, expect, it } from "vitest";

// Gold as the real page has it: photos 136 to 601 of 1,950, so index 135 and
// a count of 466.
const gold = { index: 135, count: 466 };

describe("photoAtFraction", () => {
  it("lands at the start of the band on a click at its left edge", () => {
    expect(photoAtFraction(gold, 0)).toBe(135);
  });

  it("lands proportionally inside the band", () => {
    expect(photoAtFraction(gold, 0.25)).toBe(135 + 116);
    expect(photoAtFraction(gold, 0.5)).toBe(135 + 233);
    expect(photoAtFraction(gold, 0.75)).toBe(135 + 349);
  });

  it("stays inside the band at the right edge", () => {
    // Not the first photo of the next band: someone aiming at the end of the
    // golds means the last gold.
    expect(photoAtFraction(gold, 1)).toBe(135 + 465);
    expect(photoAtFraction(gold, 0.9999)).toBe(135 + 465);
  });

  it("clamps a fraction from outside the element", () => {
    expect(photoAtFraction(gold, -3)).toBe(135);
    expect(photoAtFraction(gold, 12)).toBe(135 + 465);
  });

  it("survives a band of one, and one of none", () => {
    // Pink is 3 photographs; a band of 1 is a re-bake away.
    expect(photoAtFraction({ index: 40, count: 1 }, 0)).toBe(40);
    expect(photoAtFraction({ index: 40, count: 1 }, 1)).toBe(40);
    expect(photoAtFraction({ index: 40, count: 0 }, 0.5)).toBe(40);
  });
});

describe("fractionAcross", () => {
  it("reads the position within the element", () => {
    expect(fractionAcross({ left: 100, width: 200 }, 100, 1)).toBe(0);
    expect(fractionAcross({ left: 100, width: 200 }, 200, 1)).toBe(0.5);
    expect(fractionAcross({ left: 100, width: 200 }, 300, 1)).toBe(1);
  });

  it("clamps a pointer outside the element", () => {
    expect(fractionAcross({ left: 100, width: 200 }, 20, 1)).toBe(0);
    expect(fractionAcross({ left: 100, width: 200 }, 900, 1)).toBe(1);
  });

  it("returns the start for a keyboard activation, which has no position", () => {
    // detail 0 is Enter or Space on a focused segment. clientX is 0 there,
    // which without this would read as the far left of the strip.
    expect(fractionAcross({ left: 100, width: 200 }, 0, 0)).toBe(0);
  });

  it("returns the start for a zero-width element rather than dividing by it", () => {
    expect(fractionAcross({ left: 0, width: 0 }, 50, 1)).toBe(0);
  });
});
