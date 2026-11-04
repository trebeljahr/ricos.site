/** Pin names and digit shapes of a seven-segment display, kept free of imports so logic.ts can use them. */
export const SEGMENTS = ["a", "b", "c", "d", "e", "f", "g"] as const;
export const DIGIT_COUNTS = [1, 2, 3, 4] as const;
export type DigitCount = (typeof DIGIT_COUNTS)[number];
export const PLACES = ["units", "tens", "hundreds", "thousands"] as const;
const GLYPHS = [
  "abcdef",
  "bc",
  "abdeg",
  "abcdg",
  "bcfg",
  "acdfg",
  "acdefg",
  "abc",
  "abcdefg",
  "abcdfg",
];
/** Which bars a–g light for a digit. Anything but 0–9 lights none. */
export const segmentBits = (digit: number): boolean[] =>
  SEGMENTS.map((s) => (GLYPHS[digit] ?? "").includes(s));
/** Bars a–g as x, y, width, height on a display 84 wide and 146 tall. */
export const SEGMENT_BARS = [
  [18, 5, 48, 9],
  [67, 17, 9, 48],
  [67, 76, 9, 48],
  [18, 127, 48, 9],
  [7, 76, 9, 48],
  [7, 17, 9, 48],
  [18, 66, 48, 9],
] as const;
