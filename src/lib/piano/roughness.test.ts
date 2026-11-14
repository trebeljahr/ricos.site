import { describe, expect, it } from "vitest";
import {
  classifyPair,
  DIPS,
  dipsAt,
  roughnessCurve,
  SHAPE_PEAK,
  snapCents,
  tickStates,
  toneRoughness,
} from "./roughness";

const C4 = 261.63;

describe("classifyPair", () => {
  it("calls equal harmonics together", () => {
    expect(classifyPair(523, 523).state).toBe("together");
    // An equal-tempered fifth: 3rd and 2nd harmonics under a hertz apart.
    expect(classifyPair(3 * C4, 2 * C4 * 2 ** (7 / 12)).state).toBe("together");
  });

  it("calls a near miss rubbing, strongest near a quarter of a critical band", () => {
    const pair = classifyPair(523, 545);
    expect(pair.state).toBe("rubbing");
    expect(pair.strength).toBeGreaterThan(0.8);
    expect(pair.strength).toBeLessThanOrEqual(1);
  });

  it("calls far-apart harmonics apart", () => {
    expect(classifyPair(523, 784).state).toBe("apart");
  });
});

describe("tickStates", () => {
  it("lines up every upper harmonic with an even lower one on the octave", () => {
    const { lower, upper } = tickStates(C4, 2);
    expect(upper.slice(0, 4).every((t) => t.state === "together")).toBe(true);
    expect(lower.filter((t) => t.harmonic % 2 === 0).every((t) => t.state === "together")).toBe(
      true,
    );
  });

  it("finds rubbing ticks at a minor second", () => {
    const { lower, upper } = tickStates(C4, 16 / 15);
    expect(lower.some((t) => t.state === "rubbing")).toBe(true);
    expect(upper.some((t) => t.state === "rubbing")).toBe(true);
    expect(upper.some((t) => t.state === "together")).toBe(false);
  });
});

describe("roughness curve", () => {
  const curve = roughnessCurve(C4, undefined, 1);
  const at = (cents: number) => curve[Math.round(cents)].roughness;

  it("dips at every named ratio", () => {
    for (const dip of DIPS.filter((d) => d.cents < 1200)) {
      const c = Math.round(dip.cents);
      expect(at(c), dip.name).toBeLessThan(at(c - 15));
      expect(at(c), dip.name).toBeLessThan(at(c + 15));
    }
    expect(at(1200)).toBeLessThan(at(1185));
  });

  it("is roughest near a semitone and smooth at the fifth", () => {
    expect(toneRoughness(C4, 2 ** (1 / 12))).toBeGreaterThan(3 * toneRoughness(C4, 1.5));
    expect(SHAPE_PEAK).toBeGreaterThan(0);
  });
});

describe("visiting and snapping", () => {
  it("visits a dip from a snapped piano key", () => {
    expect(dipsAt(400).map((d) => d.name)).toEqual(["Major third"]);
    expect(dipsAt(700).map((d) => d.name)).toEqual(["Perfect fifth"]);
    expect(dipsAt(600)).toEqual([]);
  });

  it("snaps to the twelve keys only when asked", () => {
    expect(snapCents(388, true)).toBe(400);
    expect(snapCents(388, false)).toBe(388);
    expect(snapCents(1300, false)).toBe(1200);
  });
});
