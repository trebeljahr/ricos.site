import { describe, expect, it } from "vitest";
import { initialSnapshot, step, validateCircuit } from "./logic";
import {
  bitMask,
  bitWeight,
  decodeInteger,
  displayInteger,
  readSignedAdder,
  type SignedWidth,
  signedAdderCircuit,
  signedAdderInputs,
} from "./signedNumbers";

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

describe("signed adder gate circuit", () => {
  function check(width: SignedWidth, a: number, b: number, subtract: boolean) {
    const circuit = signedAdderCircuit(width);
    const snapshot = step(
      circuit,
      initialSnapshot(),
      false,
      {},
      signedAdderInputs(a, b, width, subtract),
    );
    const reading = readSignedAdder(snapshot, width);
    const sign = 2 ** (width - 1);
    const exact = a + (subtract ? -b : b);
    const unsignedTotal =
      (a & bitMask(width)) +
      ((b & bitMask(width)) ^ (subtract ? bitMask(width) : 0)) +
      Number(subtract);
    expect(reading.raw).toBe(exact & bitMask(width));
    expect(reading.carry).toBe(unsignedTotal > bitMask(width));
    expect(reading.overflow).toBe(exact < -sign || exact >= sign);
    expect(reading.effectiveB).toBe((b & bitMask(width)) ^ (subtract ? bitMask(width) : 0));
    expect(decodeInteger(reading.a, width, "twos-complement")).toBe(a);
    expect(decodeInteger(reading.b, width, "twos-complement")).toBe(b);
  }

  it("uses the lab’s unfoldable full-adder blocks and valid wires", () => {
    for (const width of [4, 8] as const) {
      const circuit = signedAdderCircuit(width);
      expect(validateCircuit(circuit)).toBeTruthy();
      const adders = circuit.nodes.filter((node) => node.type === "module");
      expect(adders).toHaveLength(width);
      expect(adders.every((node) => node.module?.name === "1-bit full adder")).toBe(true);
    }
  });

  it("distinguishes unsigned carry from signed overflow in the chapter examples", () => {
    for (const [a, b, subtract] of [
      [2, -5, false],
      [4, 7, false],
      [-8, -3, false],
      [-1, 1, false],
      [2, 5, true],
      [7, -1, true],
      [0, -8, true],
      [-8, 1, true],
    ] as const)
      check(4, a, b, subtract);
  });

  it("covers every four-bit operand pair and both operations", () => {
    const circuit = signedAdderCircuit(4);
    for (let a = -8; a <= 7; a++)
      for (let b = -8; b <= 7; b++)
        for (const subtract of [false, true]) {
          const reading = readSignedAdder(
            step(circuit, initialSnapshot(), false, {}, signedAdderInputs(a, b, 4, subtract)),
            4,
          );
          const exact = a + (subtract ? -b : b);
          expect(reading.raw).toBe(exact & 15);
          expect(reading.overflow).toBe(exact < -8 || exact > 7);
        }
  });

  it("uses all eight stages at the signed boundaries and across carries", () => {
    for (const [a, b] of [
      [2, -5],
      [127, 1],
      [-128, -1],
      [-128, -128],
      [-1, 1],
      [85, 42],
      [0, -128],
      [-91, 74],
    ]) {
      check(8, a, b, false);
      check(8, a, b, true);
    }
  });
});
