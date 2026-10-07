import { describe, expect, it } from "vitest";
import {
  BIG_FRAME_BYTES,
  BIG_PORT,
  BIG_TILES,
  BLITTER_PORT,
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
  windowByte,
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

describe("blitter", () => {
  const end = (source: string) => traceTicks(compileProgram(source)).at(-1)!;
  const blank = Array(SCREEN_ROWS).fill(0);
  const rows = (changes: Record<number, number>, base = blank) =>
    base.map((row, y) => changes[y] ?? row);

  it("draws each command's rows", () => {
    expect(end("blit(clear, 170);").screen).toEqual(Array(SCREEN_ROWS).fill(170));
    expect(end("screen[4] = 9;\nblit(wait);\nblit(clear);").screen).toEqual(blank);
    expect(end("blit(fill, 2, 15);").screen).toEqual(rows({ 2: 15 }));
    // HLINE wraps round the row: x = 6, 7, 0, 1, 2.
    expect(end("blit(hline, 6, 3, 5);").screen).toEqual(rows({ 3: 0b11000111 }));
    expect(end("blit(hline, 0, 0, 8);").screen).toEqual(rows({ 0: 255 }));
    // VLINE wraps down the screen: rows 5, 6, 7, 0, 1, 2. Colour 0 clears.
    expect(end("blit(vline, 1, 5, 6);").screen).toEqual(
      rows({ 5: 2, 6: 2, 7: 2, 0: 2, 1: 2, 2: 2 }),
    );
    expect(end("blit(clear, 255);\nblit(vline, 7, 0, 2, 0);").screen).toEqual(
      rows({ 0: 127, 1: 127 }, Array(SCREEN_ROWS).fill(255)),
    );
    expect(end("let y = 6;\nblit(pixel, 3, y);").screen).toEqual(rows({ 6: 8 }));
    // COPY SPRITE writes rows y, y + 1, … from the sprite's 8 bytes in code ROM.
    expect(end("sprite s = [1, 2, 3, 4, 5, 6, 7, 8];\nblit(sprite, s, 6);").screen).toEqual([
      3, 4, 5, 6, 7, 8, 1, 2,
    ]);
  });

  it("keeps sprite rows in code ROM after the code and points ARG at them", () => {
    const program = compileProgram(
      "sprite a = [1, 2, 3, 4, 5, 6, 7, 8];\nsprite b = [9, 9, 9, 9, 9, 9, 9, 9];\nblit(sprite, b, 0);",
    );
    const code = program.instructions.length * 2;
    expect(program.bytes.slice(code)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, ...Array(8).fill(9)]);
    const load = program.instructions.find(({ label }) => label === "SPRITE b ADDRESS")!;
    expect(load.operand).toBe(code + 8);
  });

  it("runs one row per clock edge while the CPU keeps executing", () => {
    const ticks = traceTicks(compileProgram(SAMPLE_PROGRAMS.BLIT));
    const start = ticks.findIndex(
      ({ control, registers }) =>
        control.includes("RAM_IN") && registers.dmar === BLITTER_PORT.cmd && registers.acc === 6,
    );
    expect(ticks[start].blitter).toMatchObject({ busy: true, i: 0, op: 6 });
    const drawn = ticks.filter(({ screenWrite }) => screenWrite?.by === "blitter");
    // The 8 ticks after the CMD write, rows 0–7 in order; BUSY clears on the last edge.
    expect(drawn.map(({ index }) => index)).toEqual(
      Array.from({ length: 8 }, (_, i) => start + 1 + i),
    );
    expect(drawn.map(({ screenWrite }) => screenWrite!.y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(drawn.slice(0, 7).every(({ blitter }) => blitter.busy)).toBe(true);
    expect(drawn[7].blitter.busy).toBe(false);
    // Meanwhile the CPU moved on: those ticks belong to the next instructions.
    expect(new Set(drawn.map(({ instruction }) => instruction)).size).toBeGreaterThan(1);
    expect(drawn.every(({ instruction }) => instruction > ticks[start].instruction)).toBe(true);
    const last = ticks.at(-1)!;
    expect(last.screen).toEqual([102, 255, 255, 255, 126, 60, 24, 255]);
    expect(last.output).toEqual([1, 2, 3]);
    expect(last.halted).toBe(true);
  });

  it("reads BUSY, ignores writes while busy, and loses CPU screen writes", () => {
    const { LDI, LDM, STM, SUBI, JNC, OUT, HALT } = OPCODES;
    const pairs: [number, number][] = [];
    // Only the instruction right after STM E4 lands inside its 8 busy ticks.
    const clear = (...then: [number, number][]) => {
      pairs.push([LDI, 1], [STM, BLITTER_PORT.cmd], ...then);
      const wait = pairs.length * 2;
      pairs.push([LDM, BLITTER_PORT.cmd], [SUBI, 1], [JNC, wait]);
    };
    pairs.push([LDI, 255], [STM, BLITTER_PORT.colour]);
    clear([STM, 0xe8]); // E8 repeats X: ignored while busy, X stays 0
    clear([STM, 0xf2]); // ACC is 1, but the blitter owns the screen: lost
    clear([LDM, 0xec], [OUT, 0]); // EC repeats CMD: BUSY reads 1
    pairs.push([LDM, BLITTER_PORT.x], [OUT, 0], [HALT, 0]); // idle: any E_ reads 0
    const program = {
      instructions: pairs.map(([opcode, operand], index) => ({
        address: index * 2,
        opcode,
        operand,
        label: "",
        line: index + 1,
      })),
      bytes: pairs.flat(),
      variables: [],
    };
    const ticks = traceTicks(program);
    const last = ticks.at(-1)!;
    expect(last.blitter).toMatchObject({ x: 0, colour: 255, busy: false });
    expect(last.screen).toEqual(Array(SCREEN_ROWS).fill(255));
    expect(last.output).toEqual([1, 0]);
    const blocked = ticks.filter(({ screenBlocked }) => screenBlocked);
    expect(blocked).toHaveLength(1);
    expect(blocked[0].registers.dmar).toBe(0xf2);
    expect(blocked[0].screenWrite?.by).toBe("blitter");
    const explanations = traceProgram(program).map(({ explanation }) => explanation);
    expect(explanations.filter((text) => text.includes("write was lost"))).toHaveLength(1);
    expect(explanations.filter((text) => text.includes("BUSY and ignores"))).toHaveLength(1);
  });

  it("explains the blitter's work beside the CPU's", () => {
    const snapshots = traceProgram(compileProgram(SAMPLE_PROGRAMS.BLIT));
    const notes = snapshots.filter(({ explanation }) =>
      explanation.includes("Meanwhile the blitter"),
    );
    expect(notes.length).toBeGreaterThan(2);
    expect(notes.at(-1)!.explanation).toMatch(/finished its SPRITE/);
    expect(
      snapshots.some(({ explanation }) => /Start the blitter's SPRITE command/.test(explanation)),
    ).toBe(true);
    expect(describeOperand(OPCODES.STM, BLITTER_PORT.cmd, []).long).toBe("blitter cmd (E4)");
  });

  it("rejects bad blit calls and sprites", () => {
    expect(() => compileProgram("blit(spin);")).toThrow("Unknown blitter command");
    expect(() => compileProgram("blit(hline, 0, 0);")).toThrow(
      "Use blit(hline, x, y, length, colour?);",
    );
    expect(() => compileProgram("blit(hline, 0, 0, 9);")).toThrow("Blitter length is 1 to 8.");
    expect(() => compileProgram("blit(pixel, 8, 0);")).toThrow("Blitter x is 0 to 7.");
    expect(() => compileProgram("blit(sprite, ghost, 0);")).toThrow("Unknown sprite “ghost”.");
    expect(() => compileProgram("sprite s = [1, 2];")).toThrow("A sprite is 8 row bytes");
    expect(() => compileProgram("sprite s = [1, 2, 3, 4, 5, 6, 7, 256];")).toThrow(
      "between 0 and 255",
    );
    expect(() => compileProgram("loop {\n  sprite s = [1, 2, 3, 4, 5, 6, 7, 8];\n}")).toThrow(
      "top level",
    );
    expect(() => compileProgram("fn blit(n) {\n  return n;\n}")).toThrow("reserved");
    expect(() =>
      compileProgram("fn on_key(k) {\n  blit(fill, 0, k);\n}\nloop {\n  blit(clear);\n}"),
    ).toThrow("both use the blitter");
  });

  it("waits for a running command before HALT stops the clock", () => {
    const program = compileProgram("blit(clear, 255);");
    const halt = program.instructions.length - 1;
    expect(program.instructions.slice(halt - 3).map(({ label }) => label)).toEqual([
      "READ BLITTER BUSY",
      "BUSY − 1",
      "WAIT WHILE BUSY",
      "HALT",
    ]);
    expect(traceTicks(program).at(-1)!.blitter.busy).toBe(false);
  });
});

describe("big screen bank window", () => {
  const SMILEY = [60, 66, 165, 129, 165, 153, 66, 60];

  it("maps window row r of tile t onto the 32×32 frame by wiring alone", () => {
    // BANK bits 0–1 pick the byte column, bits 2–3 the group of 8 rows.
    expect(windowByte(0, 0)).toBe(0);
    expect(windowByte(1, 0)).toBe(1);
    expect(windowByte(4, 0)).toBe(32);
    expect(windowByte(6, 7)).toBe(62);
    expect(windowByte(15, 7)).toBe(127);
    for (let bank = 0; bank < BIG_TILES; bank++)
      for (let r = 0; r < 8; r++) {
        const wired = (bank & 3) | ((r & 7) << 2) | ((bank >> 2) << 5);
        expect(windowByte(bank, r)).toBe(wired);
      }
  });

  it("draws the BANKS sample: four smileys on the diagonal tiles", () => {
    const end = traceTicks(compileProgram(SAMPLE_PROGRAMS.BANKS)).at(-1)!;
    const expected = Array(BIG_FRAME_BYTES).fill(0);
    for (const tile of [0, 5, 10, 15])
      SMILEY.forEach((row, r) => {
        expected[windowByte(tile, r)] = row;
      });
    expect(end.frame).toEqual(expected);
    expect(end.registers.bank).toBe(15);
    expect(end.screen).toEqual(Array(SCREEN_ROWS).fill(0));
    expect(end.ram.slice(1)).toEqual(Array(15).fill(0));
  });

  it("reads the window and BANK back, and keeps D9–DF away from RAM", () => {
    const { LDI, LDM, STM, ADDM, OUT, HALT } = OPCODES;
    const pairs: [number, number][] = [
      [LDI, 0x81],
      [STM, BIG_PORT.window],
      [LDI, 6],
      [STM, BIG_PORT.bank],
      [LDI, 0x42],
      [STM, BIG_PORT.window + 7],
      [ADDM, BIG_PORT.bank],
      [OUT, 0],
      [LDI, 0x1f],
      [STM, BIG_PORT.bank],
      [STM, 0xdc],
      [LDM, 0x0c],
      [OUT, 0],
      [LDI, 0],
      [STM, BIG_PORT.bank],
      [LDM, BIG_PORT.window],
      [OUT, 0],
      [HALT, 0],
    ];
    const ticks = traceTicks({
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
    const end = ticks.at(-1)!;
    expect(end.output).toEqual([0x48, 0, 0x81]);
    expect(end.frame[0]).toBe(0x81);
    expect(end.frame[62]).toBe(0x42);
    expect(end.ram).toEqual(Array(16).fill(0));
    expect(
      ticks.filter(({ frameWrite }) => frameWrite).map(({ frameWrite }) => frameWrite),
    ).toEqual([
      { byte: 0, value: 0x81 },
      { byte: 62, value: 0x42 },
    ]);
  });

  it("compiles bank() and window[], and rejects what does not fit", () => {
    const program = compileProgram("let t = 9;\nbank(t);\nwindow[3] = 7;\nprint(window[3]);");
    expect(program.bytes.slice(4, 12)).toEqual([
      OPCODES.LDM,
      0,
      OPCODES.STM,
      BIG_PORT.bank,
      OPCODES.LDI,
      7,
      OPCODES.STM,
      BIG_PORT.window + 3,
    ]);
    expect(traceProgram(program).at(-1)?.output).toEqual([7]);
    expect(
      traceProgram(program).some(({ explanation }) =>
        /tile 9, column 1 and row 2/.test(explanation),
      ),
    ).toBe(true);
    expect(() => compileProgram("bank(16);")).toThrow("tiles are 0 to 15");
    expect(() => compileProgram("window[8] = 1;")).toThrow("Window rows are 0 to 7.");
    expect(() => compileProgram("let window[0] = 1;")).toThrow("not a variable");
    expect(() => compileProgram("fn bank(n) {\n  return n;\n}")).toThrow("reserved");
    expect(describeOperand(OPCODES.STM, 0xd5, []).long).toBe("big-screen window row 5 (D5)");
  });
});

describe("big screen port", () => {
  it("draws the PORT sample: a band across row 0 and a line down column 8", () => {
    const end = traceTicks(compileProgram(SAMPLE_PROGRAMS.PORT)).at(-1)!;
    const expected = Array(BIG_FRAME_BYTES).fill(0);
    for (let c = 0; c < 4; c++) expected[c] = 255;
    for (let j = 0; j < 12; j++) expected[5 + 4 * j] = 1; // rows 1–12, byte 1, bit 0: x = 8
    expect(end.frame).toEqual(expected);
    expect(end.registers).toMatchObject({ portAddr: 5 + 4 * 12, portDown: true });
  });

  it("moves ADDR after every DA read or write, by 1 or by 4, and wraps at 128", () => {
    const { LDI, LDM, STM, ADDM, OUT, HALT } = OPCODES;
    const pairs: [number, number][] = [
      [LDI, 126],
      [STM, BIG_PORT.addr],
      [LDI, 0xaa],
      [STM, BIG_PORT.data],
      [STM, BIG_PORT.data],
      [LDM, BIG_PORT.addr],
      [OUT, 0],
      [LDI, 1],
      [STM, BIG_PORT.step],
      [LDI, 0x0f],
      [STM, BIG_PORT.data],
      [STM, BIG_PORT.data],
      [LDI, 4],
      [STM, BIG_PORT.addr],
      [LDM, BIG_PORT.data],
      [OUT, 0],
      [ADDM, BIG_PORT.data],
      [LDM, BIG_PORT.addr],
      [OUT, 0],
      [HALT, 0],
    ];
    const program = {
      instructions: pairs.map(([opcode, operand], index) => ({
        address: index * 2,
        opcode,
        operand,
        label: "",
        line: index + 1,
      })),
      bytes: pairs.flat(),
      variables: [],
    };
    const end = traceTicks(program).at(-1)!;
    expect(end.output).toEqual([0, 0x0f, 12]);
    expect([end.frame[126], end.frame[127], end.frame[0], end.frame[4]]).toEqual([
      0xaa, 0xaa, 0x0f, 0x0f,
    ]);
    const explained = traceProgram(program).map(({ explanation }) => explanation);
    expect(explained.some((text) => /byte 127 .*ADDR moves on by 1 to 0/.test(text))).toBe(true);
    expect(
      explained.some((text) => /Read the 15 stored in big-screen byte 4.*by 4 to 8/.test(text)),
    ).toBe(true);
  });

  it("compiles the port calls and rejects bad ones", () => {
    const program = compileProgram(
      "vram_at(9);\nvram_step(4);\nlet v = 3;\nvram(v);\nlet r = vram_read();",
    );
    const { LDI, LDM, STM } = OPCODES;
    expect(program.bytes.slice(0, 12)).toEqual([
      LDI,
      9,
      STM,
      BIG_PORT.addr,
      LDI,
      1,
      STM,
      BIG_PORT.step,
      LDI,
      3,
      STM,
      0,
    ]);
    expect(program.bytes.slice(12, 18)).toEqual([LDM, 0, STM, BIG_PORT.data, LDM, BIG_PORT.data]);
    expect(() => compileProgram("vram_at(128);")).toThrow("Big-screen bytes are 0 to 127.");
    expect(() => compileProgram("vram_step(2);")).toThrow("vram_step(1);");
    expect(() => compileProgram("vram();")).toThrow("Use vram(value);");
    expect(() => compileProgram("fn vram(n) {\n  return n;\n}")).toThrow("built in");
    expect(() => compileProgram("fn on_key(k) {\n  vram(k);\n}\nloop {\n  bank(1);\n}")).toThrow(
      "BANK or port",
    );
  });
});
