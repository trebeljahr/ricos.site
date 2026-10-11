// Engine for the switch and codebook demos of chapter 1.1. A pattern is the
// row of switches read left to right, "1" for on and "0" for off.

export const MIN_SWITCHES = 1;
export const MAX_SWITCHES = 8;

/** One meaning per state, in counting order: index 0 belongs to "00". */
export type Codebook = readonly string[];

/** The two-switch example from the chapter text. */
export const SEED_CODEBOOK: Codebook = [
  "Hello",
  "How are you?",
  "Fine, what about you?",
  "Good. Nice to see you",
];

/** A second agreement for the same four states, for the mismatch demo. */
export const ALTERNATE_CODEBOOK: Codebook = [
  "Goodbye",
  "I am hungry",
  "Pizza or pasta?",
  "Pizza. Always pizza",
];

export type Speaker = "a" | "b";

/** The conversation from the chapter: the two take turns setting the switches. */
export const CONVERSATION: readonly { pattern: string; speaker: Speaker }[] = [
  { pattern: "00", speaker: "a" },
  { pattern: "01", speaker: "b" },
  { pattern: "10", speaker: "a" },
  { pattern: "11", speaker: "b" },
];

export function clampSwitches(switches: number): number {
  return Math.min(MAX_SWITCHES, Math.max(MIN_SWITCHES, Math.trunc(switches)));
}

/** Each added switch doubles the count: 2^n. */
export function stateCount(switches: number): number {
  return 2 ** switches;
}

export function formatPattern(index: number, switches: number): string {
  return index.toString(2).padStart(switches, "0");
}

export function patternIndex(pattern: string): number {
  return Number.parseInt(pattern, 2);
}

/** Every state of n switches in counting order: 00, 01, 10, 11. */
export function allPatterns(switches: number): string[] {
  return Array.from({ length: stateCount(switches) }, (_, index) => formatPattern(index, switches));
}

/** Flips the switch at `position`, counted from the left. */
export function flipSwitch(pattern: string, position: number): string {
  if (position < 0 || position >= pattern.length) return pattern;
  const flipped = pattern[position] === "1" ? "0" : "1";
  return pattern.slice(0, position) + flipped + pattern.slice(position + 1);
}

/** A new switch joins on the right, switched off. */
export function addSwitch(pattern: string): string {
  return pattern.length >= MAX_SWITCHES ? pattern : `${pattern}0`;
}

/** The rightmost switch leaves; the last one stays. */
export function removeSwitch(pattern: string): string {
  return pattern.length <= MIN_SWITCHES ? pattern : pattern.slice(0, -1);
}

/** What a pattern means under a codebook, or null when the book has no entry. */
export function lookup(codebook: Codebook, pattern: string): string | null {
  const meaning = codebook[patternIndex(pattern)]?.trim();
  return meaning ? meaning : null;
}

/** Whether two codebooks read the same meaning out of one pattern. */
export function sameMeaning(first: Codebook, second: Codebook, pattern: string): boolean {
  return lookup(first, pattern) === lookup(second, pattern);
}

export function withMeaning(codebook: Codebook, pattern: string, meaning: string): string[] {
  const next = [...codebook];
  next[patternIndex(pattern)] = meaning;
  return next;
}
