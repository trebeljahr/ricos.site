/** Pin names of a raw seven-segment display, kept free of imports so logic.ts can use them. */
export const SEGMENTS = ["a", "b", "c", "d", "e", "f", "g"] as const;
export const DIGIT_COUNTS = [1, 2, 3, 4] as const;
export type DigitCount = (typeof DIGIT_COUNTS)[number];
export const PLACES = ["units", "tens", "hundreds", "thousands"] as const;
