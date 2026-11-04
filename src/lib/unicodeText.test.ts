import { describe, expect, it } from "vitest";
import {
  flagText,
  HANGUL_LEADS,
  HANGUL_TAILS,
  HANGUL_VOWELS,
  hangulCodePoint,
  hangulText,
  JOINED_EMOJI,
  MARK_SCRIPTS,
  markedText,
  TONES,
  ZWJ,
} from "./unicodeRecipes";
import {
  bitHome,
  byteParts,
  codePointFace,
  codePointName,
  encodeUtf8,
  isEncodable,
  limitCodePoints,
  readText,
  UTF8_ROWS,
} from "./unicodeText";

describe("encodeUtf8", () => {
  it("agrees with the platform encoder at every range boundary and across the code space", () => {
    const encoder = new TextEncoder();
    const samples = UTF8_ROWS.flatMap((row) => [row.first, row.last]);
    for (let code = 0; code <= 0x10ffff; code += 251) samples.push(code);
    for (const code of samples.filter(isEncodable)) {
      expect(encodeUtf8(code)).toEqual([...encoder.encode(String.fromCodePoint(code))]);
    }
  });

  it("refuses what has no UTF-8 form", () => {
    expect(encodeUtf8(0xd800)).toEqual([]);
    expect(encodeUtf8(0xdfff)).toEqual([]);
    expect(encodeUtf8(0x110000)).toEqual([]);
  });

  it("gives the familiar bytes", () => {
    expect(encodeUtf8(0x41)).toEqual([0x41]);
    expect(encodeUtf8(0xe9)).toEqual([0xc3, 0xa9]);
    expect(encodeUtf8(0x20ac)).toEqual([0xe2, 0x82, 0xac]);
    expect(encodeUtf8(0x1f600)).toEqual([0xf0, 0x9f, 0x98, 0x80]);
  });
});

describe("bitHome", () => {
  it("sends each code point bit to the byte that really holds it", () => {
    // U+20AC has bits 2, 3, 5, 7, 13: three bytes, with six bits to a continuation.
    expect(bitHome(0x20ac, 0)).toBe(2);
    expect(bitHome(0x20ac, 5)).toBe(2);
    expect(bitHome(0x20ac, 6)).toBe(1);
    expect(bitHome(0x20ac, 12)).toBe(0);
    expect(bitHome(0x20ac, 15)).toBe(0);
    expect(bitHome(0x20ac, 16)).toBeNull();
    expect(bitHome(0x41, 6)).toBe(0);
    expect(bitHome(0x41, 7)).toBeNull();
  });
});

describe("byte classes", () => {
  it("splits marker bits from data bits", () => {
    expect(byteParts(0x41)).toEqual({ marker: "0", data: "1000001" });
    expect(byteParts(0xa9)).toEqual({ marker: "10", data: "101001" });
    expect(byteParts(0xf0)).toEqual({ marker: "11110", data: "000" });
    expect(byteParts(0xff)).toEqual({ marker: "11111111", data: "" });
  });
});

describe("codePointName", () => {
  it("uses official names, computed ones included", () => {
    expect(codePointName(0x41)).toBe("LATIN CAPITAL LETTER A");
    expect(codePointName(0x200d)).toBe("ZERO WIDTH JOINER");
    expect(codePointName(0x1f44d)).toBe("THUMBS UP SIGN");
    expect(codePointName(0xd55c)).toBe("HANGUL SYLLABLE HAN");
    expect(codePointName(0xac00)).toBe("HANGUL SYLLABLE GA");
    expect(codePointName(0xc544)).toBe("HANGUL SYLLABLE A");
    expect(codePointName(0x5b57)).toBe("CJK UNIFIED IDEOGRAPH-5B57");
  });

  it("falls back to the kind of character and marks what is not one", () => {
    expect(codePointName(0x0a)).toBe("LINE FEED");
    expect(codePointName(0x0531)).toBe("ARMENIAN LETTER");
    expect(codePointName(0xe000)).toBe("PRIVATE USE");
    expect(codePointName(0xd800)).toBe("SURROGATE");
    expect(codePointName(0x110000)).toBe("NOT IN UNICODE");
  });
});

describe("codePointFace", () => {
  it("gives invisible code points a label and marks a circle to sit on", () => {
    expect(codePointFace(0x200d)).toEqual({ text: "ZWJ", isLabel: true });
    expect(codePointFace(0xfe0f)).toEqual({ text: "VS16", isLabel: true });
    expect(codePointFace(0x20)).toEqual({ text: "SP", isLabel: true });
    expect(codePointFace(0xe0067)).toEqual({ text: "TAG g", isLabel: true });
    expect(codePointFace(0x301).text).toBe("◌́");
    expect(codePointFace(0x41)).toEqual({ text: "A", isLabel: false });
  });
});

describe("readText", () => {
  it("keeps a thumb and its tone together, and counts all three levels", () => {
    const reading = readText("👍🏽");
    expect(reading.graphemes).toHaveLength(1);
    expect(reading.codePointCount).toBe(2);
    expect(reading.bytes).toHaveLength(8);
    expect(reading.graphemes[0].codePoints.map((point) => point.hex)).toEqual([
      "U+1F44D",
      "U+1F3FD",
    ]);
  });

  it("tells a built accent from a ready-made one", () => {
    expect(readText("é").bytes).toHaveLength(2);
    const built = readText("é");
    expect(built.graphemes).toHaveLength(1);
    expect(built.bytes).toHaveLength(3);
  });

  it("holds the family of four in one cluster with its joiners", () => {
    const reading = readText("👨‍👩‍👧‍👦");
    expect(reading.graphemes).toHaveLength(1);
    expect(reading.codePointCount).toBe(7);
    expect(reading.bytes).toHaveLength(25);
  });

  it("writes U+FFFD for a lone surrogate, as encoders do", () => {
    expect(readText("\uD83D").bytes.map((entry) => entry.byte)).toEqual([0xef, 0xbf, 0xbd]);
  });

  it("gives a bare mark a circle at the cluster level too", () => {
    expect(readText("́").graphemes[0].face.text).toBe("◌́");
  });
});

describe("limitCodePoints", () => {
  it("cuts between code points and never inside one", () => {
    expect(limitCodePoints("a😀b", 2)).toEqual({ text: "a😀", overflow: 1 });
    expect(limitCodePoints("a😀b", 3)).toEqual({ text: "a😀b", overflow: 0 });
  });
});

describe("recipes", () => {
  it("spells flags with regional indicators", () => {
    expect(Array.from(flagText("DE"), (char) => char.codePointAt(0))).toEqual([0x1f1e9, 0x1f1ea]);
  });

  it("offers joined emoji and tones that hold together as one cluster", () => {
    for (const parts of JOINED_EMOJI) {
      expect(readText(parts.join(ZWJ)).graphemes, parts.join(" ")).toHaveLength(1);
    }
    for (const tone of TONES) expect(readText(`👍${tone.mark}`).graphemes).toHaveLength(1);
  });

  it("composes accents where Unicode has a ready-made character", () => {
    expect(markedText("e", [0x301], "NFC")).toBe("é");
    expect(markedText("e", [0x301], "NFD")).toBe("é");
    expect(markedText("и", [0x306], "NFC")).toBe("й");
    expect(markedText("か", [0x3099], "NFC")).toBe("が");
    expect(markedText("α", [0x301], "NFC")).toBe("ά");
    // No ready-made character carries both, so one mark stays separate.
    expect(Array.from(markedText("e", [0x323, 0x301, 0x302], "NFC")).length).toBeGreaterThan(1);
  });

  it("offers only bases and marks that stay in one cluster", () => {
    for (const script of MARK_SCRIPTS) {
      for (const base of script.bases) {
        for (const mark of script.marks) {
          expect(
            readText(markedText(base, [mark], "NFD")).graphemes,
            `${script.name} ${base} ${mark}`,
          ).toHaveLength(1);
        }
      }
    }
  });

  it("computes Hangul syllables from their parts", () => {
    expect(HANGUL_LEADS).toHaveLength(19);
    expect(HANGUL_VOWELS).toHaveLength(21);
    expect(HANGUL_TAILS).toHaveLength(28);
    const lead = HANGUL_LEADS.indexOf("ㅎ");
    const vowel = HANGUL_VOWELS.indexOf("ㅏ");
    const tail = HANGUL_TAILS.indexOf("ㄴ");
    expect(hangulCodePoint(lead, vowel, tail)).toBe(0xd55c);
    expect(hangulText(lead, vowel, tail, "NFC")).toBe("한");
    expect(Array.from(hangulText(lead, vowel, tail, "NFD"), (char) => char.codePointAt(0))).toEqual(
      [0x1112, 0x1161, 0x11ab],
    );
  });
});
