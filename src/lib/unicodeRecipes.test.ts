import { describe, expect, it } from "vitest";
import {
  isStandardEmoji,
  languageReadout,
  languagesWriting,
  MARK_SCRIPTS,
  pressMark,
} from "./unicodeRecipes";

const script = (name: string) => {
  const found = MARK_SCRIPTS.find((entry) => entry.name === name);
  if (!found) throw new Error(name);
  return found;
};

describe("languagesWriting", () => {
  it("knows every base the panel offers", () => {
    for (const entry of MARK_SCRIPTS) {
      for (const base of entry.bases) {
        expect(languagesWriting(entry, base, []).length, base).toBeGreaterThan(0);
      }
    }
  });

  it("finds a whole letter in an alphabet, in either spelling", () => {
    expect(languagesWriting(script("LATIN"), "e", [0x301])).toContain("fr");
    expect(languagesWriting(script("LATIN"), "n", [0x303])).toContain("es");
    expect(languagesWriting(script("CYRILLIC"), "и", [0x306])).toContain("ru");
    expect(languagesWriting(script("KANA"), "は", [0x309a])).toEqual(["ja"]);
    expect(languagesWriting(script("LATIN"), "z", [0x302, 0x327])).toEqual([]);
  });

  it("finds parts of a syllable in the scripts that list parts", () => {
    expect(languagesWriting(script("ARABIC"), "ب", [0x651, 0x64e])).toContain("ar");
    expect(languagesWriting(script("DEVANAGARI"), "क", [0x947, 0x902])).toContain("hi");
  });
});

describe("pressMark", () => {
  it("lifts rivals and keeps the marks that can stay", () => {
    const arabic = script("ARABIC");
    expect(pressMark(arabic, [0x64e, 0x651], 0x64f)).toEqual([0x651, 0x64f]);
    expect(pressMark(arabic, [0x64e, 0x651], 0x652)).toEqual([0x652]);
    expect(pressMark(arabic, [0x64e], 0x64e)).toEqual([]);
  });

  it("keeps Devanagari in its one spelling order, whatever the press order", () => {
    const devanagari = script("DEVANAGARI");
    expect(pressMark(devanagari, [0x902], 0x947)).toEqual([0x947, 0x902]);
    expect(pressMark(devanagari, [0x947, 0x902], 0x94d)).toEqual([0x94d]);
  });

  it("lets Latin stack in press order, since languages do", () => {
    expect(pressMark(script("LATIN"), [0x302], 0x301)).toEqual([0x302, 0x301]);
  });
});

describe("readouts", () => {
  it("puts well-known languages first and counts the rest", () => {
    expect(languageReadout(["af", "fr", "es", "zu", "de"])).toBe("SPANISH · FRENCH · GERMAN +2");
    expect(languageReadout([])).toBeNull();
  });

  it("tells a standard emoji from a sequence nobody defined", () => {
    expect(isStandardEmoji("🇩🇪")).toBe(true);
    expect(isStandardEmoji("🇩🇽")).toBe(false);
    expect(isStandardEmoji("👍🏽")).toBe(true);
  });
});
