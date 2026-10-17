/** Reject fractional, exponent, signed, blank, nonfinite and out-of-range input. */
export function decimalInput(text: string, width: 4 | 8): number | null {
  if (!/^\d+$/.test(text)) return null;
  const value = Number(text);
  return Number.isSafeInteger(value) && value >= 0 && value < 2 ** width ? value : null;
}
