import { describe, expect, it } from "vitest";
import { TRANSISTOR_GATE_LESSONS } from "../cmosGates";
import { recognitionComponent } from "../recognition";
import { levelStart } from "./kit";
import { BUILDER_LESSONS, LESSON_SECTIONS, lessonForCircuit } from "./lessons";
import { LEARNING_LEVELS, levelById } from "./levels";

describe("builder lessons", () => {
  it("goes from transistors up, and requires the transistor levels", () => {
    const ids = LEARNING_LEVELS.map((level) => level.id);
    expect(ids.slice(0, 3)).toEqual(["cmos-not", "cmos-nand", "not"]);
    for (const id of ["cmos-not", "cmos-nand"]) expect(levelById(id)?.optional, id).toBeFalsy();
  });

  it("keeps the other transistor gates off the ladder, and offers them in the builder", () => {
    const extra = ["cmos-and", "cmos-or", "cmos-nor", "cmos-xor", "cmos-xnor"];
    const ladder = LEARNING_LEVELS.map((level) => level.id);
    const offered = BUILDER_LESSONS.map((level) => level.id);
    for (const id of extra) {
      expect(ladder, id).not.toContain(id);
      expect(offered, id).toContain(id);
    }
    expect(TRANSISTOR_GATE_LESSONS).toEqual([
      "cmos-not",
      "cmos-and",
      "cmos-nand",
      "cmos-or",
      "cmos-nor",
      "cmos-xor",
      "cmos-xnor",
    ]);
    for (const id of TRANSISTOR_GATE_LESSONS) {
      const start = levelStart(levelById(id)!).circuit;
      expect(start.wires, id).toEqual([]);
      expect(new Set(start.nodes.map((node) => node.type)), id).toEqual(
        new Set(["switch", "lamp", "high", "ground"]),
      );
    }
  });

  it("makes every core lesson available in the builder", () => {
    const offered = LESSON_SECTIONS.flatMap((section) => section.levels);
    expect(offered).toEqual(BUILDER_LESSONS);
    expect(LEARNING_LEVELS.every((level) => offered.includes(level))).toBe(true);
    expect(offered.some((level) => level.id === "universal-nor-xor")).toBe(true);
    for (const level of LEARNING_LEVELS) {
      expect(level.hints?.length, level.id).toBeGreaterThan(0);
    }
  });

  it("opens existing memory, bus, and arithmetic presets at their construction lesson", () => {
    for (const [name, id] of [
      ["SR latch", "sr-latch"],
      ["D latch", "d-latch"],
      ["D flip-flop", "d-flip-flop"],
      ["8-bit parallel register", "register8"],
      ["4 × 4 SRAM", "ram"],
      ["4 × 4 DRAM", "dram-array"],
      ["4 × 4 flash memory", "flash-array"],
      ["8-bit shift register", "shift-register8"],
      ["Gated SR latch", "gated-sr-latch"],
      ["JK latch", "jk-latch"],
      ["T latch", "t-latch"],
      ["SR flip-flop", "sr-flip-flop"],
      ["JK flip-flop", "jk-flip-flop"],
      ["T flip-flop", "t-flip-flop"],
      ["8-bit shared bus", "shared-bus"],
      ["Half adder", "half-adder"],
      ["8-bit full adder", "adder8"],
    ]) {
      expect(lessonForCircuit(name)).toBe(id);
      expect(levelById(id)).toBeTruthy();
    }
    expect(lessonForCircuit("My circuit")).toBeUndefined();
  });

  it("draws learned storage parts with their storage symbols", () => {
    for (const [part, symbol] of [
      ["gated-sr-latch", "srlatch"],
      ["jk-latch", "dlatch"],
      ["t-latch", "dlatch"],
      ["jk-flip-flop", "dff"],
      ["shift-register8", "register"],
      ["dram-cell", "memory"],
      ["flash-array", "memory"],
    ]) {
      expect(recognitionComponent(part)?.symbol).toBe(symbol);
    }
  });
});
