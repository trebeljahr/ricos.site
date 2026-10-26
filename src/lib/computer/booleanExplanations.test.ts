import { describe, expect, it } from "vitest";
import { truthTablePreview, truthTableSize } from "./booleanExplanations";

describe("truth table size", () => {
  it("counts the empty assignment and both constant functions", () => {
    expect(truthTableSize(0)).toEqual({ rows: 1, functions: BigInt(2) });
    expect(truthTablePreview(0)).toEqual([[]]);
  });

  it("distinguishes rows from complete Boolean functions using exact integers", () => {
    expect(truthTableSize(2)).toEqual({ rows: 4, functions: BigInt(16) });
    expect(truthTableSize(8)).toEqual({
      rows: 256,
      functions: BigInt(
        "115792089237316195423570985008687907853269984665640564039457584007913129639936",
      ),
    });
  });

  it("bounds previews without losing input width or binary counting order", () => {
    const preview = truthTablePreview(8);
    expect(preview).toHaveLength(8);
    expect(preview.every((row) => row.length === 8)).toBe(true);
    expect(preview[0]).toEqual(Array(8).fill(false));
    expect(preview[7].map(Number).join("")).toBe("00000111");
  });

  it.each([-1, 0.5, 9, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid input count %s",
    (count) => {
      expect(() => truthTableSize(count)).toThrow(RangeError);
      expect(() => truthTablePreview(count)).toThrow(RangeError);
    },
  );
});
