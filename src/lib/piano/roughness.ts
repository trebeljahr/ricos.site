// Why two notes clash, for the consonance demo: each note is a row of
// harmonics, and two harmonics of different notes rub when they are close
// but not together. The roughness of a pair follows Sethares' fit to Plomp
// and Levelt's measurements; the curve is the sum over every pair.

import { INTERVALS } from "./notes";

/** Harmonics per note, drawn and played. */
export const HARMONIC_COUNT = 8;

/** Amplitudes of harmonics 1 … 8, gently falling. */
export const TONE_HARMONICS = Array.from({ length: HARMONIC_COUNT }, (_, i) => 0.88 ** i);

const D_STAR = 0.24;
const S1 = 0.0207;
const S2 = 18.96;
const B1 = 3.51;
const B2 = 5.75;

/** How far apart two pure tones are, scaled by the ear's critical band at the lower one. */
export function bandDistance(f1: number, f2: number) {
  const s = D_STAR / (S1 * Math.min(f1, f2) + S2);
  return s * Math.abs(f2 - f1);
}

/** Roughness of two pure tones of amplitude 1 at a band distance `x`: 0 together, peak near 0.22, 0 far apart. */
export const roughnessShape = (x: number) => Math.exp(-B1 * x) - Math.exp(-B2 * x);

/** Where `roughnessShape` peaks, and its value there. */
export const SHAPE_PEAK_AT = Math.log(B2 / B1) / (B2 - B1);
export const SHAPE_PEAK = roughnessShape(SHAPE_PEAK_AT);

export function pairRoughness(f1: number, a1: number, f2: number, a2: number) {
  return Math.min(a1, a2) * roughnessShape(bandDistance(f1, f2));
}

/** Frequencies of a note's harmonics. */
export const harmonics = (hz: number, count = HARMONIC_COUNT) =>
  Array.from({ length: count }, (_, i) => hz * (i + 1));

/** Roughness of two notes `ratio` apart, summed over every pair of their harmonics. */
export function toneRoughness(baseHz: number, ratio: number, amplitudes = TONE_HARMONICS) {
  let total = 0;
  for (let i = 0; i < amplitudes.length; i++) {
    for (let j = 0; j < amplitudes.length; j++) {
      total += pairRoughness(
        baseHz * (i + 1),
        amplitudes[i],
        baseHz * ratio * (j + 1),
        amplitudes[j],
      );
    }
  }
  return total;
}

/** The roughness of every interval from unison to an octave, every `step` cents. */
export function roughnessCurve(baseHz: number, amplitudes = TONE_HARMONICS, step = 2) {
  const points: { cents: number; roughness: number }[] = [];
  for (let c = 0; c <= 1200; c += step) {
    points.push({ cents: c, roughness: toneRoughness(baseHz, 2 ** (c / 1200), amplitudes) });
  }
  return points;
}

// ── Ticks that meet, rub, or keep apart ────────────────────────────────────

/** Below this band distance two harmonics count as one: any beating is slower than about one a second. */
export const TOGETHER_BELOW = 0.012;
/** Above this share of the peak roughness, a pair counts as rubbing. */
export const RUBBING_FROM = 0.3;

export type PairState = "together" | "rubbing" | "apart";

/** Whether two harmonics land together, rub, or sit far enough apart; `strength` is 0–1 roughness. */
export function classifyPair(f1: number, f2: number): { state: PairState; strength: number } {
  const x = bandDistance(f1, f2);
  const strength = roughnessShape(x) / SHAPE_PEAK;
  if (x < TOGETHER_BELOW) return { state: "together", strength };
  if (strength >= RUBBING_FROM) return { state: "rubbing", strength };
  return { state: "apart", strength };
}

export type Tick = { harmonic: number; hz: number; state: PairState; strength: number };

/**
 * Each harmonic of both notes, marked "together" when one of the other note's
 * harmonics lands on it, else "rubbing" (with the strongest rub) when one
 * comes close, else "apart".
 */
export function tickStates(baseHz: number, ratio: number, count = HARMONIC_COUNT) {
  const lower = harmonics(baseHz, count);
  const upper = harmonics(baseHz * ratio, count);
  const mark = (own: number[], other: number[]): Tick[] =>
    own.map((hz, i) => {
      let state: PairState = "apart";
      let strength = 0;
      for (const o of other) {
        const pair = classifyPair(hz, o);
        if (pair.state === "together") {
          state = "together";
          break;
        }
        if (pair.state === "rubbing" && pair.strength > strength) {
          state = "rubbing";
          strength = pair.strength;
        }
      }
      return { harmonic: i + 1, hz, state, strength: state === "together" ? 1 : strength };
    });
  return { lower: mark(lower, upper), upper: mark(upper, lower) };
}

// ── The named dips ─────────────────────────────────────────────────────────

const nameOf = (semitones: number) => INTERVALS[semitones].name;

/** The dips the curve labels, once the slider has visited them. */
export const DIPS = [
  { ratio: [6, 5], name: nameOf(3) },
  { ratio: [5, 4], name: nameOf(4) },
  { ratio: [4, 3], name: nameOf(5) },
  { ratio: [3, 2], name: nameOf(7) },
  { ratio: [5, 3], name: nameOf(9) },
  { ratio: [2, 1], name: nameOf(12) },
].map((dip) => ({ ...dip, cents: 1200 * Math.log2(dip.ratio[0] / dip.ratio[1]) }));

/** How close (in cents) the slider must come to a dip to visit it; wide enough that a snapped piano key counts. */
export const VISIT_WITHIN = 20;

/** The dips within reach of `cents`. */
export const dipsAt = (cents: number) =>
  DIPS.filter((dip) => Math.abs(dip.cents - cents) <= VISIT_WITHIN);

/** A slider position, snapped to the twelve piano keys when `snap` is on. */
export const snapCents = (cents: number, snap: boolean) => {
  const c = Math.min(1200, Math.max(0, cents));
  return snap ? Math.round(c / 100) * 100 : c;
};
