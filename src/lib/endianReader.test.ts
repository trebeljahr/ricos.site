import { describe, expect, it } from "vitest";
import { formatTwoBytes, parseTwoBytes, readBytes, readOrders, readSequence } from "./endianReader";

const [bitByBit, bitByBitReversed, bytesInOrderBitsReversed, bytesReversedBitsInOrder] = readOrders;

function values(first: number, second: number) {
  const bytes = new Uint8Array([first, second]);
  return readOrders.map((order) => readBytes(bytes, order).value);
}

describe("readSequence", () => {
  it("walks the 16 positions in each of the four orders", () => {
    expect(readSequence(bitByBit)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    expect(readSequence(bitByBitReversed)).toEqual([
      15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
    ]);
    expect(readSequence(bytesInOrderBitsReversed)).toEqual([
      7, 6, 5, 4, 3, 2, 1, 0, 15, 14, 13, 12, 11, 10, 9, 8,
    ]);
    expect(readSequence(bytesReversedBitsInOrder)).toEqual([
      8, 9, 10, 11, 12, 13, 14, 15, 0, 1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it("visits every position exactly once", () => {
    for (const order of readOrders) {
      expect([...readSequence(order)].sort((a, b) => a - b)).toEqual(
        Array.from({ length: 16 }, (_, position) => position),
      );
    }
  });
});

describe("readBytes", () => {
  it("reads 12 34 as four different numbers", () => {
    expect(values(0x12, 0x34)).toEqual([0x1234, 0x2c48, 0x482c, 0x3412]);
  });

  it("returns the bits in the order they were read", () => {
    const bytes = new Uint8Array([0x12, 0x34]);
    expect(readOrders.map((order) => readBytes(bytes, order).bits)).toEqual([
      "0001001000110100",
      "0010110001001000",
      "0100100000101100",
      "0011010000010010",
    ]);
  });

  it("matches big endian in the first order and little endian in the last, for every input", () => {
    for (let word = 0; word <= 0xffff; word++) {
      const bytes = new Uint8Array([word >> 8, word & 0xff]);
      const view = new DataView(bytes.buffer);
      if (
        readBytes(bytes, bitByBit).value !== view.getUint16(0, false) ||
        readBytes(bytes, bytesReversedBitsInOrder).value !== view.getUint16(0, true)
      ) {
        throw new Error(`byte order mismatch for ${formatTwoBytes(bytes)}`);
      }
    }
  });
});

describe("two-byte hex input", () => {
  it("parses four hex digits with optional separators", () => {
    expect(parseTwoBytes("12 34")).toEqual(new Uint8Array([0x12, 0x34]));
    expect(parseTwoBytes("ab_cd")).toEqual(new Uint8Array([0xab, 0xcd]));
    expect(parseTwoBytes("0001")).toEqual(new Uint8Array([0, 1]));
  });

  it("rejects anything that is not exactly two bytes", () => {
    expect(parseTwoBytes("")).toBeNull();
    expect(parseTwoBytes("123")).toBeNull();
    expect(parseTwoBytes("12 34 56")).toBeNull();
    expect(parseTwoBytes("12 3G")).toBeNull();
  });

  it("formats bytes the way the input field shows them", () => {
    expect(formatTwoBytes(new Uint8Array([0x0a, 0xff]))).toBe("0A FF");
  });
});
