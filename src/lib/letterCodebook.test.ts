import { describe, expect, it } from "vitest";
import {
  assignCharacter,
  filterLetters,
  LETTER_STATES,
  LETTER_TYPER_LIMIT,
  letterPattern,
  letterReadings,
  SEED_LETTER_CODEBOOK,
  shuffled,
  stateOf,
  typedCharacter,
} from "./letterCodebook";

const seed = SEED_LETTER_CODEBOOK;

describe("seed codebook", () => {
  it("fills all 32 states of five switches, each with its own character", () => {
    expect(LETTER_STATES).toBe(32);
    expect(seed).toHaveLength(32);
    expect(new Set(seed).size).toBe(32);
    for (const char of seed) expect(char).toHaveLength(1);
  });

  it("puts the space on all switches off and counts the alphabet up from 00001", () => {
    expect(seed[0]).toBe(" ");
    expect(letterPattern(seed.indexOf("A"))).toBe("00001");
    expect(letterPattern(seed.indexOf("H"))).toBe("01000");
    expect(letterPattern(seed.indexOf("Z"))).toBe("11010");
    expect(seed.slice(27)).toEqual([".", ",", "?", "!", "'"]);
    expect(letterPattern(31)).toBe("11111");
  });

  it("gives each letter the low five bits of its ASCII code", () => {
    for (const char of "ABCDEFGHIJKLMNOPQRSTUVWXYZ ")
      expect(seed.indexOf(char)).toBe(char.charCodeAt(0) & 0b11111);
  });
});

describe("stateOf", () => {
  it("finds a character, and a small letter by its capital", () => {
    expect(stateOf(seed, "A")).toBe(1);
    expect(stateOf(seed, "a")).toBe(1);
    expect(stateOf(seed, " ")).toBe(0);
    expect(stateOf(seed, "1")).toBe(-1);
    expect(stateOf(seed, "")).toBe(-1);
  });

  it("prefers the exact character when the codebook holds both cases", () => {
    const both = assignCharacter(seed, 31, "a").codebook;
    expect(stateOf(both, "a")).toBe(31);
    expect(stateOf(both, "A")).toBe(1);
    expect(stateOf(["a"], "A")).toBe(0);
  });

  it("reads a curly apostrophe as the plain one", () => {
    expect(stateOf(seed, "’")).toBe(31);
  });
});

describe("filterLetters", () => {
  it("passes text the codebook can encode", () => {
    expect(filterLetters("HOW ARE YOU?", seed)).toEqual({
      text: "HOW ARE YOU?",
      rejected: [],
      folded: [],
      overflow: 0,
    });
  });

  it("types small letters as capitals and says which", () => {
    expect(filterLetters("Hello", seed)).toEqual({
      text: "HELLO",
      rejected: [],
      folded: [
        ["e", "E"],
        ["l", "L"],
        ["o", "O"],
      ],
      overflow: 0,
    });
  });

  it("refuses digits and symbols the 32 states have no room for", () => {
    expect(filterLetters("A1 B2 é$1", seed)).toEqual({
      text: "A B ",
      rejected: ["1", "2", "é", "$"],
      folded: [],
      overflow: 0,
    });
  });

  it("reads a line break or a tab as a space", () => {
    expect(filterLetters("A\nB\tC\r\nD", seed).text).toBe("A B C D");
    expect(filterLetters("A\nB", seed).folded).toEqual([]);
  });

  it("names the space when the codebook has lost it", () => {
    const noSpace = assignCharacter(seed, 0, "1").codebook;
    expect(filterLetters("A B1", noSpace)).toMatchObject({ text: "AB1", rejected: ["SPACE"] });
  });

  it("cuts to the limit after filtering and counts what did not fit", () => {
    expect(filterLetters("12ABCDEF", seed, 4)).toMatchObject({ text: "ABCD", overflow: 2 });
    const long = "X".repeat(LETTER_TYPER_LIMIT + 3);
    expect(filterLetters(long, seed).text).toHaveLength(LETTER_TYPER_LIMIT);
    expect(filterLetters(long, seed).overflow).toBe(3);
  });
});

describe("letterReadings", () => {
  it("reads each character as the five bits of its state", () => {
    expect(letterReadings("HI ", seed).map((reading) => [reading.label, reading.bits])).toEqual([
      ["H", "01000"],
      ["I", "01001"],
      ["SP", "00000"],
    ]);
  });

  it("has no bits for a character that lost its state", () => {
    const edited = assignCharacter(seed, seed.indexOf("H"), "1").codebook;
    expect(letterReadings("HI", edited)).toEqual([
      { char: "H", label: "H", state: null, bits: null },
      { char: "I", label: "I", state: 9, bits: "01001" },
    ]);
  });

  it("counts a character of several code units once", () => {
    const edited = assignCharacter(seed, 5, "😀").codebook;
    expect(letterReadings("A😀", edited).map((reading) => reading.bits)).toEqual([
      "00001",
      "00101",
    ]);
    expect(filterLetters("😀😀😀", edited, 2)).toMatchObject({ text: "😀😀", overflow: 1 });
  });
});

describe("typedCharacter", () => {
  it("takes the character typed over, before or after the old one", () => {
    expect(typedCharacter("H", "x")).toBe("x");
    expect(typedCharacter("H", "Hx")).toBe("x");
    expect(typedCharacter("H", "xH")).toBe("x");
    expect(typedCharacter("H", "😀")).toBe("😀");
  });

  it("changes nothing when the field is emptied or holds the same character", () => {
    expect(typedCharacter("H", "")).toBeNull();
    expect(typedCharacter("H", "H")).toBeNull();
    expect(typedCharacter("H", "HH")).toBeNull();
  });

  it("takes the first character of a paste and any blank as the space", () => {
    expect(typedCharacter("H", "abc")).toBe("a");
    expect(typedCharacter("H", "\t")).toBe(" ");
    expect(typedCharacter(" ", "  ")).toBeNull();
    expect(typedCharacter(" ", " x")).toBe("x");
  });
});

describe("assignCharacter", () => {
  it("trades places when the character already has a state", () => {
    const { codebook, replaced, swapped } = assignCharacter(seed, 1, "E");
    expect(codebook[1]).toBe("E");
    expect(codebook[5]).toBe("A");
    expect(replaced).toBe("A");
    expect(swapped).toBe(true);
    expect([...codebook].sort()).toEqual([...seed].sort());
    expect(seed[1]).toBe("A");
  });

  it("drops the old character for one the codebook did not have", () => {
    const { codebook, replaced, swapped } = assignCharacter(seed, 2, "1");
    expect(codebook[2]).toBe("1");
    expect(codebook).not.toContain("B");
    expect(replaced).toBe("B");
    expect(swapped).toBe(false);
    expect(new Set(codebook).size).toBe(32);
  });
});

describe("shuffled", () => {
  it("keeps the characters and moves them to other states", () => {
    let seedValue = 7;
    const random = () => {
      seedValue = (seedValue * 16807) % 2147483647;
      return seedValue / 2147483647;
    };
    const next = shuffled(seed, random);
    expect(next).not.toEqual(seed);
    expect([...next].sort()).toEqual([...seed].sort());
    expect(seed[1]).toBe("A");
  });
});
