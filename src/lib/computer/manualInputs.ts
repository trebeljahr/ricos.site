import type { NumberInputWidth } from "./logic";

/** Reject fractional, exponent, signed, blank, nonfinite and out-of-range input. */
export function decimalInput(text: string, width: NumberInputWidth): number | null {
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  return Number.isSafeInteger(value) && value >= 0 && value < 2 ** width ? value : null;
}
