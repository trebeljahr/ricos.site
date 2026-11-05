import { describe, expect, it } from "vitest";
import { bitMask, bitWeight, decodeInteger, displayInteger } from "./signedNumbers";

describe("signed representations", () => {
  it("gives the same four bits four meanings and changes the sign place with width", () => {
    expect(decodeInteger(11, 4, "unsigned")).toBe(11);
    expect(decodeInteger(11, 4, "sign-magnitude")).toBe(-3);
    expect(decodeInteger(11, 4, "ones-complement")).toBe(-4);
    expect(decodeInteger(11, 4, "twos-complement")).toBe(-5);
    expect(decodeInteger(11, 8, "twos-complement")).toBe(11);
    expect(decodeInteger(128, 8, "twos-complement")).toBe(-128);
  });

  it("adds up every pattern from its place weights", () => {
    for (const width of [4, 8] as const) {
      for (const encoding of ["unsigned", "ones-complement", "twos-complement"] as const) {
        for (let raw = 0; raw < 2 ** width; raw++) {
          let sum = 0;
          for (let bit = 0; bit < width; bit++)
            if (raw & (1 << bit)) sum += bitWeight(bit, width, encoding);
          expect(sum === decodeInteger(raw, width, encoding)).toBe(true);
        }
      }
    }
    expect(bitWeight(3, 4, "ones-complement")).toBe(-7);
    expect(bitWeight(7, 8, "twos-complement")).toBe(-128);
  });

  it("preserves the two zero encodings only in sign-magnitude and ones’ complement", () => {
    for (const width of [4, 8] as const) {
      expect(Object.is(decodeInteger(2 ** (width - 1), width, "sign-magnitude"), -0)).toBe(true);
      expect(Object.is(decodeInteger(bitMask(width), width, "ones-complement"), -0)).toBe(true);
      expect(displayInteger(decodeInteger(bitMask(width), width, "ones-complement"))).toBe("−0");
      const twos = Array.from({ length: 2 ** width }, (_, raw) =>
        decodeInteger(raw, width, "twos-complement"),
      );
      expect(twos.filter((value) => value === 0)).toHaveLength(1);
      expect(new Set(twos).size).toBe(2 ** width);
    }
  });
});
