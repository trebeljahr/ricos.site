import { describe, expect, it } from "vitest";
import { analyse, normalise, strokeToPeriod, WAVE_PRESETS, waveAt } from "./harmonics";

const SIZE = 256;
const period = (f: (theta: number) => number) =>
  Array.from({ length: SIZE }, (_, k) => f((2 * Math.PI * k) / SIZE));

describe("taking a wave apart", () => {
  it("finds one harmonic with its amplitude and phase", () => {
    const { amplitudes, phases } = analyse(period((t) => 0.7 * Math.sin(3 * t + 0.4)));
    expect(amplitudes[2]).toBeCloseTo(0.7, 9);
    expect(phases[2]).toBeCloseTo(0.4, 9);
    for (const i of [0, 1, 3, 11]) expect(amplitudes[i]).toBeLessThan(1e-9);
  });

  it("finds 4/(πn) in the odd harmonics of a square wave", () => {
    const { amplitudes } = analyse(period((t) => (t < Math.PI ? 1 : -1)));
    expect(amplitudes[0]).toBeCloseTo(4 / Math.PI, 2);
    expect(amplitudes[2]).toBeCloseTo(4 / (3 * Math.PI), 2);
    expect(amplitudes[1]).toBeLessThan(0.02);
  });

  it("ignores a constant offset", () => {
    const { amplitudes } = analyse(period((t) => 5 + Math.sin(t)));
    expect(amplitudes[0]).toBeCloseTo(1, 9);
  });

  it("rebuilds the wave it took apart", () => {
    const f = (t: number) => Math.sin(t) - 0.5 * Math.sin(2 * t + 1) + 0.25 * Math.cos(5 * t);
    const parts = analyse(period(f));
    for (const t of [0.3, 1.7, 4]) expect(waveAt(parts, t)).toBeCloseTo(f(t), 9);
  });

  it("matches the presets' formulas", () => {
    const saw = analyse(period((t) => waveAt(WAVE_PRESETS.sawtooth, t)));
    expect(saw.amplitudes[3]).toBeCloseTo(1 / 4, 9);
    const triangle = analyse(period((t) => waveAt(WAVE_PRESETS.triangle, t)));
    expect(triangle.amplitudes[2]).toBeCloseTo(1 / 9, 9);
    // A triangle's peak is at a quarter period: Σ 1/n² over odd n with alternating signs add up (π²/8 in the limit).
    expect(waveAt(WAVE_PRESETS.triangle, Math.PI / 2)).toBeGreaterThan(1.18);
  });

  it("scales the strongest harmonic to 1", () => {
    const { harmonics, gain } = normalise({ amplitudes: [0.5, 0.25], phases: [0, 0] });
    expect(harmonics.amplitudes).toEqual([1, 0.5]);
    expect(gain).toBe(0.5);
  });
});

describe("a drawn stroke as one period", () => {
  it("bridges gaps with straight lines and wraps round", () => {
    const samples = strokeToPeriod(
      [
        { x: 0.25, y: 1 },
        { x: 0.75, y: -1 },
      ],
      101,
    );
    expect(samples[25]).toBeCloseTo(1, 9);
    expect(samples[50]).toBeCloseTo(0, 9);
    expect(samples[75]).toBeCloseTo(-1, 9);
    expect(samples[0]).toBeCloseTo(0, 1);
  });

  it("lets a later pass over the same x win, in either direction", () => {
    const samples = strokeToPeriod(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0.5, y: 1 },
      ],
      11,
    );
    expect(samples[5]).toBeCloseTo(1, 9);
    expect(samples[10]).toBeCloseTo(0, 9);
  });

  it("is flat when nothing was drawn", () => {
    expect(strokeToPeriod([], 8)).toEqual(new Array(8).fill(0));
  });
});
