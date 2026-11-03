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
}

export const MARK_SCRIPTS: readonly MarkScript[] = [
  {
    name: "LATIN",
    bases: ["a", "e", "i", "o", "u", "n", "c", "s", "z"],
    marks: [0x301, 0x300, 0x302, 0x308, 0x303, 0x327, 0x323, 0x30a, 0x30c],
  },
  { name: "CYRILLIC", bases: ["и", "е", "у", "а"], marks: [0x306, 0x308, 0x301] },
  { name: "GREEK", bases: ["α", "ε", "ι", "ο", "ω"], marks: [0x301, 0x308, 0x314] },
  { name: "KANA", bases: ["か", "さ", "た", "は"], marks: [0x3099, 0x309a] },
  { name: "ARABIC", bases: ["ب", "ت", "ن", "س"], marks: [0x64e, 0x64f, 0x650, 0x651, 0x652] },
  { name: "DEVANAGARI", bases: ["क", "न", "म", "र"], marks: [0x93f, 0x941, 0x947, 0x94d, 0x902] },
];

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
