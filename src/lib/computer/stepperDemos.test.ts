import { describe, expect, it } from "vitest";
import { computerDemos } from "../computerDemos";
import {
  compileProgram,
  defaultMicrocode,
  RAM_STACK_SAMPLES,
  SAMPLE_PROGRAMS,
  traceProgram,
} from "../computerStepper";
import { assembleProgram, programProblems } from "./microcodeTable";
import { PLAIN_PRESETS, partsUsed, STEPPER_DEMOS, type StepperPreset } from "./stepperDemos";

/** Compiles a preset the way the stepper does. */
function compilePreset({ source, stack = "hardware", language }: StepperPreset) {
  return language === "assembly"
    ? assembleProgram(source, defaultMicrocode(stack))
    : compileProgram(source, { stack });
}

describe("the program stepper's demos", () => {
  it("gives each demo a page, a few lines of text and at least one program", () => {
    const slugs = computerDemos.map(({ slug }) => slug as string);
    for (const demo of STEPPER_DEMOS) {
      expect(slugs, demo.slug).toContain(demo.slug);
      expect(demo.intro.length, demo.slug).toBeGreaterThan(40);
      expect(demo.presets.length, demo.slug).toBeGreaterThan(0);
    }
    // One demo per part at most, and one for the plain CPU.
    const foci = STEPPER_DEMOS.map(({ focus }) => focus);
    expect(new Set(foci).size).toBe(foci.length);
    expect(STEPPER_DEMOS[0].focus).toBeNull();
    // The screens and their devices have hands-on demos; the stepper keeps the parts that execute.
    expect(foci.slice(1)).toEqual(["calls", "ramStack", "interrupts", "microcode"]);
    expect(PLAIN_PRESETS.map(({ label }) => label)).toEqual(["2 + 3", "OVERFLOW", "FOR LOOP"]);
  });

  it("runs every demo's programs to the end, and each demo has one that uses its part", () => {
    for (const demo of STEPPER_DEMOS) {
      const used = new Set<string>();
      for (const preset of demo.presets) {
        const where = `${preset.label} on ${demo.slug}`;
        const program = compilePreset(preset);
        expect(programProblems(program, defaultMicrocode(preset.stack)), where).toEqual([]);
        const end = traceProgram(program).at(-1);
        expect(end?.halted, where).toBe(true);
        expect(end?.explanation, where).not.toMatch(/No instruction|cannot/);
        for (const part of partsUsed(program)) used.add(part);
      }
      // The microcode table has no opcode or address of its own to use.
      if (demo.focus && demo.focus !== "microcode")
        expect([...used], demo.slug).toContain(demo.focus);
    }
  });

  it("keeps the plain CPU's programs free of every other part", () => {
    for (const preset of PLAIN_PRESETS)
      expect([...partsUsed(compilePreset(preset))], preset.label).toEqual([]);
  });

  it("tells the parts of a program apart by opcode and by data address", () => {
    const parts = (source: string) => [...partsUsed(compileProgram(source))].sort();
    expect(parts(SAMPLE_PROGRAMS.FUNCTION)).toEqual(["calls"]);
    expect(parts(SAMPLE_PROGRAMS.SMILEY)).toEqual(["screen"]);
    expect(parts(SAMPLE_PROGRAMS.CROSS)).toEqual(["pixelPort"]);
    expect(parts(SAMPLE_PROGRAMS.BLIT)).toEqual(["blitter", "screen"]);
    expect(parts(SAMPLE_PROGRAMS.BANKS)).toEqual(["bankWindow"]);
    expect(parts(SAMPLE_PROGRAMS.PORT)).toEqual(["vramPort"]);
    expect(parts(SAMPLE_PROGRAMS.STAMP)).toEqual(["bigBlitter"]);
    expect(
      [...partsUsed(compileProgram(RAM_STACK_SAMPLES.RECURSION, { stack: "ram" }))].sort(),
    ).toEqual(["calls", "ramStack"]);
    expect(parts("fn on_key(k) {\n  print(k);\n}\nloop {\n}")).toEqual(["interrupts"]);
  });
});
