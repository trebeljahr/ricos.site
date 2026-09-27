import {
  fractionAcross,
  mixHex,
  photoAtFraction,
  segmentGradient,
} from "src/lib/utils/spectrumScale";
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

describe("mixHex", () => {
  it("returns the endpoints unchanged", () => {
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 1)).toBe("#ffffff");
  });

  it("blends per channel", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mixHex("#ff0000", "#0000ff", 0.5)).toBe("#800080");
  });

  it("clamps a fraction from outside the range", () => {
    expect(mixHex("#102030", "#405060", -1)).toBe("#102030");
    expect(mixHex("#102030", "#405060", 5)).toBe("#405060");
  });

  it("falls back to the first colour rather than emitting nonsense", () => {
    expect(mixHex("rebeccapurple", "#ffffff", 0.5)).toBe("rebeccapurple");
    expect(mixHex("#abc", "#ffffff", 0.5)).toBe("#abc");
  });
});

describe("segmentGradient", () => {
  it("meets its neighbours at a shared colour", () => {
    // Gold between orange and green: the stop it ends on has to be the stop
    // green begins on, or the seam is visible.
    const goldEnd = mixHex("#c9a227", "#4f7a3a", 0.5);
    const greenStart = mixHex("#c9a227", "#4f7a3a", 0.5);
    expect(goldEnd).toBe(greenStart);
    expect(segmentGradient("#c9a227", "#c2662a", "#4f7a3a")).toBe(
      `linear-gradient(to right, ${mixHex("#c2662a", "#c9a227", 0.5)}, #c9a227 50%, ${goldEnd})`,
    );
  });

  it("holds its own colour at the ends of the strip", () => {
    expect(segmentGradient("#a8322b", null, "#c2662a")).toContain("#a8322b, #a8322b 50%");
    expect(segmentGradient("#2b2926", "#8c8c88", null)).toContain("#2b2926 50%, #2b2926)");
  });
});
