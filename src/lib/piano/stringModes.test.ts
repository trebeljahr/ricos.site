import { describe, expect, it } from "vitest";
import {
  formatRatio,
  modeAmplitude,
  modeEnvelope,
  modeNodes,
  modeShape,
  pluckAmplitudes,
  snapTo,
  stringFrequency,
  triangleAt,
} from "./stringModes";

describe("string frequency", () => {
  const mu = 0.0026;
  const f = stringFrequency(0.8, 80, mu);

  it("follows f = 1/(2L)·√(T/μ)", () => {
    expect(f).toBeCloseTo(Math.sqrt(80 / mu) / 1.6, 9);
  });

  it("goes up an octave when the length halves or the tension quadruples", () => {
    expect(stringFrequency(0.4, 80, mu) / f).toBeCloseTo(2, 9);
    expect(stringFrequency(0.8, 320, mu) / f).toBeCloseTo(2, 9);
  });
});

describe("standing waves of a pluck", () => {
  it("add up to the plucked triangle", () => {
    const amps = pluckAmplitudes(0.3, 0.5, 400);
    for (const x of [0.1, 0.3, 0.55, 0.9]) {
      const sum = amps.reduce((s, b, i) => s + b * modeShape(i + 1, x), 0);
      expect(sum).toBeCloseTo(triangleAt(x, 0.3, 0.5), 2);
    }
  });

  it("matches b_n = 2hL²/(π²n²p(L−p))·sin(nπp/L) for any length", () => {
    const h = 0.01;
    const L = 0.65;
    const p = 0.2;
    const expected =
      ((2 * h * L * L) / (Math.PI ** 2 * 9 * p * (L - p))) * Math.sin((3 * Math.PI * p) / L);
    expect(modeAmplitude(3, p, h, L)).toBeCloseTo(expected, 12);
    expect(modeAmplitude(3, p / L, h, 1)).toBeCloseTo(expected, 12);
  });

  it("leaves out the even modes when plucked in the middle", () => {
    const amps = pluckAmplitudes(0.5, 1, 8);
    for (const n of [2, 4, 6, 8]) expect(Math.abs(amps[n - 1])).toBeLessThan(1e-12);
    expect(Math.abs(amps[0])).toBeGreaterThan(Math.abs(amps[2]));
  });

  it("holds more of the high modes when plucked near the end", () => {
    const share = (p: number) => {
      const amps = pluckAmplitudes(p, 1, 8).map(Math.abs);
      return amps.slice(3).reduce((a, b) => a + b, 0) / amps[0];
    };
    expect(share(0.05)).toBeGreaterThan(3 * share(0.5));
  });

  it("puts mode n's nodes at k/n, where it stands still", () => {
    expect(modeNodes(3)).toEqual([0, 1 / 3, 2 / 3, 1]);
    for (const x of modeNodes(4)) expect(Math.abs(modeShape(4, x))).toBeLessThan(1e-12);
  });

  it("lets the higher modes die first", () => {
    expect(modeEnvelope(1, 0, 2)).toBe(1);
    expect(modeEnvelope(5, 1, 2)).toBeLessThan(modeEnvelope(2, 1, 2));
  });
});

describe("ratio readouts", () => {
  it("writes simple ratios as fractions", () => {
    expect(formatRatio(0.5)).toBe("×½");
    expect(formatRatio(2)).toBe("×2");
    expect(formatRatio(2.25)).toBe("×9/4");
    expect(formatRatio(1)).toBe("×1");
    expect(formatRatio(1.37)).toBe("×1.37");
    expect(formatRatio(0.61)).toBe("×0.61");
  });

  it("snaps only within the tolerance", () => {
    expect(snapTo(0.405, [0.4, 0.8], 0.015)).toBe(0.4);
    expect(snapTo(0.42, [0.4, 0.8], 0.015)).toBe(0.42);
  });
});
