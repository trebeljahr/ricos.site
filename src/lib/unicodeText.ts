import { ASCII_TABLE, graphemes } from "./asciiTable";
import names from "./unicodeNames.json";

/** The last code point Unicode has. */
export const MAX_CODE_POINT = 0x10ffff;
/** How many bits it takes to write any code point. */
export const CODE_POINT_BITS = 21;

export const REPLACEMENT_CHARACTER = 0xfffd;

export function isSurrogate(codePoint: number): boolean {
  return codePoint >= 0xd800 && codePoint <= 0xdfff;
}

/** A surrogate or a number above the code space has no UTF-8 form. */
export function isEncodable(codePoint: number): boolean {
  return codePoint >= 0 && codePoint <= MAX_CODE_POINT && !isSurrogate(codePoint);
}

export function codePointLabel(codePoint: number): string {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
}

export function hexByte(byte: number): string {
  return byte.toString(16).toUpperCase().padStart(2, "0");
}

export function bitString(value: number, width: number): string {
  return value.toString(2).padStart(width, "0");
}

export interface Utf8Row {
  /** How many bytes a code point in this range takes. */
  length: 1 | 2 | 3 | 4;
  first: number;
  last: number;
  /** The byte patterns, with x where a code point bit goes. */
  template: string[];
}

export const UTF8_ROWS: readonly Utf8Row[] = [
  { length: 1, first: 0, last: 0x7f, template: ["0xxxxxxx"] },
  { length: 2, first: 0x80, last: 0x7ff, template: ["110xxxxx", "10xxxxxx"] },
  { length: 3, first: 0x800, last: 0xffff, template: ["1110xxxx", "10xxxxxx", "10xxxxxx"] },
  {
    length: 4,
    first: 0x10000,
    last: MAX_CODE_POINT,
    template: ["11110xxx", "10xxxxxx", "10xxxxxx", "10xxxxxx"],
  },
];

export function utf8Row(codePoint: number): Utf8Row | undefined {
  return isEncodable(codePoint)
    ? UTF8_ROWS.find((row) => codePoint >= row.first && codePoint <= row.last)
    : undefined;
}

/** The bytes of one code point, or nothing when it has no UTF-8 form. */
export function encodeUtf8(codePoint: number): number[] {
  const row = utf8Row(codePoint);
  if (!row) return [];
  if (row.length === 1) return [codePoint];
  const bytes: number[] = [];
  let rest = codePoint;
  for (let index = 1; index < row.length; index++) {
    bytes.unshift(0x80 | (rest & 0x3f));
    rest >>= 6;
  }
  // Ones for the byte count, then a zero, then what is left of the code point.
  bytes.unshift(((0xff00 >> row.length) & 0xff) | rest);
  return bytes;
}

/**
 * Which byte of its UTF-8 form holds a code point bit, counting the lowest bit
 * as 0. Returns null for a bit the code point has no room for in that form.
 */
export function bitHome(codePoint: number, bit: number): number | null {
  const row = utf8Row(codePoint);
  if (!row) return null;
  const payload = row.template.join("").replace(/[^x]/g, "").length;
  if (bit >= payload) return null;
  // A one-byte form keeps seven bits together, so the count of sixes can overshoot.
  return Math.max(0, row.length - 1 - Math.floor(bit / 6));
}

export type ByteRole = "ascii" | "lead2" | "lead3" | "lead4" | "continuation" | "invalid";

/** What a byte announces by its top bits alone. C0, C1 and F5 up can never appear in valid text. */
export function byteRole(byte: number): ByteRole {
  if (byte < 0x80) return "ascii";
  if (byte < 0xc0) return "continuation";
  if (byte < 0xc2) return "invalid";
  if (byte < 0xe0) return "lead2";
  if (byte < 0xf0) return "lead3";
  if (byte < 0xf5) return "lead4";
  return "invalid";
}

/** Splits a byte into the marker bits at its top and the data bits below them. */
export function byteParts(byte: number): { marker: string; data: string } {
  const bits = bitString(byte, 8);
  const zero = bits.indexOf("0");
  // Five ones or more is no pattern at all, so the whole byte is marker.
  const length = zero === -1 || zero > 4 ? 8 : zero + 1;
  return { marker: bits.slice(0, length), data: bits.slice(length) };
}

export interface DecodedRun {
  /** Offset of the first byte. */
  start: number;
  /** Offset after the last byte. */
  end: number;
  /** The character these bytes spell, or null for bytes a decoder must replace with U+FFFD. */
  codePoint: number | null;
}

/** The decoder in the WHATWG Encoding standard, keeping which bytes made which character. */
export function decodeUtf8(bytes: readonly number[], from = 0): DecodedRun[] {
  const runs: DecodedRun[] = [];
  let needed = 0;
  let seen = 0;
  let value = 0;
  let lower = 0x80;
  let upper = 0xbf;
  let start = from;
  for (let index = from; index < bytes.length; index++) {
    const byte = bytes[index];
    if (needed === 0) {
      start = index;
      if (byte < 0x80) {
        runs.push({ start, end: index + 1, codePoint: byte });
      } else if (byte >= 0xc2 && byte <= 0xdf) {
        needed = 1;
        value = byte & 0x1f;
      } else if (byte >= 0xe0 && byte <= 0xef) {
        if (byte === 0xe0) lower = 0xa0;
        if (byte === 0xed) upper = 0x9f;
        needed = 2;
        value = byte & 0xf;
      } else if (byte >= 0xf0 && byte <= 0xf4) {
        if (byte === 0xf0) lower = 0x90;
        if (byte === 0xf4) upper = 0x8f;
        needed = 3;
        value = byte & 0x7;
      } else {
        runs.push({ start, end: index + 1, codePoint: null });
      }
      continue;
    }
    if (byte < lower || byte > upper) {
      runs.push({ start, end: index, codePoint: null });
      needed = seen = 0;
      lower = 0x80;
      upper = 0xbf;
      // This byte broke the character, and it may still start the next one.
      index--;
      continue;
    }
    lower = 0x80;
    upper = 0xbf;
    value = (value << 6) | (byte & 0x3f);
    seen++;
    if (seen === needed) {
      runs.push({ start, end: index + 1, codePoint: value });
      needed = seen = 0;
    }
  }
  if (needed > 0) runs.push({ start, end: bytes.length, codePoint: null });
  return runs;
}

const CONTROL_ALIASES: Record<number, string> = {
  133: "NEXT LINE",
  160: "NO-BREAK SPACE",
};

const HANGUL_LEAD = "G GG N D DD R M B BB S SS  J JJ C K T P H".split(" ");
const HANGUL_VOWEL = "A AE YA YAE EO E YEO YE O WA WAE OE YO U WEO WE WI YU EU YI I".split(" ");
const HANGUL_TAIL = " G GG GS N NJ NH D L LG LM LB LS LT LP LH M B BS S SS NG J C K T P H".split(
  " ",
);

export const HANGUL_BASE = 0xac00;

const SCRIPTS: readonly [RegExp, string][] = [
  [/\p{Script=Latin}/u, "LATIN"],
  [/\p{Script=Greek}/u, "GREEK"],
  [/\p{Script=Cyrillic}/u, "CYRILLIC"],
  [/\p{Script=Armenian}/u, "ARMENIAN"],
  [/\p{Script=Hebrew}/u, "HEBREW"],
  [/\p{Script=Arabic}/u, "ARABIC"],
  [/\p{Script=Devanagari}/u, "DEVANAGARI"],
  [/\p{Script=Bengali}/u, "BENGALI"],
  [/\p{Script=Gujarati}/u, "GUJARATI"],
  [/\p{Script=Tamil}/u, "TAMIL"],
  [/\p{Script=Telugu}/u, "TELUGU"],
  [/\p{Script=Thai}/u, "THAI"],
  [/\p{Script=Tibetan}/u, "TIBETAN"],
  [/\p{Script=Georgian}/u, "GEORGIAN"],
  [/\p{Script=Hangul}/u, "HANGUL"],
  [/\p{Script=Hiragana}/u, "HIRAGANA"],
  [/\p{Script=Katakana}/u, "KATAKANA"],
  [/\p{Script=Han}/u, "HAN"],
  [/\p{Script=Ethiopic}/u, "ETHIOPIC"],
  [/\p{Script=Khmer}/u, "KHMER"],
];

const KINDS: readonly [RegExp, string][] = [
  [/\p{L}/u, "LETTER"],
  [/\p{M}/u, "MARK"],
  [/\p{N}/u, "NUMBER"],
  [/\p{P}/u, "PUNCTUATION"],
  [/\p{S}/u, "SYMBOL"],
  [/\p{Z}/u, "SPACE"],
];

/** The official name where it can be had, else what kind of character it is. */
export function codePointName(codePoint: number): string {
  if (isSurrogate(codePoint)) return "SURROGATE";
  if (!isEncodable(codePoint)) return "NOT IN UNICODE";
  if (codePoint < 0x20 || codePoint === 0x7f) return ASCII_TABLE[codePoint].name.toUpperCase();
  const alias = CONTROL_ALIASES[codePoint];
  if (alias) return alias;
  const named = (names as Record<string, string>)[codePoint.toString(16).toUpperCase()];
  if (named) return named;
  if (codePoint >= HANGUL_BASE && codePoint <= 0xd7a3) {
    const index = codePoint - HANGUL_BASE;
    const lead = HANGUL_LEAD[Math.floor(index / 588)];
    const vowel = HANGUL_VOWEL[Math.floor((index % 588) / 28)];
    return `HANGUL SYLLABLE ${lead}${vowel}${HANGUL_TAIL[index % 28]}`;
  }
  const char = String.fromCodePoint(codePoint);
  if (/\p{Unified_Ideograph}/u.test(char)) {
    return `CJK UNIFIED IDEOGRAPH-${codePoint.toString(16).toUpperCase()}`;
  }
  if (/\p{Co}/u.test(char)) return "PRIVATE USE";
  if (/\p{Cn}/u.test(char)) return "UNASSIGNED";
  if (/\p{Cc}/u.test(char)) return "CONTROL";
  if (/\p{Emoji}/u.test(char)) return "EMOJI";
  const script = SCRIPTS.find(([pattern]) => pattern.test(char))?.[1];
  const kind = KINDS.find(([pattern]) => pattern.test(char))?.[1] ?? "CHARACTER";
  return script ? `${script} ${kind}` : kind;
}

const VARIATION_SELECTORS = { first: 0xfe00, last: 0xfe0f };
const TAGS = { first: 0xe0020, last: 0xe007e };
const INVISIBLE_LABELS: Record<number, string> = {
  32: "SP",
  160: "NBSP",
  173: "SHY",
  8203: "ZWSP",
  8204: "ZWNJ",
  8205: "ZWJ",
  8206: "LRM",
  8207: "RLM",
  8288: "WJ",
  917631: "TAG END",
  65279: "BOM",
};

export interface CodePointFace {
  text: string;
  /** True when the text is a stand-in for a code point with no ink of its own. */
  isLabel: boolean;
}

/** What to draw for a code point on its own, where a mark has no letter to sit on. */
export function codePointFace(codePoint: number): CodePointFace {
  if (!isEncodable(codePoint)) return { text: "—", isLabel: true };
  if (codePoint < 0x20 || codePoint === 0x7f) {
    return { text: ASCII_TABLE[codePoint].label, isLabel: true };
  }
  const label = INVISIBLE_LABELS[codePoint];
  if (label) return { text: label, isLabel: true };
  if (codePoint >= VARIATION_SELECTORS.first && codePoint <= VARIATION_SELECTORS.last) {
    return { text: `VS${codePoint - VARIATION_SELECTORS.first + 1}`, isLabel: true };
  }
  if (codePoint >= TAGS.first && codePoint <= TAGS.last) {
    return { text: `TAG ${String.fromCodePoint(codePoint - 0xe0000)}`, isLabel: true };
  }
  const char = String.fromCodePoint(codePoint);
  if (/\p{M}/u.test(char)) return { text: `◌${char}`, isLabel: false };
  if (/[\p{Z}\p{C}]/u.test(char)) return { text: codePointLabel(codePoint), isLabel: true };
  return { text: char, isLabel: false };
}

export interface CodePointReading {
  codePoint: number;
  hex: string;
  name: string;
  face: CodePointFace;
  bytes: number[];
}

export interface GraphemeReading {
  text: string;
  /** What to draw for the whole cluster. */
  face: CodePointFace;
  codePoints: CodePointReading[];
}

export interface TextReading {
  graphemes: GraphemeReading[];
  codePointCount: number;
  /** Every byte in order, with the index of the cluster it belongs to. */
  bytes: { byte: number; grapheme: number }[];
}

function readCodePoint(codePoint: number): CodePointReading {
  return {
    codePoint,
    hex: codePointLabel(codePoint),
    name: codePointName(codePoint),
    face: codePointFace(codePoint),
    bytes: encodeUtf8(codePoint),
  };
}

/** Text, taken apart into what a reader sees, what Unicode numbers, and what UTF-8 stores. */
export function readText(text: string): TextReading {
  const clusters = graphemes(text).map((cluster) => {
    // A lone surrogate is broken text, and encoders write U+FFFD for it.
    const codePoints = Array.from(cluster, (char) => {
      const codePoint = char.codePointAt(0) ?? 0;
      return readCodePoint(isSurrogate(codePoint) ? REPLACEMENT_CHARACTER : codePoint);
    });
    const face: CodePointFace = /^[\p{Z}\p{C}]+$/u.test(cluster)
      ? codePoints[0].face
      : /^\p{M}/u.test(cluster)
        ? { text: `◌${cluster}`, isLabel: false }
        : { text: cluster, isLabel: false };
    return { text: cluster, face, codePoints };
  });
  return {
    graphemes: clusters,
    codePointCount: clusters.reduce((sum, cluster) => sum + cluster.codePoints.length, 0),
    bytes: clusters.flatMap((cluster, index) =>
      cluster.codePoints.flatMap((point) => point.bytes.map((byte) => ({ byte, grapheme: index }))),
    ),
  };
}

/** Cuts text to a number of code points, and says how many did not fit. */
export function limitCodePoints(text: string, limit: number): { text: string; overflow: number } {
  const points = Array.from(text);
  if (points.length <= limit) return { text, overflow: 0 };
  return { text: points.slice(0, limit).join(""), overflow: points.length - limit };
}

export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}
