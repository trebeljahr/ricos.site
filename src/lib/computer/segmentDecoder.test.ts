import { describe, expect, it } from "vitest";
import { decodedBars, digitInputs, digitLines } from "./segmentDecoder";
import { segmentBits } from "./sevenSegment";

describe("two-plane seven-segment decoder", () => {
  it("lights the same bars as the digit table for all 16 inputs", () => {
    for (let number = 0; number < 16; number++) {
      expect(decodedBars(number)).toEqual(segmentBits(number));
    }
  });

  it("raises exactly one digit line for 0-9 and none for 10-15", () => {
    for (let number = 0; number < 16; number++) {
      const high = digitLines(number).flatMap((on, digit) => (on ? [digit] : []));
      expect(high).toEqual(number < 10 ? [number] : []);
    }
  });

  it("reads 5, binary 0101, as not-8, 4, not-2 and 1", () => {
    expect(digitInputs(5).map((input) => input.inverted)).toEqual([true, false, true, false]);
  });
});
