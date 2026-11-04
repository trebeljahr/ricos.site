// The binary-to-seven-segment decoder as two planes of gates: one AND per digit
// over the bits and their inverses, then one OR per bar over those digits.
import { SEGMENTS, segmentBits } from "./segmentNames";

export const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
/** Bit weights, most significant first, the way a binary number is read. */
export const WEIGHTS = [8, 4, 2, 1] as const;

export type Wiring = { weight: number; inverted: boolean };

/** The four inputs a digit's AND gate reads: each bit, or its inverse where the digit has a 0. */
export const digitInputs = (digit: number): Wiring[] =>
  WEIGHTS.map((weight) => ({ weight, inverted: !(digit & weight) }));

/** Whether a rail carries a 1 for this number. */
export const railHigh = (number: number, { weight, inverted }: Wiring) =>
  Boolean(number & weight) !== inverted;

/** The AND plane: which digit lines are high. */
export const digitLines = (number: number) =>
  DIGITS.map((digit) => digitInputs(digit).every((input) => railHigh(number, input)));

/** The OR plane: a bar lights when any digit line wired to it is high. */
export const decodedBars = (number: number) => {
  const lines = digitLines(number);
  return SEGMENTS.map((_, bar) => DIGITS.some((digit) => lines[digit] && segmentBits(digit)[bar]));
};
