import { describe, expect, it } from "vitest";
import { ASCII_TABLE, ASCII_TYPER_LIMIT, asciiReadings, filterAscii } from "./asciiTable";

describe("ASCII table", () => {
  it("has 128 slots in code order, each with seven bits and two hex digits", () => {
    expect(ASCII_TABLE).toHaveLength(128);
    ASCII_TABLE.forEach((entry, code) => {
      expect(entry.code).toBe(code);
      expect(entry.bits).toMatch(/^[01]{7}$/);
      expect(Number.parseInt(entry.bits, 2)).toBe(code);
      expect(Number.parseInt(entry.hex, 16)).toBe(code);
      expect(entry.hex).toHaveLength(2);
      expect(entry.label).not.toBe("");
      expect(entry.name).toBeTruthy();
    });
  });

  it("names the 33 control characters by abbreviation and gives them no character", () => {
    const controls = ASCII_TABLE.filter((entry) => entry.char === null);
    expect(controls.map((entry) => entry.code)).toEqual([
      ...Array.from({ length: 32 }, (_, code) => code),
      127,
    ]);
    expect(ASCII_TABLE[0]).toMatchObject({ label: "NUL", name: "Null" });
    expect(ASCII_TABLE[9].label).toBe("TAB");
    expect(ASCII_TABLE[10]).toMatchObject({ label: "LF", name: "Line feed", bits: "0001010" });
    expect(ASCII_TABLE[13].label).toBe("CR");
    expect(ASCII_TABLE[27]).toMatchObject({ label: "ESC", hex: "1B" });
    expect(ASCII_TABLE[127]).toMatchObject({ label: "DEL", bits: "1111111", hex: "7F" });
  });

  it("shows space as SP and every other printable character as itself", () => {
    expect(ASCII_TABLE[32]).toMatchObject({ label: "SP", name: "Space", char: " " });
    for (let code = 33; code < 127; code++) {
      expect(ASCII_TABLE[code].char).toBe(String.fromCharCode(code));
      expect(ASCII_TABLE[code].label).toBe(String.fromCharCode(code));
    }
    expect(ASCII_TABLE[65]).toMatchObject({ name: "Capital letter A", bits: "1000001", hex: "41" });
    expect(ASCII_TABLE[97].name).toBe("Small letter a");
    expect(ASCII_TABLE[48].name).toBe("Digit 0");
    expect(ASCII_TABLE[126].name).toBe("Tilde");
  });

  it("gives every slot its own label", () => {
    expect(new Set(ASCII_TABLE.map((entry) => entry.label)).size).toBe(128);
  });
});

describe("filterAscii", () => {
  it("passes plain ASCII through, control characters included", () => {
    expect(filterAscii("Hi!\n\tok")).toEqual({ text: "Hi!\n\tok", rejected: [], overflow: 0 });
    expect(filterAscii("a\r\nb").text).toBe("a\r\nb");
    expect(filterAscii("")).toEqual({ text: "", rejected: [], overflow: 0 });
  });

  it("refuses accented letters and emoji and keeps the rest of a paste", () => {
    expect(filterAscii("café 😀 über")).toEqual({
      text: "caf  ber",
      rejected: ["é", "😀", "ü"],
      overflow: 0,
    });
  });

  it("lists a refused character once, however often it was typed", () => {
    expect(filterAscii("éaéé").rejected).toEqual(["é"]);
  });

  it("refuses an emoji made of several code points as one character", () => {
    const family = "👨‍👩‍👧";
    expect(filterAscii(`a${family}b`)).toEqual({ text: "ab", rejected: [family], overflow: 0 });
  });

  it("refuses a letter with a combining accent whole, not just the accent", () => {
    expect(filterAscii("éx")).toEqual({ text: "x", rejected: ["é"], overflow: 0 });
  });

  it("names invisible characters by code point", () => {
    expect(filterAscii("a b​").rejected).toEqual(["U+00A0", "U+200B"]);
  });

  it("cuts to the limit after filtering and counts what did not fit", () => {
    expect(filterAscii("ééabcdef", 4)).toEqual({ text: "abcd", rejected: ["é"], overflow: 2 });
    const long = "x".repeat(ASCII_TYPER_LIMIT + 3);
    expect(filterAscii(long).text).toHaveLength(ASCII_TYPER_LIMIT);
    expect(filterAscii(long).overflow).toBe(3);
  });
});

describe("asciiReadings", () => {
  it("reads each character as its table entry", () => {
    expect(asciiReadings("Hi\n").map((entry) => [entry.label, entry.bits, entry.hex])).toEqual([
      ["H", "1001000", "48"],
      ["i", "1101001", "69"],
      ["LF", "0001010", "0A"],
    ]);
  });

  it("reads a repeated letter as the same bits twice", () => {
    const [first, second] = asciiReadings("ll");
    expect(first).toBe(second);
  });

  it("skips anything outside ASCII", () => {
    expect(asciiReadings("aéb").map((entry) => entry.label)).toEqual(["a", "b"]);
  });
});
