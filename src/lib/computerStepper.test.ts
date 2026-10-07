import { describe, expect, it } from "vitest";
import {
  byteBits,
  compileProgram,
  decodeInstruction,
  describeOperand,
  encodeInstruction,
  OPCODES,
  PIXEL_PORT,
  SAMPLE_PROGRAMS,
  SCREEN_BASE,
  SCREEN_ROWS,
  traceProgram,
  traceTicks,
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
    expect(() => compileProgram("if (x) print(x);")).toThrow("Use if (a < b)");
    expect(() => compileProgram("while (x) {")).toThrow("Use let");
    expect(() => compileProgram("fn a() {\n  a();\n}\na();")).toThrow("Recursive calls");
    expect(() => encodeInstruction(0xff, 0)).toThrow("Unknown opcode");
    expect(decodeInstruction([OPCODES.LDI, 7])?.mnemonic).toBe("LDI");
  });
});

describe("memory-mapped screen", () => {
  const raw = (pairs: [number, number][]) => ({
    instructions: pairs.map(([opcode, operand], index) => ({
      address: index * 2,
      opcode,
      operand,
      label: `RAW ${index}`,
      line: index + 1,
    })),
    bytes: pairs.flat(),
    variables: [],
  });

  it("STM F0–F7 writes screen rows 0–7 and leaves RAM alone", () => {
    const pairs: [number, number][] = [];
    for (let row = 0; row < SCREEN_ROWS; row++)
      pairs.push([OPCODES.LDI, 1 << row], [OPCODES.STM, SCREEN_BASE + row]);
    pairs.push([OPCODES.HALT, 0]);
    const end = traceTicks(raw(pairs)).at(-1)!;
    expect(end.screen).toEqual([1, 2, 4, 8, 16, 32, 64, 128]);
    expect(end.ram).toEqual(Array(16).fill(0));
  });

  it("LDM and ADDM read a screen row back", () => {
    const end = traceTicks(
      raw([
        [OPCODES.LDI, 0x42],
        [OPCODES.STM, 0xf5],
        [OPCODES.LDI, 1],
        [OPCODES.ADDM, 0xf5],
        [OPCODES.OUT, 0],
        [OPCODES.LDM, 0xf5],
        [OPCODES.OUT, 0],
        [OPCODES.HALT, 0],
      ]),
    ).at(-1)!;
    expect(end.output).toEqual([0x43, 0x42]);
    expect(end.screen[5]).toBe(0x42);
  });

  it("keeps RAM addressing unchanged: other high nibbles reach RAM by the low 4 bits", () => {
    const end = traceTicks(
      raw([
        [OPCODES.LDI, 9],
        [OPCODES.STM, 0x13],
        [OPCODES.LDI, 7],
        [OPCODES.STM, 0x0e],
        [OPCODES.LDM, 0x03],
        [OPCODES.OUT, 0],
        [OPCODES.HALT, 0],
      ]),
    ).at(-1)!;
    expect(end.ram[3]).toBe(9);
    expect(end.ram[14]).toBe(7);
    expect(end.output).toEqual([9]);
    expect(end.screen).toEqual(Array(SCREEN_ROWS).fill(0));
  });

  it("compiles screen[n] to data addresses F0–F7", () => {
    const program = compileProgram("screen[3] = 24;\nlet x = screen[3] + 1;\nprint(x);");
    expect(program.bytes.slice(0, 4)).toEqual([OPCODES.LDI, 24, OPCODES.STM, 0xf3]);
    expect(program.bytes.slice(4, 6)).toEqual([OPCODES.LDM, 0xf3]);
    expect(program.variables).toEqual([{ name: "x", address: 0 }]);
    const end = traceProgram(program).at(-1)!;
    expect(end.screen[3]).toBe(24);
    expect(end.output).toEqual([25]);
    expect(end.ram[0]).toBe(25);
    expect(describeOperand(OPCODES.STM, 0xf3, []).long).toBe("screen row 3 (F3)");
    expect(() => compileProgram("screen[8] = 1;")).toThrow("Screen rows are 0 to 7");
    expect(() => compileProgram("let screen[0] = 1;")).toThrow("not a variable");
  });

  it("does not mark RAM as touched by a screen write", () => {
    const trace = traceProgram(compileProgram("screen[0] = 1;"));
    expect(trace.every(({ touchedAddress }) => touchedAddress === null)).toBe(true);
  });

  it("draws the sample programs", () => {
    expect(traceProgram(compileProgram(SAMPLE_PROGRAMS.SMILEY)).at(-1)?.screen).toEqual([
      60, 66, 165, 129, 165, 153, 66, 60,
    ]);
    const sweep = traceProgram(compileProgram(SAMPLE_PROGRAMS.SWEEP));
    const rows = [...new Set(sweep.map(({ screen }) => screen[3]))];
    expect(rows).toEqual([0, 1, 2, 4, 8, 16, 32, 64, 128]);
    expect(sweep.at(-1)?.output).toEqual([128]);
  });
});

describe("pixel port and plot", () => {
  const raw = (pairs: [number, number][]) => ({
    instructions: pairs.map(([opcode, operand], index) => ({
      address: index * 2,
      opcode,
      operand,
      label: "",
      line: index + 1,
    })),
    bytes: pairs.flat(),
    variables: [],
  });
  const { LDI, LDM, STM, OUT, HALT } = OPCODES;

  it("F8 and F9 set the cursor, FA writes ACC bit 0 to that one pixel", () => {
    const ticks = traceTicks(
      raw([
        [LDI, 0xff],
        [STM, 0xf2], // row 2 all on
        [LDI, 13], // low 3 bits: 5
        [STM, PIXEL_PORT.x],
        [LDI, 2],
        [STM, PIXEL_PORT.y],
        [LDI, 2], // bit 0 is 0: pixel off
        [STM, PIXEL_PORT.pixel],
        [LDM, 0xfd], // any port address reads the cursor's row
        [OUT, 0],
        [LDI, 0],
        [STM, 0xfc], // FC repeats F8: x = 0
        [LDI, 1],
        [STM, 0xff], // FF repeats FA (A1 set)
        [HALT, 0],
      ]),
    );
    const end = ticks.at(-1)!;
    expect(end.screen[2]).toBe(0xff & ~(1 << 5));
    expect(end.output).toEqual([0xdf]);
    expect(end.registers).toMatchObject({ pixelX: 0, pixelY: 2 });
    expect(end.ram).toEqual(Array(16).fill(0));
    const writes = ticks.flatMap(({ screenWrite }) => (screenWrite ? [screenWrite] : []));
    expect(writes).toEqual([
      { y: 2, x: null, row: 0xff },
      { y: 2, x: 5, row: 0xdf },
      { y: 2, x: 0, row: 0xdf },
    ]);
    // A write is recorded on the tick whose clock edge stores it: STM's last tick.
    for (const tick of ticks.filter(({ screenWrite }) => screenWrite))
      expect(tick.control).toContain("RAM_IN");
  });

  it("compiles plot(x, y) to three stores and draws the CROSS sample", () => {
    const program = compileProgram("let a = 3;\nplot(a, 6);\nplot(1, 1, 0);");
    expect(program.bytes.slice(4, 16)).toEqual([
      LDM,
      0,
      STM,
      PIXEL_PORT.x,
      LDI,
      6,
      STM,
      PIXEL_PORT.y,
      LDI,
      1,
      STM,
      PIXEL_PORT.pixel,
    ]);
    expect(program.bytes.slice(24, 28)).toEqual([LDI, 0, STM, PIXEL_PORT.pixel]);
    expect(traceProgram(program).at(-1)?.screen[6]).toBe(8);
    const cross = traceProgram(compileProgram(SAMPLE_PROGRAMS.CROSS));
    expect(cross.at(-1)?.screen).toEqual([0x81, 0x42, 0x24, 0x18, 0x18, 0x24, 0x42, 0x81]);
    // The stepper sees the grid fill in one pixel per plot.
    const plotted = cross.filter(({ screenWrite }) => screenWrite);
    expect(plotted).toHaveLength(16);
    expect(
      plotted.every(({ phase, screenWrite }) => phase === "execute" && screenWrite!.x !== null),
    ).toBe(true);
    expect(plotted[3].explanation).toMatch(/turns pixel \(1, 6\) on/);
    expect(describeOperand(STM, PIXEL_PORT.y, []).long).toBe("pixel y (F9)");
  });

  it("rejects plots it can tell are off the screen, and plot as a name", () => {
    expect(() => compileProgram("plot(8, 0);")).toThrow("Pixel x is 0 to 7");
    expect(() => compileProgram("plot(0, 9);")).toThrow("Pixel y is 0 to 7");
    expect(() => compileProgram("plot(0, 0, 2);")).toThrow("Pixel colour is 0 to 1");
    expect(() => compileProgram("plot(1 + 2, 0);")).toThrow("Use plot(x, y);");
    expect(() => compileProgram("fn plot(n) {\n  return n;\n}")).toThrow("reserved");
  });

  it("rejects a key handler that plots while the main program plots too", () => {
    const both = "fn on_key(k) {\n  plot(k, 0);\n}\nloop {\n  plot(1, 1);\n}";
    expect(() => compileProgram(both)).toThrow("both plot");
    expect(() => compileProgram(both, { stack: "ram" })).toThrow("both plot");
    expect(() =>
      compileProgram("fn on_key(k) {\n  plot(k, 0);\n}\nloop {\n  screen[1] = 3;\n}"),
    ).not.toThrow();
  });
});
