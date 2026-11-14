// Waves as sums of harmonics, for the overtones demo: harmonic n has n peaks
// in one period of the fundamental. Building a wave adds them up; taking a
// drawn wave apart finds how much of each it holds (a discrete Fourier
// transform of one period). Pure functions.

/** Harmonic n (1-based) is `amplitudes[n-1] · sin(n·θ + phases[n-1])`. */
export type Harmonics = { amplitudes: number[]; phases: number[] };

export const HARMONIC_COUNT = 12;

const zeros = () => Array.from({ length: HARMONIC_COUNT }, () => 0);

/** The value of the sum of harmonics at θ (radians; one period is 2π). */
export function waveAt({ amplitudes, phases }: Harmonics, theta: number) {
  let y = 0;
  for (let i = 0; i < amplitudes.length; i++) {
    if (amplitudes[i]) y += amplitudes[i] * Math.sin((i + 1) * theta + (phases[i] ?? 0));
  }
  return y;
}

/** Wave shapes the sliders can jump to, written as harmonic amplitudes and phases. */
export const WAVE_PRESETS = {
  pure: { amplitudes: [1, ...zeros().slice(1)], phases: zeros() },
  square: {
    amplitudes: zeros().map((_, i) => (i % 2 === 0 ? 1 / (i + 1) : 0)),
    phases: zeros(),
  },
  sawtooth: {
    // Σ (−1)^(n+1) sin(nθ)/n: every harmonic, the even ones turned upside down.
    amplitudes: zeros().map((_, i) => 1 / (i + 1)),
    phases: zeros().map((_, i) => (i % 2 === 1 ? Math.PI : 0)),
  },
  triangle: {
    // Σ odd n, (−1)^((n−1)/2) sin(nθ)/n².
    amplitudes: zeros().map((_, i) => (i % 2 === 0 ? 1 / ((i + 1) * (i + 1)) : 0)),
    phases: zeros().map((_, i) => (i % 4 === 2 ? Math.PI : 0)),
  },
} satisfies Record<string, Harmonics>;

export type WavePreset = keyof typeof WAVE_PRESETS;

/**
 * One period of a wave from a drawn stroke: `points` are (x 0–1, y) in the
 * order they were drawn; the result has `size` evenly spaced samples. A later
 * stroke over the same x wins, and gaps are bridged with straight lines, the
 * last one wrapping round to the start.
 */
export function strokeToPeriod(points: { x: number; y: number }[], size = 256) {
  const samples = new Array<number | null>(size).fill(null);
  const bin = (x: number) => Math.min(size - 1, Math.max(0, Math.round(x * (size - 1))));
  points.forEach((point, i) => {
    const previous = points[i - 1] ?? point;
    const from = bin(previous.x);
    const to = bin(point.x);
    const steps = Math.abs(to - from);
    for (let s = 0; s <= steps; s++) {
      const t = steps === 0 ? 1 : s / steps;
      samples[from + Math.sign(to - from) * s] = previous.y + (point.y - previous.y) * t;
    }
  });
  const filled = samples.flatMap((v, i) => (v === null ? [] : [i]));
  if (filled.length === 0) return new Array<number>(size).fill(0);
  const out = new Array<number>(size);
  for (let k = 0; k < filled.length; k++) {
    const a = filled[k];
    const b = filled[(k + 1) % filled.length];
    const gap = (b - a + size) % size || size;
    const ya = samples[a] as number;
    const yb = samples[b] as number;
    for (let s = 0; s < gap; s++) out[(a + s) % size] = ya + ((yb - ya) * s) / gap;
  }
  return out;
}

/**
 * How much of harmonics 1 … `count` one period of samples holds: a discrete
 * Fourier transform at those frequencies. The constant offset is left out.
 */
export function analyse(samples: number[], count = HARMONIC_COUNT): Harmonics {
  const size = samples.length;
  const amplitudes: number[] = [];
  const phases: number[] = [];
  for (let n = 1; n <= count; n++) {
    let s = 0;
    let c = 0;
    for (let k = 0; k < size; k++) {
      const theta = (2 * Math.PI * n * k) / size;
      s += samples[k] * Math.sin(theta);
      c += samples[k] * Math.cos(theta);
    }
    s *= 2 / size;
    c *= 2 / size;
    // a·sin(nθ + φ) = a·cos φ·sin nθ + a·sin φ·cos nθ
    amplitudes.push(Math.hypot(s, c));
    phases.push(Math.atan2(c, s));
  }
  return { amplitudes, phases };
}

/** The same wave with its strongest harmonic at 1, and the factor it was divided by. */
export function normalise({ amplitudes, phases }: Harmonics) {
  const peak = Math.max(...amplitudes, 1e-9);
  return { harmonics: { amplitudes: amplitudes.map((a) => a / peak), phases }, gain: peak };
}
