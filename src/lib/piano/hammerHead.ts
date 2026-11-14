// What a hammer head does to the sound. A hammer pushes into its covering
// for a moment and springs back; the shorter that moment, the higher the
// partials it can set ringing. Hard wood is in and out in a fraction of a
// millisecond, felt takes several, and felt grows harder the deeper it is
// squeezed, so a fast blow is also a brighter one. Pure functions.

export type HammerCovering = {
  id: string;
  label: string;
  /** Stiffness K and exponent p of the covering: force = K · compression^p (N, mm). */
  stiffness: number;
  exponent: number;
  /** Layers from the wooden core outwards, for drawing: thickness in mm and colour. */
  layers: { mm: number; color: string }[];
};

export const COVERINGS: HammerCovering[] = [
  {
    id: "wood",
    label: "Bare wood",
    stiffness: 9000,
    exponent: 1,
    layers: [],
  },
  {
    id: "leather",
    label: "Leather",
    stiffness: 900,
    exponent: 1.8,
    layers: [
      { mm: 2, color: "#a8794c" },
      { mm: 1.5, color: "#8a5a32" },
    ],
  },
  {
    id: "soft-felt",
    label: "Soft felt",
    stiffness: 22,
    exponent: 2.6,
    layers: [{ mm: 10, color: "#ece6d6" }],
  },
  {
    id: "felt",
    label: "Pressed felt",
    stiffness: 90,
    exponent: 3,
    layers: [
      { mm: 5, color: "#b33a2e" },
      { mm: 8, color: "#f3eee2" },
    ],
  },
];

/** Hammer mass in kg: about a middle-C grand hammer. */
export const HAMMER_MASS = 0.0085;
/** Where the hammer strikes, as a fraction of the string's length from its end. */
export const STRIKE_POINT = 1 / 8;

/**
 * The hammer meets a fixed spring of the covering's law at `speed` m/s.
 * Returns the time it stays in contact (s) and the deepest squeeze (mm).
 */
export function contact(covering: HammerCovering, speed: number) {
  const { time, squeeze } = contactPulse(covering, speed, 0);
  return { time, squeeze };
}

/**
 * The same blow, with the force sampled `samples` times over the contact:
 * the push the string feels, in newtons.
 */
export function contactPulse(covering: HammerCovering, speed: number, samples = 64) {
  const { stiffness: K, exponent: p } = covering;
  const dt = 2e-7;
  let x = 0; // mm
  let v = speed * 1000; // mm/s
  let t = 0;
  let deepest = 0;
  const trace: { t: number; force: number }[] = [];
  // Felt loses some energy on the way out: the force is weaker while it recovers.
  while (t < 0.02) {
    const force = K * Math.max(0, x) ** p * (v < 0 ? 0.75 : 1); // N
    const a = (-force / HAMMER_MASS) * 1000; // mm/s²
    v += a * dt;
    x += v * dt;
    t += dt;
    if (x > deepest) deepest = x;
    if (samples) trace.push({ t, force });
    if (x <= 0 && v < 0) break;
  }
  const force =
    samples && trace.length
      ? Array.from(
          { length: samples },
          (_, i) => trace[Math.floor((i / (samples - 1)) * (trace.length - 1))],
        )
      : [];
  return { time: t, squeeze: deepest, force };
}

/**
 * The size of each standing wave the blow leaves on the string, partial 1 …
 * `count`: the strike point sets which waves can move at all, and the contact
 * time how fast the higher ones fall away.
 */
export function strikeSpectrum(contactTime: number, fundamental: number, count = 24) {
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1;
    const place = Math.abs(Math.sin(n * Math.PI * STRIKE_POINT));
    const ft = n * fundamental * contactTime;
    const pulse = 1 / Math.sqrt(1 + (ft / 0.55) ** 4);
    return (place * pulse) / n;
  });
}

/** The partial number where the spectrum's weight is centred: higher sounds brighter. */
export function brightness(amplitudes: number[]) {
  let sum = 0;
  let weighted = 0;
  amplitudes.forEach((a, i) => {
    sum += a * a;
    weighted += a * a * (i + 1);
  });
  return sum ? weighted / sum : 1;
}

/** The spectrum the mechanism demos strike with: pressed felt at the hammer's speed. */
export function feltStrike(speed: number, fundamental: number, count = 24) {
  const felt = COVERINGS[COVERINGS.length - 1];
  return strikeSpectrum(contact(felt, Math.max(0.1, speed)).time, fundamental, count);
}
