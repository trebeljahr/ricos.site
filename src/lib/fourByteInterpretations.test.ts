import { describe, expect, it } from "vitest";
import { encodeFourByteReading } from "./fourByteEditing";
import { fourByteReadings } from "./fourByteInterpretations";

describe("four-byte byte order", () => {
  it("reads the same bytes as different numbers while text and color stay fixed", () => {
    const bytes = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const big = fourByteReadings(bytes);
    const little = fourByteReadings(bytes, true);

    expect(big.unsigned).toBe(0x01020304);
    expect(little.unsigned).toBe(0x04030201);
    expect(little.utf8).toBe(big.utf8);
    expect([little.red, little.green, little.blue, little.alpha]).toEqual([1, 2, 3, 4]);
  });

  it("writes numeric values in the selected order", () => {
    expect(encodeFourByteReading("unsigned", "16909060", 255, true)).toEqual({
      bytes: new Uint8Array([4, 3, 2, 1]),
    });
    expect(encodeFourByteReading("float", "1", 255, true)).toEqual({
      bytes: new Uint8Array([0, 0, 128, 63]),
    });
  });
});
