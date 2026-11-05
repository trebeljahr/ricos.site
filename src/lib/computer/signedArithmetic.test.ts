import { describe, expect, it } from "vitest";
import {
  type ArithmeticEncoding,
  type ArithmeticOperation,
  arithmeticPresets,
  decodeInteger,
  displayInteger,
  encodeInteger,
  integerRange,
  type SignedWidth,
  sheetAt,
  stepHeading,
  stepReadout,
  workColumns,
} from "./signedNumbers";

const ENCODINGS = ["twos-complement", "ones-complement"] as const;
const OPERATIONS = ["add", "subtract"] as const;
const SAMPLE_8 = [0, 1, 2, 3, 5, 100, 126, 127, 128, 129, 130, 200, 253, 254, 255];

type Case = {
  a: number;
  b: number;
  width: SignedWidth;
  encoding: ArithmeticEncoding;
  operation: ArithmeticOperation;
};

/** Every case at 4 bits, and the boundary values at 8. */
const CASES: Case[] = ENCODINGS.flatMap((encoding) =>
  OPERATIONS.flatMap((operation) => {
    const list: Case[] = [];
    for (let a = 0; a < 16; a++)
      for (let b = 0; b < 16; b++) list.push({ a, b, width: 4, encoding, operation });
    for (const a of SAMPLE_8)
      for (const b of SAMPLE_8) list.push({ a, b, width: 8, encoding, operation });
    return list;
  }),
);

const work = ({ a, b, width, encoding, operation }: Case) =>
  workColumns(a, b, width, encoding, operation);

describe("column arithmetic", () => {
  it("writes the correct wrapped result in the steps' own bits", () => {
    for (const item of CASES) {
      const done = work(item);
      const size = 2 ** item.width;
      const subtract = item.operation === "subtract";
      const sheet = sheetAt(done, done.steps.length);
      const written = done.endAround ? sheet.final : sheet.sum;
      const raw = written.reduce<number>((sum, bit, column) => sum + (bit ?? 0) * 2 ** column, 0);
      expect(raw).toBe(done.result);

      const b = subtract ? size - 1 - item.b : item.b;
      const plain = item.a + b + (subtract && item.encoding === "twos-complement" ? 1 : 0);
      const wrapped = plain >= size ? plain - size + 1 : plain;
      expect(done.result).toBe(item.encoding === "twos-complement" ? plain % size : wrapped);
    }
  });

  it("flags overflow exactly when the true answer does not fit, from the top carries alone", () => {
    for (const item of CASES) {
      const done = work(item);
      const { min, max } = integerRange(item.width, item.encoding);
      const left = decodeInteger(item.a, item.width, item.encoding);
      const right = decodeInteger(item.b, item.width, item.encoding);
      const exact = item.operation === "add" ? left + right : left - right;
      expect(done.trueValue).toBe(exact + 0);
      expect(done.overflow).toBe(exact < min || exact > max);
      if (!done.overflow) expect(done.value + 0).toBe(exact + 0);
    }
  });

  it("wraps an overflowing value the way each encoding counts", () => {
    for (const item of CASES) {
      const done = work(item);
      const period = item.encoding === "twos-complement" ? 2 ** item.width : 2 ** item.width - 1;
      expect((((done.trueValue - done.value) % period) + period) % period).toBe(0);
    }
  });

  it("goes round a second time only in ones' complement with a carry out, and never carries out twice", () => {
    for (const item of CASES) {
      const done = work(item);
      const second = done.steps.filter((step) => step.kind === "column" && step.pass === 2);
      const fate = done.steps.find((step) => step.kind === "carry-out");
      if (item.encoding === "twos-complement") {
        expect(done.endAround).toBe(false);
        expect(second).toEqual([]);
        expect(fate).toEqual(
          done.carryOutOfTop ? { kind: "carry-out", fate: "dropped" } : undefined,
        );
      } else if (done.endAround) {
        expect(second).toHaveLength(item.width);
        expect(fate).toEqual({ kind: "carry-out", fate: "wrapped" });
        expect(second[0]).toMatchObject({ column: 0, carryIn: 1, top: done.firstPass & 1 });
        expect(second.at(-1)).toMatchObject({ carryOut: 0 });
        expect(done.result).toBe(done.firstPass + 1);
      } else {
        expect(done.carryOutOfTop).toBe(0);
        expect(second).toEqual([]);
        expect(done.result).toBe(done.firstPass);
      }
    }
  });

  it("chains every column's carry to the next", () => {
    for (const item of CASES) {
      const done = work(item);
      for (const pass of [1, 2]) {
        const columns = done.steps.flatMap((step) =>
          step.kind === "column" && step.pass === pass ? [step] : [],
        );
        columns.forEach((step, index) => {
          expect(step.column).toBe(index);
          expect(2 * step.carryOut + step.sum).toBe(step.top + (step.bottom ?? 0) + step.carryIn);
          if (index > 0) expect(step.carryIn).toBe(columns[index - 1]?.carryOut);
        });
      }
    }
  });

  it("flips B bit by bit before subtracting, and adds the +1 only in two's complement", () => {
    for (const encoding of ENCODINGS) {
      const done = workColumns(5, 3, 4, encoding, "subtract");
      expect(done.steps.slice(0, 4)).toEqual([
        { kind: "invert", column: 0, from: 1, to: 0 },
        { kind: "invert", column: 1, from: 1, to: 0 },
        { kind: "invert", column: 2, from: 0, to: 1 },
        { kind: "invert", column: 3, from: 0, to: 1 },
      ]);
      expect(done.addend).toBe(0b1100);
      expect(done.steps[4]).toEqual({
        kind: "first-carry",
        carry: encoding === "twos-complement" ? 1 : 0,
      });
      expect(done.value).toBe(2);
    }
    expect(workColumns(5, 3, 4, "twos-complement", "add").steps[0]?.kind).toBe("column");
  });

  it("reaches negative zero only as all ones in ones' complement", () => {
    const toZero = workColumns(5, 0b1010, 4, "ones-complement", "add");
    expect(toZero.result).toBe(0b1111);
    expect(toZero.negativeZero).toBe(true);
    expect(displayInteger(toZero.value)).toBe("−0");
    expect(toZero.endAround).toBe(false);
    expect(workColumns(5, 5, 4, "ones-complement", "subtract").negativeZero).toBe(true);
    // Two negative zeros: the end-around carry lands on 1111 again.
    const both = workColumns(0b1111, 0b1111, 4, "ones-complement", "add");
    expect(both.endAround).toBe(true);
    expect(both.negativeZero).toBe(true);
    for (const item of CASES) {
      const done = work(item);
      expect(done.negativeZero).toBe(Object.is(done.value, -0));
      if (item.encoding === "twos-complement") expect(done.negativeZero).toBe(false);
    }
    expect(workColumns(5, 5, 4, "twos-complement", "subtract").result).toBe(0);
  });

  it("works the chapter's sums", () => {
    const chapter = workColumns(0b0010, 0b1011, 4, "twos-complement", "add");
    expect(chapter.value).toBe(-3);
    expect(chapter.overflow).toBe(false);

    const dropped = workColumns(0b0101, 0b1101, 4, "twos-complement", "add");
    expect(dropped.value).toBe(2);
    expect(dropped.steps).toContainEqual({ kind: "carry-out", fate: "dropped" });
    expect(dropped.overflow).toBe(false);

    const up = workColumns(4, 7, 4, "twos-complement", "add");
    expect([up.value, up.trueValue, up.carryIntoTop, up.carryOutOfTop]).toEqual([-5, 11, 1, 0]);
    expect(up.overflow).toBe(true);

    const down = workColumns(0b1000, 0b1101, 4, "twos-complement", "add");
    expect([down.value, down.trueValue, down.carryIntoTop, down.carryOutOfTop]).toEqual([
      5, -11, 0, 1,
    ]);
  });

  it("counts a carry that climbs into the top column only in the second pass", () => {
    // −7 + (−0): the first pass gives 0111, and the end-around carry climbs to the top.
    const done = workColumns(0b1000, 0b1111, 4, "ones-complement", "add");
    expect(done.value).toBe(-7);
    expect(done.overflow).toBe(false);
    expect(done.carryIntoTop).toBe(1);
  });

  it("fills the paper a step at a time and empties it again", () => {
    const done = workColumns(0b0101, 0b1100, 4, "ones-complement", "add");
    const empty = sheetAt(done, 0);
    expect(empty.step).toBeNull();
    expect(empty.sum).toEqual([null, null, null, null]);
    expect(empty.carries.every((bit) => bit === null)).toBe(true);

    const one = sheetAt(done, 1);
    expect(one.sum).toEqual([1, null, null, null]);
    expect(one.carries).toEqual([0, 0, null, null, null]);

    const afterFirstPass = sheetAt(done, 4);
    expect(afterFirstPass.sum).toEqual([1, 0, 0, 0]);
    expect(afterFirstPass.carries[4]).toBe(1);
    expect(afterFirstPass.fate).toBeNull();

    const wrapped = sheetAt(done, 5);
    expect(wrapped.fate).toBe("wrapped");
    expect(wrapped.secondCarries).toEqual([1, null, null, null]);
    expect(wrapped.final).toEqual([null, null, null, null]);

    const all = sheetAt(done, done.steps.length);
    expect(all.done).toBe(true);
    expect(all.final).toEqual([0, 1, 0, 0]);
    expect(all.secondCarries).toEqual([1, 1, 0, 0]);
    expect(done.value).toBe(2);
  });

  it("states what each step did", () => {
    const steps = (a: number, b: number, encoding: ArithmeticEncoding) => {
      const done = workColumns(a, b, 4, encoding, "add");
      return done.steps.map((step) => stepReadout(done, step));
    };
    expect(steps(0b0101, 0b1101, "twos-complement")).toEqual([
      ["1 + 1 + carry 0 = 10, write 0, carry 1"],
      ["0 + 0 + carry 1 = 1, write 1, carry 0"],
      ["1 + 1 + carry 0 = 10, write 0, carry 1"],
      ["0 + 1 + carry 1 = 10, write 0, carry 1"],
      ["carry 1 → dropped"],
      ["5 + (−3) = 2", "carry 1 → dropped", "carry into top 1 = carry out 1"],
    ]);
    const wrapped = steps(0b0101, 0b1100, "ones-complement");
    expect(wrapped[4]).toEqual(["carry 1 → back into column 0"]);
    expect(wrapped[5]).toEqual(["1 + carry 1 = 10, write 0, carry 1"]);
    expect(wrapped.at(-1)).toEqual([
      "5 + (−3) = 2",
      "carry 1 → back into column 0",
      "carry into top 1 = carry out 1",
    ]);
    expect(steps(4, 7, "twos-complement").at(-1)).toEqual([
      "4 + 7 → −5",
      "true answer 11, doesn’t fit",
      "carry into top 1 ≠ carry out 0",
    ]);
    expect(steps(5, 0b1010, "ones-complement").at(-1)).toEqual([
      "5 + (−5) = −0",
      "two zeros: 0000 = 0, 1111 = −0",
      "carry into top 0 = carry out 0",
    ]);
    const start = workColumns(5, 3, 4, "twos-complement", "subtract");
    expect(stepReadout(start, null)).toEqual(["5 − 3", "0101 − 0011"]);
    expect(stepReadout(start, { kind: "first-carry", carry: 1 })).toEqual([
      "+1 enters as the first carry",
    ]);
    expect(stepHeading(null)).toBe("START");
    expect(stepHeading(start.steps[0] ?? null)).toBe("FLIP B · COLUMN 0");
  });

  it("encodes values, keeps negative zero in ones' complement and fits values to the range", () => {
    for (const width of [4, 8] as const) {
      for (const encoding of ENCODINGS) {
        for (let raw = 0; raw < 2 ** width; raw++) {
          expect(encodeInteger(decodeInteger(raw, width, encoding), width, encoding)).toBe(raw);
        }
      }
    }
    expect(encodeInteger(-8, 4, "ones-complement")).toBe(0b1000);
    expect(encodeInteger(-0, 4, "twos-complement")).toBe(0);
    expect(encodeInteger(100, 4, "twos-complement")).toBe(7);
  });

  it("offers presets that read as what they do, the last two overflowing", () => {
    const labels = (width: SignedWidth, encoding: ArithmeticEncoding) =>
      arithmeticPresets(width, encoding).map(({ label }) => label);
    expect(labels(4, "twos-complement")).toEqual([
      "2 + (−5)",
      "5 + (−3)",
      "5 + (−5)",
      "5 − 3",
      "4 + 7",
      "−8 + (−3)",
    ]);
    expect(labels(4, "ones-complement").at(-1)).toBe("−7 + (−3)");
    expect(labels(8, "twos-complement").slice(-2)).toEqual(["100 + 100", "−128 + (−3)"]);
    for (const width of [4, 8] as const) {
      for (const encoding of ENCODINGS) {
        const overflow = arithmeticPresets(width, encoding)
          .slice(-2)
          .map(({ a, b, operation }) => workColumns(a, b, width, encoding, operation).overflow);
        expect(overflow).toEqual([true, true]);
      }
    }
  });
});
