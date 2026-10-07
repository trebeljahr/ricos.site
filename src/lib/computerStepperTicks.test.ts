import { describe, expect, it } from "vitest";
import {
  type CompiledProgram,
  compileProgram,
  controlWord,
  decodeControlWord,
  EXECUTE_STEPS,
  INT_OPCODE,
  INTERRUPT_SAMPLES,
  INTERRUPT_STEPS,
  INTERRUPT_VECTOR,
  ISA,
  isaFor,
  MAX_T_STATES,
  microcodeAddress,
  microcodeRom,
  OPCODES,
  RAM_STACK_SAMPLES,
  SAMPLE_PROGRAMS,
  STACK_MODELS,
  traceProgram,
  traceTicks,
} from "./computerStepper";
import { legacyTraceProgram } from "./computerStepperLegacy.fixture";

function raw(pairs: [number, number][]): CompiledProgram {
  return {
    instructions: pairs.map(([opcode, operand], index) => ({
      address: index * 2,
      opcode,
      operand,
      label: `RAW ${index}`,
      line: index + 1,
    })),
    bytes: pairs.flat(),
    variables: [],
  };
}

const deepCalls = Array.from(
  { length: 17 },
  (_, index) =>
    `fn f${index}() {\n  ${index < 16 ? `f${index + 1}();` : "print(1);"}\n  return;\n}`,
).join("\n");

// The old interpreter predates the blitter and the big screen: BLIT and BANKS have their own tests in computerStepper.test.ts.
const { BLIT: _blit, BANKS: _banks, ...LEGACY_SAMPLES } = SAMPLE_PROGRAMS;

const SOURCES: Record<string, string> = {
  ...LEGACY_SAMPLES,
  callReturn:
    "fn twice(n) {\n  return n + n;\n}\nfn plusOne(n) {\n  let doubled = twice(n);\n  return doubled + 1;\n}\nlet count = 0;\nfor (let i = 0; i < 2; i++) {\n  for (let j = 0; j < 2; j++) {\n    count = count + 1;\n  }\n}\nprint(plusOne(count));",
  loopJnc:
    "let total = 0;\nlet step = 3;\nfor (let i = 1; i < 6; i = i + 2) {\n  total = total + i;\n  total = total - step;\n  print(total);\n}\nprint(total);",
  noArgument: "hello();\nfn hello() {\n  print(7);\n  return;\n}",
  wrapBelowZero: "let x = 1;\nx = x - 2;\nprint(x);",
  stackOverflow: `f0();\n${deepCalls}`,
};

const PROGRAMS: Record<string, CompiledProgram> = {
  ...Object.fromEntries(
    Object.entries(SOURCES).map(([name, source]) => [name, compileProgram(source)]),
  ),
  retOnEmptyStack: raw([[OPCODES.RET, 0]]),
  unknownOpcode: raw([
    [OPCODES.LDI, 9],
    [0x05, 0],
  ]),
  missingInstruction: raw([[OPCODES.JMP, 0x40]]),
  endlessLoop: raw([
    [OPCODES.ADDI, 1],
    [OPCODES.JMP, 0],
  ]),
  // The InstructionEncoder's three-instruction programs.
  ...Object.fromEntries(
    (["LDI", "ADDI", "SUBI", "OUT", "HALT"] as const).map((mnemonic) => [
      `encoder${mnemonic}`,
      raw([
        [OPCODES.LDI, 2],
        [OPCODES[mnemonic], mnemonic === "OUT" || mnemonic === "HALT" ? 0 : 200],
        [OPCODES.HALT, 0],
      ]),
    ]),
  ),
};

describe("microcode table", () => {
  it("fetches both bytes in T0–T3 for every opcode and either carry", () => {
    const fetch = controlWord(OPCODES.LDI, 0, false);
    for (const { opcode } of ISA)
      for (const carry of [false, true])
        for (let t = 0; t < 4; t++)
          expect(controlWord(opcode, t, carry)).toEqual(controlWord(OPCODES.LDI, t, false));
    expect(fetch).toEqual(["PC_OUT", "CMAR_IN"]);
    expect(controlWord(OPCODES.HALT, 3, true)).toEqual(["ROM_OUT", "OPR_IN", "PC_INC"]);
  });

  it("branches JNC on the carry flag and gives CALL/RET extra stack ticks", () => {
    expect(controlWord(OPCODES.JNC, 4, false)).toContain("PC_IN");
    expect(controlWord(OPCODES.JNC, 4, true)).not.toContain("PC_IN");
    expect(EXECUTE_STEPS.CALL).toHaveLength(3);
    expect(controlWord(OPCODES.CALL, 5, false)).toEqual(["SP_INC"]);
    expect(controlWord(OPCODES.RET, 4, false)).toEqual(["SP_DEC"]);
  });

  for (const stack of ["hardware", "ram"] as const) {
    it(`${stack} stack: ends every opcode with STEP_RESET or HALT within the ROM's T-states`, () => {
      for (const { opcode } of ISA)
        for (const carry of [false, true]) {
          let t = 4;
          while (t < MAX_T_STATES && controlWord(opcode, t, carry, stack).length) t++;
          const final = controlWord(opcode, t - 1, carry, stack);
          expect(final.includes("STEP_RESET") || final.includes("HALT")).toBe(true);
          expect(t).toBeLessThanOrEqual(MAX_T_STATES);
        }
    });

    it(`${stack} stack: generates a microcode ROM that decodes back to the table`, () => {
      const rom = microcodeRom(stack);
      for (let opcode = 0; opcode < 256; opcode++)
        for (let t = 0; t < MAX_T_STATES; t++)
          for (const carry of [false, true])
            expect(new Set(decodeControlWord(rom[microcodeAddress(opcode, t, carry)]))).toEqual(
              new Set(controlWord(opcode, t, carry, stack)),
            );
    });
  }

  it("halts the separate-stack CPU on stack-in-RAM opcodes", () => {
    const ramOnly = ISA.filter((item) => !isaFor("hardware").includes(item));
    expect(ramOnly.map((item) => item.mnemonic)).toEqual(["LDS", "STS", "ADDS", "SUBS", "ADDSP"]);
    for (const { opcode } of ramOnly) expect(controlWord(opcode, 4, false)).toEqual(["HALT"]);
  });

  it("moves CALL and RET through data RAM on the stack-in-RAM CPU", () => {
    expect(controlWord(OPCODES.CALL, 4, false, "ram")).toEqual(["SP_DEC"]);
    expect(controlWord(OPCODES.CALL, 6, false, "ram")).toEqual(["PC_OUT", "RAM_IN"]);
    expect(controlWord(OPCODES.RET, 4, false, "ram")).toEqual(["SP_OUT", "DMAR_IN", "SP_INC"]);
    for (let t = 0; t < MAX_T_STATES; t++)
      for (const opcode of [OPCODES.CALL, OPCODES.RET])
        expect(controlWord(opcode, t, false, "ram")).not.toContain("STACK_IN");
  });
});

describe("per-tick trace", () => {
  for (const [name, program] of Object.entries(PROGRAMS)) {
    it(`${name}: matches the old three-phase trace`, () => {
      const legacy = legacyTraceProgram(program);
      const derived = traceProgram(program).map(
        ({
          tick: _t,
          key: _k,
          keyReady: _r,
          interruptsOn: _i,
          keyPress: _p,
          pixelX: _x,
          pixelY: _y,
          screenWrite: _w,
          blitter: _b,
          frame: _f,
          bank: _bank,
          frameWrite: _fw,
          ...rest
        }) => rest,
      );
      expect(derived).toEqual(legacy);
      const ticks = traceTicks(program);
      const end = ticks.at(-1)!;
      const final = legacy.at(-1)!;
      expect(end.ram).toEqual(final.ram);
      expect(end.stack).toEqual(final.stack);
      expect(end.output).toEqual(final.output);
      if (name !== "missingInstruction") expect(end.registers.acc).toBe(final.accumulator);
    });

    it(`${name}: every tick has a control word and at most one bus driver`, () => {
      for (const tick of traceTicks(program)) {
        expect(tick.control.length).toBeGreaterThan(0);
        expect(tick.phase).toBe(tick.t < 2 ? "fetch" : tick.t < 4 ? "decode" : "execute");
        if (tick.busDriver) expect(tick.bus).toBeGreaterThanOrEqual(0);
        else expect(tick.bus).toBeNull();
      }
    });
  }

  it("records the LDM micro-steps with bus value and driver", () => {
    const program = compileProgram("let x = 42;\nlet y = x;");
    const ticks = traceTicks(program).filter(({ instruction }) => instruction === 2);
    expect(
      ticks.map(({ t, control, bus, busDriver }) => ({
        t,
        control,
        bus,
        busDriver,
      })),
    ).toEqual([
      { t: 0, control: ["PC_OUT", "CMAR_IN"], bus: 4, busDriver: "PC" },
      {
        t: 1,
        control: ["ROM_OUT", "IR_IN", "PC_INC"],
        bus: OPCODES.LDM,
        busDriver: "ROM",
      },
      { t: 2, control: ["PC_OUT", "CMAR_IN"], bus: 5, busDriver: "PC" },
      {
        t: 3,
        control: ["ROM_OUT", "OPR_IN", "PC_INC"],
        bus: 0,
        busDriver: "ROM",
      },
      { t: 4, control: ["OPR_OUT", "DMAR_IN"], bus: 0, busDriver: "OPR" },
      {
        t: 5,
        control: ["RAM_OUT", "ACC_IN", "STEP_RESET"],
        bus: 42,
        busDriver: "RAM",
      },
    ]);
    expect(ticks.at(-1)?.registers.acc).toBe(42);
  });

  it("stops on a stack fault without changing state", () => {
    const ticks = traceTicks(PROGRAMS.stackOverflow);
    const end = ticks.at(-1)!;
    expect(end.fault).toBe("Return stack is full. Execution stopped.");
    expect(end.stack).toHaveLength(16);
    expect(traceTicks(PROGRAMS.retOnEmptyStack).at(-1)?.fault).toBe(
      "Return stack is empty. Execution stopped.",
    );
  });

  it("caps an endless loop at 512 instructions", () => {
    const ticks = traceTicks(PROGRAMS.endlessLoop);
    expect(ticks.at(-1)?.instruction).toBe(511);
    expect(ticks.at(-1)?.halted).toBe(false);
  });
});

describe("stack-in-RAM trace", () => {
  const ram = (source: string) => compileProgram(source, { stack: "ram" });

  it("keeps the stack in RAM: SP counts down from 32 and the stack is RAM[1F] down to SP", () => {
    const ticks = traceTicks(ram(RAM_STACK_SAMPLES.RECURSION));
    expect(ticks[0].registers.sp).toBe(32);
    expect(ticks.at(-1)!.output).toEqual([10]);
    for (const tick of ticks) {
      expect(tick.ram).toHaveLength(STACK_MODELS.ram.ramBytes);
      expect(tick.stack).toEqual(tick.ram.slice(tick.registers.sp).reverse());
    }
    // The first CALL stores its return address (04) at RAM[1F].
    const call = ticks.find(
      (tick) => tick.control.includes("RAM_IN") && tick.registers.ir === OPCODES.CALL,
    )!;
    expect(call.ram[31]).toBe(4);
  });

  it("runs every sample program to the same output on both CPUs", () => {
    for (const source of Object.values(SAMPLE_PROGRAMS))
      expect(traceTicks(ram(source)).at(-1)!.output).toEqual(
        traceTicks(compileProgram(source)).at(-1)!.output,
      );
  });

  it("gives each call its own frame, so recursion works", () => {
    const source =
      "fn down(n) {\n  print(n);\n  if (0 < n) {\n    let next = n - 1;\n    down(next);\n  }\n  return;\n}\ndown(3);";
    expect(() => compileProgram(source)).toThrow("Recursive calls need the stack-in-RAM CPU");
    expect(traceTicks(ram(source)).at(-1)!.output).toEqual([3, 2, 1, 0]);
    const snapshots = traceProgram(ram(source));
    expect(snapshots[0].sp).toBe(32);
    expect(snapshots.at(-1)!.halted).toBe(true);
  });

  it("stops when the stack runs into a variable, and names it", () => {
    const deep = ram(`let a = 1;\n${RAM_STACK_SAMPLES.RECURSION.replace("sum(4)", "sum(9)")}`);
    const end = traceTicks(deep).at(-1)!;
    expect(end.fault).toBe(
      "Stack overflow: the stack ran into variable “a” at RAM 00. Execution stopped.",
    );
    expect(end.registers.sp).toBeGreaterThanOrEqual(1);
    expect(traceProgram(deep).at(-1)!.explanation).toContain("Stack overflow");
  });

  it("rejects a program whose variables and call chain cannot fit, at compile time", () => {
    const lets = Array.from({ length: 30 }, (_, i) => `let v${i} = 0;`).join("\n");
    expect(() => ram(`${lets}\nfn f(n) {\n  let a = 1;\n  return a;\n}\nprint(f(1));`)).toThrow(
      "Stack and variables collide: 30 variable bytes plus 3 stack bytes",
    );
  });

  it("stops on RET with an empty stack", () => {
    const end = traceTicks({ ...raw([[OPCODES.RET, 0]]), stack: "ram" }).at(-1)!;
    expect(end.fault).toContain("The stack is empty");
  });
});

describe("key port and interrupts", () => {
  const { JMP, EI, DI, IN, RETI, OUT, HALT, LDI } = OPCODES;
  const handler = "let last = 0;\nfn on_key(k) {\n  last = k;\n}\nloop {\n}";

  it("puts a jump to the handler at the interrupt vector and turns interrupts on", () => {
    for (const stack of ["hardware", "ram"] as const) {
      const program = compileProgram(handler, { stack });
      const start = program.bytes.slice(0, 6);
      expect(start.slice(0, 3)).toEqual([JMP, INTERRUPT_VECTOR + 2, JMP]);
      expect(start.slice(4)).toEqual([EI, 0]);
      const entry = program.instructions[start[3] / 2];
      expect(entry.label).toBe("SAVE ACC");
      const ops = program.instructions.map((instruction) => instruction.opcode);
      expect(ops).toContain(IN);
      expect(ops.at(-1)).toBe(RETI);
      expect(program.variables.map((variable) => variable.name)).toContain("on_key.carry");
    }
  });

  it("leaves programs without a handler unchanged", () => {
    expect(compileProgram(SAMPLE_PROGRAMS.LOOP).bytes[0]).toBe(LDI);
  });

  it("compiles loop, key(), interrupts_on() and interrupts_off()", () => {
    const program = compileProgram(
      "interrupts_off();\nlet k = key();\nprint(k);\ninterrupts_on();\nloop {\n  print(k);\n}",
    );
    const ops = program.instructions.map((instruction) => instruction.opcode);
    expect(ops.slice(0, 3)).toEqual([DI, IN, OPCODES.STM]);
    expect(ops).toContain(EI);
    const last = program.instructions.at(-2)!;
    expect(last.opcode).toBe(JMP);
    expect(last.label).toBe("LOOP FOREVER");
  });

  it("rejects calling the handler, built-in names, and shared functions on the hardware-stack CPU", () => {
    expect(() => compileProgram(`${handler}\non_key(1);`)).toThrow(/runs when a key is pressed/);
    expect(() => compileProgram("fn key() {\n  return 1;\n}")).toThrow(/built in/);
    expect(() => compileProgram("let x = key(3);")).toThrow(/takes no arguments/);
    const shared =
      "fn twice(n) {\n  return n + n;\n}\nfn on_key(k) {\n  let t = twice(k);\n}\nprint(twice(2));";
    expect(() => compileProgram(shared)).toThrow(/both call “twice”/);
    expect(compileProgram(shared, { stack: "ram" }).bytes.length).toBeGreaterThan(0);
  });

  it("enters the interrupt from T0 without a fetch, generated into the ROM as opcode EF", () => {
    for (const stack of ["hardware", "ram"] as const) {
      const steps = INTERRUPT_STEPS[stack];
      for (const [t, word] of steps.entries())
        expect(controlWord(INT_OPCODE, t, false, stack)).toEqual(word);
      expect(steps.at(-1)).toEqual(["VEC_OUT", "PC_IN", "STEP_RESET"]);
      expect(steps.length).toBeLessThanOrEqual(MAX_T_STATES);
      const rom = microcodeRom(stack);
      expect(decodeControlWord(rom[microcodeAddress(INT_OPCODE, 0, true)])).toEqual(
        decodeControlWord(rom[microcodeAddress(INT_OPCODE, 0, false)]),
      );
    }
    expect(ISA.some((item) => (item.opcode as number) === INT_OPCODE)).toBe(false);
  });

  it("latches a key press, holds it while interrupts are off, and IN clears KEY READY", () => {
    const program = raw([
      [DI, 0],
      [LDI, 1],
      [IN, 0],
      [OUT, 0],
      [HALT, 0],
    ]);
    const ticks = traceTicks(program, undefined, { 6: 77 });
    expect(ticks[6].registers.key).toBe(77);
    expect(ticks[6].registers.keyReady).toBe(true);
    expect(ticks.some((tick) => tick.interrupt)).toBe(false);
    const read = ticks.find((tick) => tick.control.includes("KEY_OUT"))!;
    expect(read.bus).toBe(77);
    expect(read.busDriver).toBe("KEY");
    expect(read.registers.keyReady).toBe(false);
    expect(ticks.at(-1)!.output).toEqual([77]);
  });

  it("shows the interrupt tick by tick in the stepper, and a later key keeps the earlier steps", () => {
    for (const stack of ["hardware", "ram"] as const) {
      const program = compileProgram(INTERRUPT_SAMPLES.KEYBOARD, { stack });
      const quiet = traceProgram(program);
      const pressed = traceProgram(program, { 40: 5 });
      const at = pressed.findIndex((snapshot) => snapshot.keyPress === 5);
      expect(pressed.slice(0, at)).toEqual(quiet.slice(0, at));
      const interrupt = pressed.filter((snapshot) => snapshot.phase === "interrupt");
      expect(interrupt).toHaveLength(INTERRUPT_STEPS[stack].length);
      expect(interrupt[0].explanation).toMatch(/A key is waiting and interrupts are on/);
      expect(interrupt.at(-1)!.pc).toBe(INTERRUPT_VECTOR);
      expect(interrupt.at(-1)!.interruptsOn).toBe(false);
      expect(pressed.at(-1)!.screen[3]).toBe(5);
      expect(pressed.at(-1)!.output).toEqual([1]);
      // Ticks only move forward, so a press can be scheduled after any snapshot's tick.
      for (let i = 1; i < pressed.length; i++)
        expect(pressed[i].tick).toBeGreaterThanOrEqual(pressed[i - 1].tick);
    }
  });
});
