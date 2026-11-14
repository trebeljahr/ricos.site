// Beats between two tones near unison or near an octave, for the octave
// demo. Pure functions.

/**
 * Beats per second between a lower and an upper tone that both carry their
 * second harmonic: near 1 : 1 the two fundamentals beat, near 2 : 1 the
 * upper fundamental beats with the lower tone's second harmonic.
 */
export function beatRate(lowHz: number, highHz: number) {
  return Math.min(Math.abs(highHz - lowHz), Math.abs(highHz - 2 * lowHz));
}

/** Faster than this, beats blur into roughness and nobody can count them. */
export const COUNTABLE_BEATS = 12;

/** Below this the tones count as exactly in tune: not one beat in 20 seconds. */
export const NO_BEATS_BELOW = 0.05;

/** The beat readout. Every ratio gets a word or a number, never a dash. */
export function beatText(rate: number) {
  if (!Number.isFinite(rate)) return "too fast to count";
  if (rate < NO_BEATS_BELOW) return "none";
  if (rate <= COUNTABLE_BEATS) return `${rate.toFixed(1)} per second`;
  return "too fast to count";
}

/**
 * How fast the upper wave seems to drift past the lower one in a scope that
 * starts every frame on the lower wave's period: cycles per second, signed,
 * slowed to `cap` when faster. Zero exactly on 1 : 1 and 2 : 1.
 */
export function scopeDrift(lowHz: number, highHz: number, cap = 3) {
  const ratio = highHz / lowHz;
  const drift = (ratio - Math.round(ratio)) * lowHz;
  return Math.max(-cap, Math.min(cap, drift));
}
