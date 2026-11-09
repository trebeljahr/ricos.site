// Physics for the sound demos: an ideal plucked string, and how rough two
// tones sound together. Pure functions.

/**
 * Mode amplitudes of an ideal string plucked at `position` (0–1 along it) to
 * `height`: b_n = 2h / (n² π² p (1 − p)) · sin(nπp). The sign is the phase.
 */
export function pluckModes(position: number, height: number, count: number) {
  const p = Math.min(0.98, Math.max(0.02, position));
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    return ((2 * height) / (n * n * Math.PI * Math.PI * p * (1 - p))) * Math.sin(n * Math.PI * p);
  });
}

/** Decay time of mode n (1-based) relative to the fundamental's: high modes die first. */
export const modeDecay = (n: number) => 1 / (1 + 0.6 * (n - 1));

/** Displacement of the string at x (0–1) and time t, for modes with the given amplitudes. */
export function stringAt(modes: number[], x: number, t: number, frequency: number, decay: number) {
  let y = 0;
  for (let i = 0; i < modes.length; i++) {
    const n = i + 1;
    const envelope = Math.exp(-t / (decay * modeDecay(n)));
    y +=
      modes[i] * Math.sin(n * Math.PI * x) * Math.cos(2 * Math.PI * n * frequency * t) * envelope;
  }
  return y;
}

// ── Roughness (sensory dissonance) ─────────────────────────────────────────
// Sethares' fit to Plomp and Levelt's measurements: two pure tones beat and
// sound rough when they are close, most of all about a quarter of a critical
// band apart, and smooth again once they are far apart.

const D_STAR = 0.24;
const S1 = 0.0207;
const S2 = 18.96;
const B1 = 3.51;
const B2 = 5.75;

export function pairRoughness(f1: number, a1: number, f2: number, a2: number) {
  const low = Math.min(f1, f2);
  const s = D_STAR / (S1 * low + S2);
  const diff = Math.abs(f2 - f1);
  return Math.min(a1, a2) * (Math.exp(-B1 * s * diff) - Math.exp(-B2 * s * diff));
}

/** Roughness of two harmonic tones, `ratio` apart, with partial amplitudes `spectrum`. */
export function intervalRoughness(base: number, ratio: number, spectrum: number[]) {
  let total = 0;
  for (let i = 0; i < spectrum.length; i++) {
    if (!spectrum[i]) continue;
    for (let j = 0; j < spectrum.length; j++) {
      if (!spectrum[j]) continue;
      total += pairRoughness(base * (i + 1), spectrum[i], base * ratio * (j + 1), spectrum[j]);
    }
  }
  return total;
}

/** The roughness curve over one octave and a bit, sampled every `step` cents. */
export function roughnessCurve(base: number, spectrum: number[], maxCents = 1250, step = 2) {
  const points: { cents: number; roughness: number }[] = [];
  for (let c = 0; c <= maxCents; c += step) {
    points.push({ cents: c, roughness: intervalRoughness(base, 2 ** (c / 1200), spectrum) });
  }
  return points;
}

/** Local minima of a sampled curve, deepest first, ignoring the unison. */
export function curveDips(points: { cents: number; roughness: number }[], minCents = 60) {
  const dips: { cents: number; roughness: number; depth: number }[] = [];
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    if (p.cents < minCents) continue;
    if (p.roughness <= points[i - 1].roughness && p.roughness < points[i + 1].roughness) {
      // Depth: how far the curve rises within 60 cents on either side.
      const window = points.filter((q) => Math.abs(q.cents - p.cents) <= 60);
      const rise = Math.min(
        Math.max(...window.filter((q) => q.cents < p.cents).map((q) => q.roughness)),
        Math.max(...window.filter((q) => q.cents > p.cents).map((q) => q.roughness)),
      );
      dips.push({ ...p, depth: rise - p.roughness });
    }
  }
  return dips.sort((a, b) => b.depth - a.depth);
}

/** The simplest fraction p/q (q ≤ maxDenominator) within `tolerance` cents of a ratio. */
export function simpleRatio(ratio: number, tolerance = 12, maxDenominator = 12) {
  let best: [number, number] | null = null;
  let bestError = Number.POSITIVE_INFINITY;
  for (let q = 1; q <= maxDenominator; q++) {
    const p = Math.round(ratio * q);
    const error = Math.abs(1200 * Math.log2(p / q / ratio));
    if (
      error <= tolerance &&
      (best === null || p + q < best[0] + best[1] || error < bestError - 3)
    ) {
      if (best === null || p + q <= best[0] + best[1]) {
        best = [p, q];
        bestError = error;
      }
    }
  }
  if (!best) return null;
  const g = gcd(best[0], best[1]);
  return [best[0] / g, best[1] / g] as [number, number];
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

// ── Spectra ────────────────────────────────────────────────────────────────

export const SPECTRA: { id: string; label: string; amplitudes: number[] }[] = [
  { id: "sine", label: "Pure tone", amplitudes: [1] },
  {
    id: "saw",
    label: "All harmonics",
    amplitudes: Array.from({ length: 12 }, (_, i) => 1 / (i + 1)),
  },
  {
    id: "odd",
    label: "Odd harmonics",
    amplitudes: Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? 1 / (i + 1) : 0)),
  },
  {
    id: "piano",
    label: "Piano-like",
    amplitudes: [1, 0.62, 0.42, 0.3, 0.22, 0.12, 0.09, 0.07, 0.05, 0.04, 0.03, 0.02],
  },
];
