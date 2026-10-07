import { describe, expect, it } from "vitest";
import {
  type CompiledProgram,
  compileProgram,
  controlWord,
  decodeControlWord,
  EXECUTE_STEPS,
  ISA,
  MAX_T_STATES,
  microcodeAddress,
  microcodeRom,
  OPCODES,
  SAMPLE_PROGRAMS,
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

const SOURCES: Record<string, string> = {
  ...SAMPLE_PROGRAMS,
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

  it("ends every opcode with STEP_RESET or HALT within the ROM's T-states", () => {
    for (const { opcode } of ISA)
      for (const carry of [false, true]) {
        let t = 4;
        while (t < MAX_T_STATES && controlWord(opcode, t, carry).length) t++;
        const final = controlWord(opcode, t - 1, carry);
        expect(final.includes("STEP_RESET") || final.includes("HALT")).toBe(true);
        expect(t).toBeLessThanOrEqual(MAX_T_STATES);
      }
  });

  it("generates a microcode ROM that decodes back to the table", () => {
    const rom = microcodeRom();
    for (let opcode = 0; opcode < 256; opcode++)
      for (let t = 0; t < MAX_T_STATES; t++)
        for (const carry of [false, true])
          expect(new Set(decodeControlWord(rom[microcodeAddress(opcode, t, carry)]))).toEqual(
            new Set(controlWord(opcode, t, carry)),
          );
  });
});

describe("per-tick trace", () => {
  for (const [name, program] of Object.entries(PROGRAMS)) {
    it(`${name}: matches the old three-phase trace`, () => {
      const legacy = legacyTraceProgram(program);
      const derived = traceProgram(program);
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
