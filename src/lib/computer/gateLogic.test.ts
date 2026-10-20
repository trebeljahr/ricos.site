import { describe, expect, it } from "vitest";
import { evalGate, fullAdd, halfAdd, inputRows, rowIndex } from "./gateLogic";

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
});
