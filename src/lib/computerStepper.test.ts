import { describe, expect, it } from "vitest";
import {
  byteBits,
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
    expect(byteBits(program.bytes[0])).toBe("00010000");
  });

  it("wraps eight-bit arithmetic and exposes the carry flag", () => {
    const trace = traceProgram(compileProgram("let x = 255;\nx = x + 1;\nprint(x);"));
    const add = trace.find(({ explanation }) => explanation.startsWith("ALU adds"));
    expect(add?.accumulator).toBe(0);
    expect(add?.carry).toBe(true);
    expect(trace.at(-1)?.output).toEqual([0]);
  });

  it("runs a for loop by revisiting its instruction addresses", () => {
    const source = "let sum = 0;\nfor (let i = 0; i < 4; i++) {\n  sum = sum + i;\n}\nprint(sum);";
    const program = compileProgram(source);
    const trace = traceProgram(program);
    expect(trace.at(-1)?.output).toEqual([6]);
    const add = program.instructions.find(({ line, label }) => line === 3 && label === "ADD i");
    expect(
      trace.filter(
        ({ phase, activeAddress }) => phase === "fetch" && activeAddress === add?.address,
      ),
    ).toHaveLength(4);
    expect(program.instructions.some(({ opcode }) => opcode === OPCODES.JNC)).toBe(true);
    expect(program.instructions.some(({ opcode }) => opcode === OPCODES.JMP)).toBe(true);
  });

  it("calls a one-argument function, returns a value, and shows the return stack", () => {
    const source =
      "fn bump(n) {\n  return n + 1;\n}\nlet x = 2;\nfor (let i = 0; i < 3; i++) {\n  x = bump(x);\n}\nprint(x);";
    const program = compileProgram(source);
    const trace = traceProgram(program);
    expect(trace.at(-1)?.output).toEqual([5]);
    expect(trace.at(-1)?.stack).toEqual([]);
    expect(trace.some(({ stack }) => stack.length === 1)).toBe(true);
    expect(
      program.instructions.some(({ opcode, line }) => opcode === OPCODES.CALL && line === 6),
    ).toBe(true);
    expect(
      program.instructions.some(({ opcode, line }) => opcode === OPCODES.RET && line === 2),
    ).toBe(true);
  });

  it("supports a no-argument subroutine and function defined after its call", () => {
    const program = compileProgram("hello();\nfn hello() {\n  print(7);\n  return;\n}");
    expect(traceProgram(program).at(-1)?.output).toEqual([7]);
  });

  it("keeps nested loop counters and nested function return addresses separate", () => {
    const source =
      "fn twice(n) {\n  return n + n;\n}\nfn plusOne(n) {\n  let doubled = twice(n);\n  return doubled + 1;\n}\nlet count = 0;\nfor (let i = 0; i < 2; i++) {\n  for (let j = 0; j < 2; j++) {\n    count = count + 1;\n  }\n}\nprint(plusOne(count));";
    const trace = traceProgram(compileProgram(source));
    expect(trace.at(-1)?.output).toEqual([9]);
    expect(Math.max(...trace.map(({ stack }) => stack.length))).toBe(2);
  });

  it("rejects invalid source, recursion, and unknown opcodes", () => {
    expect(() => compileProgram("print(y);")).toThrow("Unknown variable");
    expect(() => compileProgram("let x = 256;")).toThrow("between 0 and 255");
    expect(() => compileProgram("let x = x + 1;")).toThrow("has no value yet");
    expect(() => compileProgram("fn f(n) {\n  return n;\n}\nlet x = f(x);")).toThrow(
      "has no value yet",
    );
    expect(() => compileProgram("if (x) print(x);")).toThrow("Use let");
    expect(() => compileProgram("fn a() {\n  a();\n}\na();")).toThrow("Recursive calls");
    expect(() => encodeInstruction(0xff, 0)).toThrow("Unknown opcode");
    expect(decodeInstruction([OPCODES.LDI, 7])?.mnemonic).toBe("LDI");
  });
});
