// Engine for the letter codebook demo of chapter 1.1: five switches, 32 states
// and one character per state. Patterns are read as in codebook.ts.

import { displayRejected, graphemes } from "./asciiTable";
import { formatPattern } from "./codebook";

export const LETTER_SWITCHES = 5;
export const LETTER_STATES = 2 ** LETTER_SWITCHES;

/** How many characters the typer holds. */
export const LETTER_TYPER_LIMIT = 24;

/** One character per state, in counting order: index 0 belongs to "00000". */
export type LetterCodebook = readonly string[];

/**
 * All switches off is the space, then the alphabet counts up from 00001, as in
 * the chapter's "0000001 is A". Five states are left for punctuation.
 */
export const SEED_LETTER_CODEBOOK: LetterCodebook = Array.from(" ABCDEFGHIJKLMNOPQRSTUVWXYZ.,?!'");

export function letterPattern(state: number): string {
  return formatPattern(state, LETTER_SWITCHES);
}

/** What a key or tile shows for a character: itself, or SP for the space. */
export function letterLabel(char: string): string {
  return char === " " ? "SP" : char;
}

/** A character as a screen reader says it. */
export function letterName(char: string): string {
  return char === " " ? "space" : char;
}

// Phone keyboards type these in place of the plain apostrophe.
const STRAIGHT: Record<string, string> = { "‘": "'", "’": "'" };

/**
 * The state a typed character lands on, or -1. A letter the codebook holds in
 * one case only is found by its other case, a curly apostrophe by the plain one.
 */
export function stateOf(codebook: LetterCodebook, char: string): number {
  if (char === "") return -1;
  const candidates = [char, char.toUpperCase(), char.toLowerCase(), STRAIGHT[char]];
  for (const candidate of candidates) {
    if (candidate === undefined) continue;
    const state = codebook.indexOf(candidate);
    if (state !== -1) return state;
  }
  return -1;
}

export interface LetterFilterResult {
  /** The characters the codebook can encode, as the codebook writes them, cut to the limit. */
  text: string;
  /** Each refused character once, in the order it first appeared. */
  rejected: string[];
  /** Each character that was typed in the case the codebook lacks, with what it became. */
  folded: [typed: string, kept: string][];
  /** How many characters did not fit. */
  overflow: number;
}

/** Keeps what the codebook can encode from typed or pasted text and reports the rest. */
export function filterLetters(
  input: string,
  codebook: LetterCodebook,
  limit: number = LETTER_TYPER_LIMIT,
): LetterFilterResult {
  const kept: string[] = [];
  const rejected: string[] = [];
  const folded: [string, string][] = [];
  for (const grapheme of graphemes(input)) {
    // A line break or a tab is a gap between words, like the space.
    const typed = /^\s+$/.test(grapheme) ? " " : grapheme;
    const state = stateOf(codebook, typed);
    if (state === -1) {
      const shown = typed === " " ? "SPACE" : displayRejected(typed);
      if (!rejected.includes(shown)) rejected.push(shown);
      continue;
    }
    const char = codebook[state];
    if (char !== typed && !folded.some(([from]) => from === typed)) folded.push([typed, char]);
    kept.push(char);
  }
  return {
    text: kept.slice(0, limit).join(""),
    rejected,
    folded,
    overflow: Math.max(0, kept.length - limit),
  };
}

export interface LetterReading {
  char: string;
  label: string;
  /** Null when the character has lost its state since it was typed. */
  state: number | null;
  /** Five bits, most significant first. */
  bits: string | null;
}

/** One reading per character of the text. */
export function letterReadings(text: string, codebook: LetterCodebook): LetterReading[] {
  return graphemes(text).map((char) => {
    const state = codebook.indexOf(char);
    return {
      char,
      label: letterLabel(char),
      state: state === -1 ? null : state,
      bits: state === -1 ? null : letterPattern(state),
    };
  });
}

/**
 * The character a keystroke puts in a state's field, or null when it changes
 * nothing. A state always keeps one character, so an emptied field changes nothing.
 */
export function typedCharacter(previous: string, value: string): string | null {
  const parts = graphemes(value);
  const old = parts.indexOf(previous);
  if (old !== -1) parts.splice(old, 1);
  const [typed] = parts;
  if (typed === undefined) return null;
  const char = /^\s+$/.test(typed) ? " " : typed;
  return char === previous ? null : char;
}

export interface LetterEdit {
  codebook: string[];
  /** The character that was in the state before. */
  replaced: string;
  /** True when the new character came from another state and the two traded places. */
  swapped: boolean;
}

/**
 * Puts a character in a state. A character has one state: one that is already
 * in the codebook trades places with the character it replaces.
 */
export function assignCharacter(codebook: LetterCodebook, state: number, char: string): LetterEdit {
  const next = [...codebook];
  const replaced = next[state];
  const from = next.indexOf(char);
  if (from !== -1) next[from] = replaced;
  next[state] = char;
  return { codebook: next, replaced, swapped: from !== -1 && from !== state };
}

/** The same characters on other states. */
export function shuffled(codebook: LetterCodebook, random: () => number = Math.random): string[] {
  const next = [...codebook];
  for (let index = next.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [next[index], next[other]] = [next[other], next[index]];
  }
  return next;
}
