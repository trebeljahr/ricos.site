import {
  alongBand,
  bandAt,
  mixHex,
  positionInBand,
  segmentGradient,
} from "src/lib/utils/spectrumScale";
import { describe, expect, it } from "vitest";

// Gold as the real page has it: photos 136 to 601 of 1,950, so index 135 and
// a count of 466.
const gold = { index: 135, count: 466 };

describe("positionInBand", () => {
  it("lands at the start of the band at its left edge", () => {
    expect(positionInBand(gold, 0)).toBe(135);
  });

  it("lands proportionally inside the band, between photos too", () => {
    expect(positionInBand(gold, 0.25)).toBe(135 + 116.5);
    expect(positionInBand(gold, 0.5)).toBe(135 + 233);
  });

  it("clamps a fraction from outside the segment", () => {
    expect(positionInBand(gold, -3)).toBe(135);
    expect(positionInBand(gold, 12)).toBe(135 + 466);
  });

  it("survives a band of none", () => {
    expect(positionInBand({ index: 40, count: 0 }, 0.5)).toBe(40);
  });
});

describe("alongBand", () => {
  it("undoes positionInBand, so the marker lands under the pointer", () => {
    for (const along of [0, 0.1, 0.333, 0.5, 0.9, 1]) {
      expect(alongBand(gold, positionInBand(gold, along))).toBeCloseTo(along, 12);
    }
  });

  it("clamps a position outside the band", () => {
    expect(alongBand(gold, 0)).toBe(0);
    expect(alongBand(gold, 5000)).toBe(1);
  });

  it("returns the start for a band of none rather than dividing by it", () => {
    expect(alongBand({ index: 40, count: 0 }, 40)).toBe(0);
  });
});

describe("bandAt", () => {
  const bands = [{ index: 0, count: 19 }, { index: 19, count: 116 }, gold];

  it("finds the band holding a position", () => {
    expect(bandAt(bands, 0)).toBe(0);
    expect(bandAt(bands, 18.9)).toBe(0);
    expect(bandAt(bands, 100)).toBe(1);
    expect(bandAt(bands, 300)).toBe(2);
  });

  it("gives a boundary to the band starting there", () => {
    expect(bandAt(bands, 19)).toBe(1);
    expect(bandAt(bands, 135)).toBe(2);
  });

  it("keeps the end of the sweep in the last band", () => {
    expect(bandAt(bands, 601)).toBe(2);
    expect(bandAt(bands, 9999)).toBe(2);
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
