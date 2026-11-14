// An ideal string fixed at both ends, for the pluck-a-string demo: its pitch
// from length, tension and mass, the standing waves a pluck splits into, and
// how fast each of them dies away. Pure functions.

/** Fundamental of a string: f = 1/(2L) · √(T/μ). Length in m, tension in N, mass per length in kg/m. */
export function stringFrequency(length: number, tension: number, massPerLength: number) {
  return Math.sqrt(tension / massPerLength) / (2 * length);
}

/**
 * Amplitude of standing wave n (1-based) when a string of `length` is pulled
 * to `height` at distance `at` from one end and let go:
 * b_n = 2h·L² / (π²n²·p(L−p)) · sin(nπp/L). The sign is the phase.
 */
export function modeAmplitude(n: number, at: number, height: number, length = 1) {
  const p = Math.min(0.98 * length, Math.max(0.02 * length, at));
  return (
    ((2 * height * length * length) / (Math.PI * Math.PI * n * n * p * (length - p))) *
    Math.sin((n * Math.PI * p) / length)
  );
}

/** Amplitudes of the first `count` standing waves of a pluck, at `position` 0–1 along the string. */
export function pluckAmplitudes(position: number, height: number, count: number) {
  return Array.from({ length: count }, (_, i) => modeAmplitude(i + 1, position, height, 1));
}

/** Shape of standing wave n at x (0–1): sin(nπx), zero at both ends and at its n − 1 inner nodes. */
export const modeShape = (n: number, x: number) => Math.sin(n * Math.PI * x);

/** Where standing wave n stands still: x = k/n for k = 0 … n. */
export const modeNodes = (n: number) => Array.from({ length: n + 1 }, (_, k) => k / n);

/** The plucked string just before release: two straight lines from the ends to the pull. */
export function triangleAt(x: number, position: number, height: number) {
  return x <= position ? (height * x) / position : (height * (1 - x)) / (1 - position);
}

/** Seconds for standing wave n to fall to 1/e: the higher ones die first. */
export const modeDecay = (n: number, fundamental: number) => fundamental / (1 + 0.5 * (n - 1));

/** How much of standing wave n is left after `t` seconds, 1 at the release. */
export const modeEnvelope = (n: number, t: number, fundamental: number) =>
  Math.exp(-t / modeDecay(n, fundamental));

const FRACTIONS: [number, number][] = [
  [1, 4],
  [1, 3],
  [1, 2],
  [2, 3],
  [3, 4],
  [1, 1],
  [5, 4],
  [4, 3],
  [3, 2],
  [2, 1],
  [9, 4],
  [3, 1],
  [4, 1],
];
const GLYPHS: Record<string, string> = {
  "1/4": "¼",
  "1/3": "⅓",
  "1/2": "½",
  "2/3": "⅔",
  "3/4": "¾",
};

/** A ratio written as "×2", "×½", "×9/4" when it is that simple (within 1%), else "×1.37". */
export function formatRatio(ratio: number) {
  for (const [p, q] of FRACTIONS) {
    if (Math.abs(ratio / (p / q) - 1) < 0.01) {
      return q === 1 ? `×${p}` : `×${GLYPHS[`${p}/${q}`] ?? `${p}/${q}`}`;
    }
  }
  return `×${ratio < 1 ? ratio.toFixed(2) : ratio.toFixed(2).replace(/\.?0+$/, "")}`;
}

/** `value` moved onto the nearest of `targets` when it is within `tolerance` (a fraction) of it. */
export function snapTo(value: number, targets: number[], tolerance: number) {
  for (const target of targets) {
    if (Math.abs(value / target - 1) < tolerance) return target;
  }
  return value;
}
