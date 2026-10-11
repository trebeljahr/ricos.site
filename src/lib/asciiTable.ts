import { asciiCharacter, byteBits } from "./byteInterpretations";

export interface AsciiEntry {
  /** 0 to 127. */
  code: number;
  /** What a cell or tile shows: the character, SP for space, or a control abbreviation. */
  label: string;
  name: string;
  /** The character itself, or null for a control character. */
  char: string | null;
  /** Seven bits, most significant first. */
  bits: string;
  /** Two hex digits. */
  hex: string;
}

/** How many characters the typer holds. */
export const ASCII_TYPER_LIMIT = 24;

const CONTROL_CHARACTERS: Record<number, [label: string, name: string]> = {
  0: ["NUL", "Null"],
  1: ["SOH", "Start of heading"],
  2: ["STX", "Start of text"],
  3: ["ETX", "End of text"],
  4: ["EOT", "End of transmission"],
  5: ["ENQ", "Enquiry"],
  6: ["ACK", "Acknowledge"],
  7: ["BEL", "Bell"],
  8: ["BS", "Backspace"],
  9: ["TAB", "Horizontal tab"],
  10: ["LF", "Line feed"],
  11: ["VT", "Vertical tab"],
  12: ["FF", "Form feed"],
  13: ["CR", "Carriage return"],
  14: ["SO", "Shift out"],
  15: ["SI", "Shift in"],
  16: ["DLE", "Data link escape"],
  17: ["DC1", "Device control 1"],
  18: ["DC2", "Device control 2"],
  19: ["DC3", "Device control 3"],
  20: ["DC4", "Device control 4"],
  21: ["NAK", "Negative acknowledge"],
  22: ["SYN", "Synchronous idle"],
  23: ["ETB", "End of transmission block"],
  24: ["CAN", "Cancel"],
  25: ["EM", "End of medium"],
  26: ["SUB", "Substitute"],
  27: ["ESC", "Escape"],
  28: ["FS", "File separator"],
  29: ["GS", "Group separator"],
  30: ["RS", "Record separator"],
  31: ["US", "Unit separator"],
  127: ["DEL", "Delete"],
};

const SYMBOL_NAMES: Record<string, string> = {
  " ": "Space",
  "!": "Exclamation mark",
  '"': "Quotation mark",
  "#": "Number sign",
  $: "Dollar sign",
  "%": "Percent sign",
  "&": "Ampersand",
  "'": "Apostrophe",
  "(": "Left parenthesis",
  ")": "Right parenthesis",
  "*": "Asterisk",
  "+": "Plus sign",
  ",": "Comma",
  "-": "Hyphen",
  ".": "Period",
  "/": "Slash",
  ":": "Colon",
  ";": "Semicolon",
  "<": "Less-than sign",
  "=": "Equals sign",
  ">": "Greater-than sign",
  "?": "Question mark",
  "@": "At sign",
  "[": "Left square bracket",
  "\\": "Backslash",
  "]": "Right square bracket",
  "^": "Caret",
  _: "Underscore",
  "`": "Backtick",
  "{": "Left curly bracket",
  "|": "Vertical bar",
  "}": "Right curly bracket",
  "~": "Tilde",
};

function characterName(char: string): string {
  if (/[A-Z]/.test(char)) return `Capital letter ${char}`;
  if (/[a-z]/.test(char)) return `Small letter ${char}`;
  if (/[0-9]/.test(char)) return `Digit ${char}`;
  return SYMBOL_NAMES[char];
}

/** All 128 ASCII slots in code order. */
export const ASCII_TABLE: readonly AsciiEntry[] = Array.from({ length: 128 }, (_, code) => {
  const char = asciiCharacter(code);
  const [label, name] =
    char === null ? CONTROL_CHARACTERS[code] : [char === " " ? "SP" : char, characterName(char)];
  return {
    code,
    label,
    name,
    char,
    bits: byteBits(code).slice(1),
    hex: code.toString(16).padStart(2, "0").toUpperCase(),
  };
});

function isAscii(text: string): boolean {
  for (let index = 0; index < text.length; index++) {
    if (text.charCodeAt(index) > 127) return false;
  }
  return true;
}

/**
 * Splits text into what a reader calls characters, so an emoji built from
 * several code points, or a letter with a combining accent, is one item.
 */
function graphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (part) => part.segment);
  }
  return Array.from(text);
}

/** A refused character as shown to the reader: itself, or its code point when it has no ink. */
function displayRejected(grapheme: string): string {
  if (!/^[\p{Z}\p{C}\p{M}]+$/u.test(grapheme)) return grapheme;
  const codePoint = grapheme.codePointAt(0) ?? 0;
  return `U+${codePoint.toString(16).padStart(4, "0").toUpperCase()}`;
}

export interface AsciiFilterResult {
  /** The ASCII characters of the input, in order, cut to the limit. */
  text: string;
  /** Each refused character once, in the order it first appeared. */
  rejected: string[];
  /** How many ASCII characters did not fit. */
  overflow: number;
}

/** Keeps the ASCII characters of typed or pasted text and reports what was left out. */
export function filterAscii(input: string, limit: number = ASCII_TYPER_LIMIT): AsciiFilterResult {
  let kept = "";
  const rejected: string[] = [];
  for (const grapheme of graphemes(input)) {
    if (isAscii(grapheme)) {
      kept += grapheme;
      continue;
    }
    const shown = displayRejected(grapheme);
    if (!rejected.includes(shown)) rejected.push(shown);
  }
  return {
    text: kept.slice(0, limit),
    rejected,
    overflow: Math.max(0, kept.length - limit),
  };
}

/** One table entry per character of ASCII text. Anything else is skipped. */
export function asciiReadings(text: string): AsciiEntry[] {
  const readings: AsciiEntry[] = [];
  for (let index = 0; index < text.length; index++) {
    const entry = ASCII_TABLE[text.charCodeAt(index)];
    if (entry) readings.push(entry);
  }
  return readings;
}
