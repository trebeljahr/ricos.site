import languages from "./unicodeMarkLanguages.json";
import { HANGUL_BASE } from "./unicodeText";

export const ZWJ = "‍";
export const VS15 = "︎";
export const VS16 = "️";

export const TONE_BASES = ["👍", "👋", "✋", "🙌", "💪", "🧑", "👩", "👶", "🧙"];
export const TONES = [
  { label: "NONE", mark: "" },
  { label: "\u{1F3FB}", mark: "\u{1F3FB}" },
  { label: "\u{1F3FC}", mark: "\u{1F3FC}" },
  { label: "\u{1F3FD}", mark: "\u{1F3FD}" },
  { label: "\u{1F3FE}", mark: "\u{1F3FE}" },
  { label: "\u{1F3FF}", mark: "\u{1F3FF}" },
];

/** Emoji that fonts draw as one picture when the parts are joined. */
export const JOINED_EMOJI: readonly string[][] = [
  ["👩", "💻"],
  ["🧑", "🚀"],
  ["👨", "🎨"],
  ["🧑", "🔬"],
  ["🏳️", "🌈"],
  ["🏴", "☠️"],
  ["🐻", "❄️"],
  ["❤️", "🔥"],
  ["😮", "💨"],
  ["🐕", "🦺"],
  ["🏃", "♀️"],
  ["🧑", "🤝", "🧑"],
  ["👨", "👩", "👧", "👦"],
];

export const ALPHABET = Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index));
export const FLAG_PRESETS = ["DE", "JP", "BR", "UA", "KE", "IN"];

/** Two regional indicator symbols, which fonts may draw as one flag. */
export function flagText(code: string): string {
  return Array.from(code, (letter) =>
    String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65),
  ).join("");
}

export type NormalForm = "NFC" | "NFD";

export interface MarkScript {
  name: string;
  bases: string[];
  marks: number[];
  /**
   * Marks the script's writing system never puts on one letter together. Each list is
   * a set of rivals: pressing one lifts the others, as interlocked keys do.
   */
  rivals?: number[][];
  /** Marks have one spelling order in this script, so they follow `marks`, not the presses. */
  fixedOrder?: boolean;
  /** The script writes syllables from separate parts, and languages list the parts, not the whole. */
  syllabic?: boolean;
}

export const MARK_SCRIPTS: readonly MarkScript[] = [
  {
    name: "LATIN",
    bases: ["a", "e", "i", "o", "u", "n", "c", "s", "z"],
    marks: [0x301, 0x300, 0x302, 0x308, 0x303, 0x327, 0x323, 0x30a, 0x30c],
  },
  { name: "CYRILLIC", bases: ["и", "е", "у", "а"], marks: [0x306, 0x308, 0x301] },
  { name: "GREEK", bases: ["α", "ε", "ι", "ο", "ω"], marks: [0x301, 0x308, 0x314] },
  {
    name: "KANA",
    bases: ["か", "さ", "た", "は"],
    marks: [0x3099, 0x309a],
    // A kana takes the voiced mark or the half-voiced mark, not both.
    rivals: [[0x3099, 0x309a]],
  },
  {
    name: "ARABIC",
    bases: ["ب", "ت", "ن", "س"],
    marks: [0x651, 0x64e, 0x64f, 0x650, 0x652],
    // One vowel sign or sukun (no vowel) per letter; shadda doubles a consonant that has a vowel.
    rivals: [
      [0x64e, 0x64f, 0x650, 0x652],
      [0x651, 0x652],
    ],
    syllabic: true,
  },
  {
    name: "DEVANAGARI",
    bases: ["क", "न", "म", "र"],
    marks: [0x93f, 0x941, 0x947, 0x94d, 0x902],
    // One vowel sign per consonant; virama removes the vowel, so it excludes vowel signs and anusvara.
    rivals: [
      [0x93f, 0x941, 0x947, 0x94d],
      [0x94d, 0x902],
    ],
    fixedOrder: true,
    syllabic: true,
  },
];

/** Presses or lifts a mark, lifting whatever cannot share a letter with it. */
export function pressMark(script: MarkScript, marks: readonly number[], mark: number): number[] {
  if (marks.includes(mark)) return marks.filter((other) => other !== mark);
  const rivals = (script.rivals ?? []).filter((set) => set.includes(mark)).flat();
  const next = [...marks.filter((other) => !rivals.includes(other)), mark];
  return script.fixedOrder
    ? next.sort((a, b) => script.marks.indexOf(a) - script.marks.indexOf(b))
    : next;
}

export function markedText(base: string, marks: readonly number[], form: NormalForm): string {
  return (base + String.fromCodePoint(...marks)).normalize(form);
}

export const HANGUL_LEADS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ".split("");
export const HANGUL_VOWELS = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ".split("");
export const HANGUL_TAILS = ["—", ..."ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"];

export function hangulCodePoint(lead: number, vowel: number, tail: number): number {
  return HANGUL_BASE + 588 * lead + 28 * vowel + tail;
}

export function hangulText(lead: number, vowel: number, tail: number, form: NormalForm): string {
  return String.fromCodePoint(hangulCodePoint(lead, vowel, tail)).normalize(form);
}

export const STYLE_BASES = ["❤", "☀", "✈", "☎", "✂", "♠", "☺", "✔"];
export const STYLE_SELECTORS = [
  { label: "NONE", mark: "" },
  { label: "VS15", mark: VS15 },
  { label: "VS16", mark: VS16 },
];

function languagesOf(item: string): string[] {
  return (languages as Record<string, string>)[item.normalize("NFC")]?.split(" ") ?? [];
}

/**
 * The languages whose everyday alphabet holds this letter (a CLDR exemplar set). A script
 * that lists parts counts a language only if it lists the base and every mark.
 */
export function languagesWriting(
  script: MarkScript,
  base: string,
  marks: readonly number[],
): string[] {
  if (!script.syllabic) return languagesOf(base + String.fromCodePoint(...marks));
  return marks.reduce((found, mark) => {
    const withMark = languagesOf(String.fromCodePoint(mark));
    return found.filter((code) => withMark.includes(code));
  }, languagesOf(base));
}

/** Languages a reader is likely to recognise come first in a short readout. */
const WELL_KNOWN =
  "en es fr de pt it ru ar hi ja zh ko vi tr pl nl sv cs el uk fa ur bn mr ne sa".split(" ");

const NAMES_SHOWN = 3;

/** A live readout such as "FRENCH · SPANISH · CZECH +62", or null when none has the letter. */
export function languageReadout(codes: readonly string[]): string | null {
  if (codes.length === 0) return null;
  const rank = (code: string) => {
    const index = WELL_KNOWN.indexOf(code);
    return index === -1 ? WELL_KNOWN.length : index;
  };
  const names = new Intl.DisplayNames(["en"], { type: "language" });
  const sorted = [...codes].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  const shown = sorted.slice(0, NAMES_SHOWN).map((code) => (names.of(code) ?? code).toUpperCase());
  const more = sorted.length - shown.length;
  return `${shown.join(" · ")}${more > 0 ? ` +${more}` : ""}`;
}

/** Unicode's list of emoji that are meant to work everywhere. Old browsers lack the regex flag. */
const STANDARD_EMOJI = (() => {
  try {
    // biome-ignore lint/complexity/useRegexLiterals: as a literal, an old browser fails on the whole file
    return new RegExp("^\\p{RGI_Emoji}$", "v");
  } catch {
    return null;
  }
})();

export function isStandardEmoji(text: string): boolean | null {
  return STANDARD_EMOJI ? STANDARD_EMOJI.test(text) : null;
}
