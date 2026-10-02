import { describe, expect, it } from "vitest";
import {
  compileProgram,
  decodeInstruction,
  encodeInstruction,
  OPCODES,
  traceProgram,
} from "./computerStepper";

describe("toy compiler and CPU trace", () => {
  it("links source lines to encoded bytes and executes the result", () => {
    const program = compileProgram("let x = 2;\nx = x + 3;\nprint(x);");
    expect(program.instructions.map(({ line }) => line)).toEqual([1, 1, 2, 2, 2, 3, 3, 0]);
    expect(program.bytes.slice(0, 4)).toEqual([OPCODES.LDI, 2, OPCODES.STM, 0]);
    const trace = traceProgram(program);
    expect(trace.at(-1)?.output).toEqual([5]);
    expect(trace.at(-1)?.ram[0]).toBe(5);
    expect(trace.at(-1)?.halted).toBe(true);
    expect(trace.filter(({ phase }) => phase === "fetch")).toHaveLength(
      program.instructions.length,
    );
  });

  it("wraps eight-bit arithmetic and exposes the carry flag", () => {
    const trace = traceProgram(compileProgram("let x = 255;\nx = x + 1;\nprint(x);"));
    const add = trace.find(({ explanation }) => explanation.startsWith("ALU adds"));
    expect(add?.accumulator).toBe(0);
    expect(add?.carry).toBe(true);
    expect(trace.at(-1)?.output).toEqual([0]);
  });

  it("rejects unsupported or unsafe source and unknown opcodes", () => {
    expect(() => compileProgram("print(y);")).toThrow("Unknown variable");
    expect(() => compileProgram("let x = 256;")).toThrow("between 0 and 255");
    expect(() => compileProgram("let x = x + 1;")).toThrow("has no value yet");
    expect(() => compileProgram("if (x) print(x);")).toThrow("Use let");
    expect(() => encodeInstruction(0xff, 0)).toThrow("Unknown opcode");
    expect(decodeInstruction([OPCODES.LDI, 7])?.mnemonic).toBe("LDI");
  });
});
