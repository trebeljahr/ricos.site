import { describe, expect, it } from "vitest";
import { computerDemos } from "../computerDemos";
import {
  compileProgram,
  defaultMicrocode,
  microcodeIsa,
  RAM_STACK_SAMPLES,
  SAMPLE_PROGRAMS,
  type StackModel,
  traceProgram,
} from "../computerStepper";
import { assembleProgram, programProblems, validateMicrocode } from "./microcodeTable";
import {
  compileProblem,
  earlierPresets,
  hasPart,
  levelMicrocode,
  levelProblem,
  modelNumber,
  partsUsed,
  STEPPER_LEVELS,
  STEPPER_PARTS,
  type StepperLevel,
  type StepperPreset,
  stepperLevel,
} from "./stepperLevels";

/** Compiles a preset the way the stepper does on `level`'s machine. */
function compilePreset(preset: StepperPreset, level: StepperLevel, fallback: StackModel) {
  const stack = preset.stack ?? fallback;
  const table = levelMicrocode(defaultMicrocode(stack), level);
  const program =
    preset.language === "assembly"
      ? assembleProgram(preset.source, table)
      : compileProgram(preset.source, { stack });
  return { program, table };
}

describe("the stepper's ladder of machines", () => {
  it("has one level per part, in order, each with a demo page and a program", () => {
    expect(STEPPER_LEVELS.map(({ part }) => part)).toEqual([...STEPPER_PARTS]);
    for (const level of STEPPER_LEVELS) {
      expect(level.presets.length, level.part).toBeGreaterThan(0);
      expect(level.intro.length, level.part).toBeGreaterThan(40);
      expect(stepperLevel(level.part)).toBe(level);
    }
    // The demo list walks the ladder in the same order, without gaps.
    const slugs = computerDemos.map(({ slug }) => slug as string);
    const first = slugs.indexOf(STEPPER_LEVELS[0].slug);
    expect(slugs.slice(first, first + STEPPER_LEVELS.length)).toEqual(
      STEPPER_LEVELS.map(({ slug }) => slug),
    );
    expect(modelNumber(stepperLevel("cpu"))).toBe(1);
    expect(modelNumber(stepperLevel("microcode"))).toBe(STEPPER_LEVELS.length);
  });

  it("builds each machine from the one before it", () => {
    const blitter = stepperLevel("blitter");
    expect(STEPPER_PARTS.filter((part) => hasPart(blitter, part))).toEqual([
      "cpu",
      "calls",
      "ramStack",
      "interrupts",
      "screen",
      "pixelPort",
      "blitter",
    ]);
    expect(earlierPresets(stepperLevel("cpu"))).toEqual([]);
    expect(earlierPresets(stepperLevel("ramStack")).map(({ label }) => label)).toEqual([
      "2 + 3",
      "OVERFLOW",
      "FOR LOOP",
      "FUNCTION",
      "NESTED",
    ]);
    // No two presets share a label: the buttons are found by it.
    const labels = STEPPER_LEVELS.flatMap(({ presets }) => presets.map(({ label }) => label));
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("runs a level's own programs and every earlier one, and each own program uses the new part", () => {
    for (const level of STEPPER_LEVELS) {
      const fallback = level.presets[0].stack ?? "hardware";
      for (const preset of [...level.presets, ...earlierPresets(level)]) {
        const where = `${preset.label} on ${level.part}`;
        const { program, table } = compilePreset(preset, level, fallback);
        expect(levelProblem(program, level), where).toBeNull();
        expect([...validateMicrocode(table), ...programProblems(program, table)], where).toEqual(
          [],
        );
        const trace = traceProgram(program, {}, table);
        expect(trace.at(-1)?.halted, where).toBe(true);
        expect(trace.at(-1)?.explanation, where).not.toMatch(/No instruction|cannot/);
      }
      if (level.part === "cpu" || level.part === "microcode") continue;
      const used = level.presets.map((preset) =>
        partsUsed(compilePreset(preset, level, fallback).program).has(level.part),
      );
      expect(used, level.part).toContain(true);
    }
  });

  it("rejects a later level's program on every earlier machine and names the demo that runs it", () => {
    STEPPER_LEVELS.forEach((level, index) => {
      if (level.part === "microcode" || level.part === "cpu") return;
      // The first preset of each level is the one that needs its part.
      const program = compilePreset(level.presets[0], level, "hardware").program;
      for (const earlier of STEPPER_LEVELS.slice(0, index)) {
        const problem = levelProblem(program, earlier);
        expect(problem, `${level.part} on ${earlier.part}`).not.toBeNull();
        // The demo named is the first one whose part the earlier machine lacks.
        expect(hasPart(earlier, stepperLevel(partOf(problem!.demo!)).part)).toBe(false);
      }
    });
  });

  it("says which line needs the missing part", () => {
    const cpu = stepperLevel("cpu");
    // Main is compiled first, so the first CALL is the call site on line 6.
    expect(levelProblem(compileProgram(SAMPLE_PROGRAMS.FUNCTION), cpu)).toEqual({
      message: "Line 6: A function needs a call stack, and this machine has none yet.",
      demo: "call-stack",
    });
    expect(levelProblem(compileProgram("let x = 1;\nscreen[2] = x;"), cpu)).toEqual({
      message: "Line 2: screen[…] needs a screen, and this machine has none yet.",
      demo: "memory-mapped-screen",
    });
    expect(levelProblem(compileProgram("plot(1, 2);"), stepperLevel("screen"))?.demo).toBe(
      "pixel-port",
    );
    // A program with a call and a screen write first lacks the earlier part.
    const both = compileProgram("fn row(n) {\n  screen[0] = n;\n}\nrow(3);");
    expect(levelProblem(both, cpu)?.demo).toBe("call-stack");
    expect(levelProblem(both, stepperLevel("calls"))?.demo).toBe("memory-mapped-screen");
    expect(levelProblem(both, stepperLevel("screen"))).toBeNull();
    expect(levelProblem(compileProgram(SAMPLE_PROGRAMS.LOOP), cpu)).toBeNull();
  });

  it("tells the big screen's window, port and blitter apart", () => {
    const parts = (source: string) => [...partsUsed(compileProgram(source)).keys()];
    expect(parts(SAMPLE_PROGRAMS.BANKS)).toEqual(["bankWindow"]);
    expect(parts(SAMPLE_PROGRAMS.PORT)).toEqual(["vramPort"]);
    expect(parts(SAMPLE_PROGRAMS.STAMP)).toEqual(["bigBlitter"]);
    expect(parts(SAMPLE_PROGRAMS.BLIT)).toEqual(["blitter", "screen"]);
    expect(parts(SAMPLE_PROGRAMS.CROSS)).toEqual(["pixelPort"]);
    expect(parts(SAMPLE_PROGRAMS.SMILEY)).toEqual(["screen"]);
    expect(
      [...partsUsed(compileProgram(RAM_STACK_SAMPLES.RECURSION, { stack: "ram" })).keys()].sort(),
    ).toEqual(["calls", "ramStack"]);
  });

  it("points a recursion error at the stack-in-RAM demo until the machine has that CPU", () => {
    let message = "";
    try {
      compileProgram(RAM_STACK_SAMPLES.RECURSION);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/stack-in-RAM CPU/);
    expect(compileProblem(message, stepperLevel("calls"))).toEqual({
      message,
      demo: "stack-in-ram",
    });
    expect(compileProblem(message, stepperLevel("ramStack")).demo).toBeNull();
    expect(compileProblem("Line 1: Unknown variable “x”.", stepperLevel("cpu")).demo).toBeNull();
  });

  it("gives each machine's CPU only the opcodes of its parts", () => {
    const mnemonics = (part: (typeof STEPPER_PARTS)[number], stack: StackModel = "hardware") =>
      microcodeIsa(levelMicrocode(defaultMicrocode(stack), stepperLevel(part))).map(
        ({ mnemonic }) => mnemonic,
      );
    expect(mnemonics("cpu")).toEqual([
      "LDI",
      "LDM",
      "STM",
      "ADDI",
      "ADDM",
      "SUBI",
      "SUBM",
      "OUT",
      "JMP",
      "JNC",
      "HALT",
    ]);
    expect(mnemonics("calls")).toContain("RET");
    expect(mnemonics("calls")).not.toContain("RETI");
    expect(mnemonics("ramStack", "ram")).toContain("ADDSP");
    expect(mnemonics("ramStack", "ram")).not.toContain("IN");
    expect(mnemonics("interrupts")).toContain("RETI");
    // From the key port on, the table is the CPU's whole default table.
    const full = defaultMicrocode("hardware");
    expect(levelMicrocode(full, stepperLevel("screen"))).toBe(full);
  });
});

/** The part a demo's level adds. */
const partOf = (slug: string) => STEPPER_LEVELS.find((level) => level.slug === slug)!.part;
