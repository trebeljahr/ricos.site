import { describe, expect, it } from "vitest";
import {
  addBytes,
  byteBits,
  evalGate,
  fullAdd,
  halfAdd,
  inputRows,
  rippleStep,
  rowIndex,
  settledCarries,
  sumWith,
} from "./gateLogic";

describe("gate logic", () => {
  it("lists input rows in counting order", () => {
    expect(inputRows(2).map((row) => row.map(Number).join(""))).toEqual(["00", "01", "10", "11"]);
    expect(inputRows(3)).toHaveLength(8);
    for (const [index, row] of inputRows(3).entries()) expect(rowIndex(row)).toBe(index);
  });

  it("gives each gate its truth table", () => {
    const column = (gate: Parameters<typeof evalGate>[0]) =>
      inputRows(2)
        .map(([a, b]) => Number(evalGate(gate, a, b)))
        .join("");
    expect(column("and")).toBe("0001");
    expect(column("or")).toBe("0111");
    expect(column("nand")).toBe("1110");
    expect(column("nor")).toBe("1000");
    expect(column("xor")).toBe("0110");
    expect(column("xnor")).toBe("1001");
    expect(evalGate("not", false)).toBe(true);
    expect(evalGate("not", true)).toBe(false);
  });

  it("adds bits with half and full adders", () => {
    expect(halfAdd(true, true)).toEqual({ sum: false, carry: true });
    for (const [a, b, c] of inputRows(3)) {
      const { sum, carry } = fullAdd(a, b, c);
      expect(Number(carry) * 2 + Number(sum)).toBe(Number(a) + Number(b) + Number(c));
    }
  });

  it("adds bytes with eight full adders in a row", () => {
    for (const [a, b] of [
      [0, 0],
      [13, 29],
      [200, 100],
      [255, 255],
      [128, 128],
    ]) {
      const result = addBytes(a, b);
      expect(result.sum + (result.carryOut ? 256 : 0)).toBe(a + b);
      expect(result.stages).toHaveLength(8);
    }
    expect(addBytes(255, 0, true)).toMatchObject({ sum: 0, carryOut: true });
    expect(byteBits(13)).toBe("00001101");
  });
});

describe("ripple carry", () => {
  it("settles in as many steps as the longest carry chain", () => {
    let carries = settledCarries(0, 0);
    let steps = 0;
    while (true) {
      const next = rippleStep(255, 1, carries);
      if (next.every((carry, index) => carry === carries[index])) break;
      carries = next;
      steps++;
    }
    expect(steps).toBe(8);
    expect(carries).toEqual(settledCarries(255, 1));
    expect(sumWith(255, 1, carries)).toBe(0);
  });

  it("starts from the old carries, so sums are wrong until it settles", () => {
    const old = settledCarries(255, 0);
    const first = rippleStep(255, 1, old);
    expect(sumWith(255, 1, old)).not.toBe(0);
    expect(first[1]).toBe(true);
    expect(rippleStep(13, 29, settledCarries(13, 29))).toEqual(settledCarries(13, 29));
  });
});
