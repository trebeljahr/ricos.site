import { describe, expect, it } from "vitest";
import {
  ALTERNATE_CODEBOOK,
  addSwitch,
  allPatterns,
  CONVERSATION,
  clampSwitches,
  flipSwitch,
  formatPattern,
  lookup,
  MAX_SWITCHES,
  patternIndex,
  removeSwitch,
  SEED_CODEBOOK,
  sameMeaning,
  stateCount,
  withMeaning,
} from "./codebook";

describe("switch states", () => {
  it("doubles the number of states with each switch", () => {
    expect([1, 2, 3, 8].map(stateCount)).toEqual([2, 4, 8, 256]);
  });

  it("lists every state once, in counting order", () => {
    expect(allPatterns(1)).toEqual(["0", "1"]);
    expect(allPatterns(2)).toEqual(["00", "01", "10", "11"]);
    expect(allPatterns(3)).toEqual(["000", "001", "010", "011", "100", "101", "110", "111"]);
    const eight = allPatterns(8);
    expect(eight).toHaveLength(256);
    expect(new Set(eight).size).toBe(256);
    expect(eight.at(-1)).toBe("11111111");
  });

  it("pads a pattern to the number of switches and reads it back", () => {
    expect(formatPattern(1, 2)).toBe("01");
    expect(formatPattern(5, 8)).toBe("00000101");
    expect(patternIndex("00000101")).toBe(5);
    for (const pattern of allPatterns(4))
      expect(formatPattern(patternIndex(pattern), 4)).toBe(pattern);
  });

  it("flips one switch, counted from the left", () => {
    expect(flipSwitch("00", 0)).toBe("10");
    expect(flipSwitch("00", 1)).toBe("01");
    expect(flipSwitch("101", 2)).toBe("100");
    expect(flipSwitch("101", 3)).toBe("101");
    expect(flipSwitch("101", -1)).toBe("101");
  });

  it("adds and removes a switch on the right, within 1 to 8", () => {
    expect(addSwitch("1")).toBe("10");
    expect(removeSwitch("101")).toBe("10");
    expect(removeSwitch("1")).toBe("1");
    const full = "1".repeat(MAX_SWITCHES);
    expect(addSwitch(full)).toBe(full);
    expect([0, 3, 12, 2.7].map(clampSwitches)).toEqual([1, 3, 8, 2]);
  });
});

describe("codebooks", () => {
  it("looks up the chapter's four phrases", () => {
    expect(allPatterns(2).map((pattern) => lookup(SEED_CODEBOOK, pattern))).toEqual([
      "Hello",
      "How are you?",
      "Fine, what about you?",
      "Good. Nice to see you",
    ]);
  });

  it("has no meaning for a blank or missing entry", () => {
    expect(lookup(["Hello", "   "], "01")).toBeNull();
    expect(lookup(["Hello"], "11")).toBeNull();
  });

  it("reads one pattern differently under another codebook", () => {
    for (const pattern of allPatterns(2)) {
      expect(sameMeaning(SEED_CODEBOOK, SEED_CODEBOOK, pattern)).toBe(true);
      expect(sameMeaning(SEED_CODEBOOK, ALTERNATE_CODEBOOK, pattern)).toBe(false);
    }
    expect(sameMeaning(["Hi "], ["Hi"], "00")).toBe(true);
  });

  it("rewrites one entry without touching the original", () => {
    const edited = withMeaning(SEED_CODEBOOK, "10", "Yes");
    expect(edited).toEqual(["Hello", "How are you?", "Yes", "Good. Nice to see you"]);
    expect(SEED_CODEBOOK[2]).toBe("Fine, what about you?");
  });

  it("scripts the conversation as 00, 01, 10, 11 with alternating speakers", () => {
    expect(CONVERSATION.map((step) => step.pattern)).toEqual(allPatterns(2));
    expect(CONVERSATION.map((step) => step.speaker)).toEqual(["a", "b", "a", "b"]);
  });
});
