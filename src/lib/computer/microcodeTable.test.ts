import { describe, expect, it } from "vitest";
import {
  compileProgram,
  controlWord,
  defaultMicrocode,
  describeOperand,
  INT_OPCODE,
  type MicrocodeOpcode,
  type MicrocodeTable,
  microcodeIsa,
  microcodeRom,
  SAMPLE_PROGRAMS,
  traceProgram,
  traceTicks,
} from "../computerStepper";
import { controlBlockCircuit, microcodeWords } from "./controlUnit";
import {
  AND_JZ_PROGRAM,
  AND_OPCODE,
  assembleProgram,
  JZ_OPCODE,
  microcodeJson,
  parseMicrocodeJson,
  programProblems,
  validateMicrocode,
  withOpcodes,
} from "./microcodeTable";

const base = defaultMicrocode("hardware");
const exercise = withOpcodes(base, AND_OPCODE, JZ_OPCODE);
const op = (steps: MicrocodeOpcode["steps"], extra: Partial<MicrocodeOpcode> = {}) =>
  withOpcodes(base, {
    mnemonic: "TEST",
    opcode: 0xd7,
    operand: "literal",
    effect: "",
    steps,
    ...extra,
  });
const messages = (table: MicrocodeTable) => validateMicrocode(table).map((p) => p.message);

describe("microcode table as data", () => {
  it("the default table gives the same control words as the built-in microcode", () => {
    for (const stack of ["hardware", "ram"] as const)
      expect(microcodeRom(defaultMicrocode(stack))).toEqual(microcodeRom(stack));
    expect(validateMicrocode(base)).toEqual([]);
    expect(validateMicrocode(defaultMicrocode("ram"))).toEqual([]);
  });

  it("the default table runs every sample program exactly as before", () => {
    for (const source of Object.values(SAMPLE_PROGRAMS)) {
      const program = compileProgram(source);
      expect(traceTicks(program, undefined, {}, base)).toEqual(traceTicks(program));
      expect(traceProgram(program, {}, base)).toEqual(traceProgram(program));
    }
  });

  it("looks up a zero-flag branch on the zero bit and a carry branch on the carry bit", () => {
    expect(controlWord(JZ_OPCODE.opcode, 4, true, exercise, false)).toEqual(["STEP_RESET"]);
    expect(controlWord(JZ_OPCODE.opcode, 4, false, exercise, true)).toContain("PC_IN");
    expect(controlWord(0xa0, 4, false, exercise, true)).toContain("PC_IN"); // JNC ignores zero
  });

  it("generates control ROM gates that hold the edited table, zero split included", {
    timeout: 60_000,
  }, () => {
    const rom = microcodeRom(exercise);
    const gates = controlBlockCircuit("microcode", rom, exercise.opcodes);
    expect(microcodeWords(gates)).toEqual(rom);
    const labels = gates.nodes.map((node) => node.label ?? "");
    expect(labels.some((label) => label.startsWith("T4 JZ Z1: PC_IN OPR_OUT"))).toBe(true);
    // A word that splits on both flags gets a row per flag pair.
    const both = withOpcodes(exercise, {
      ...JZ_OPCODE,
      opcode: 0xd8,
      mnemonic: "ODD",
      steps: { flag: "zero", clear: [["STEP_RESET"]], set: [["HALT"]] },
    });
    const branchy = withOpcodes(both, {
      ...JZ_OPCODE,
      opcode: 0xd9,
      mnemonic: "MIX",
      steps: {
        flag: "zero",
        clear: [["OPR_OUT", "PC_IN", "STEP_RESET"]],
        set: [["ACC_OUT", "OUT_IN", "STEP_RESET"]],
      },
    });
    const mixedRom = microcodeRom(branchy);
    expect(microcodeWords(controlBlockCircuit("microcode", mixedRom))).toEqual(mixedRom);
  });

  it("decodes and describes added opcodes", () => {
    const isa = microcodeIsa(exercise);
    expect(isa.find((item) => item.mnemonic === "JZ")?.operand).toBe("code address");
    expect(describeOperand(JZ_OPCODE.opcode, 0x0a, [], isa).short).toBe("→0A");
    expect(describeOperand(AND_OPCODE.opcode, 15, [], isa).short).toBe("#15");
    expect(describeOperand(AND_OPCODE.opcode, 15, []).short).toBe("");
  });

  it("explains an added opcode from what it changed", () => {
    const program = assembleProgram(AND_JZ_PROGRAM, exercise);
    const and = traceProgram(program, {}, exercise).find(
      (snapshot) => snapshot.phase === "execute" && snapshot.explanation.startsWith("AND"),
    );
    expect(and?.explanation).toContain("ACC becomes 12");
  });
});

describe("validateMicrocode", () => {
  it("finds two bus drivers in one T-state", () => {
    expect(messages(op([["ACC_OUT", "ALU_OUT", "ACC_IN", "STEP_RESET"]]))).toEqual([
      "T4: ACC_OUT and ALU_OUT both drive the bus.",
    ]);
  });

  it("finds a read of an empty bus", () => {
    expect(messages(op([["ACC_IN", "STEP_RESET"]]))).toEqual([
      "T4: ACC_IN reads the bus, but nothing drives it.",
    ]);
  });

  it("finds an opcode with no STEP_RESET, and steps after it", () => {
    expect(messages(op([["OPR_OUT", "ACC_IN"]]))).toEqual([
      "never sends STEP_RESET, so the instruction never ends.",
    ]);
    expect(messages(op([["STEP_RESET"], ["OUT_IN", "ACC_OUT"]]))).toEqual([
      "T5 never runs: it comes after STEP_RESET.",
    ]);
    expect(messages(op({ flag: "zero", clear: [["STEP_RESET"]], set: [["OPR_OUT"]] }))).toEqual([
      "zero 1: never sends STEP_RESET, so the instruction never ends.",
    ]);
  });

  it("finds empty steps, too many steps and parts the CPU does not have", () => {
    expect(messages(op([[], ["STEP_RESET"]]))).toEqual([
      "T4 is empty. Give it a control line or end the instruction before it.",
    ]);
    expect(messages(op([["PC_INC"], ["PC_INC"], ["PC_INC"], ["PC_INC"], ["STEP_RESET"]]))).toEqual([
      "needs T8, but the ROM only has T0–T7.",
    ]);
    expect(messages(op([["SP_OUT", "DMAR_IN", "STEP_RESET"]]))).toEqual([
      "T4: SP_OUT has no part on the SEPARATE RETURN STACK CPU.",
    ]);
  });

  it("finds clashing, reserved and badly named opcodes", () => {
    expect(messages(op([["STEP_RESET"]], { opcode: 0x10 }))).toEqual([]); // replaces LDI
    expect(messages({ ...base, opcodes: [...base.opcodes, { ...base.opcodes[0] }] })).toEqual([
      "Opcode 10 is defined twice.",
      "LDI is defined twice.",
    ]);
    expect(messages(op([["STEP_RESET"]], { opcode: INT_OPCODE }))).toEqual([
      "Opcode EF is reserved for the interrupt entry.",
    ]);
    expect(messages(op([["STEP_RESET"]], { mnemonic: "and" }))[0]).toContain("capital letters");
  });

  it("checks the interrupt entry too", () => {
    expect(
      messages({ ...base, interrupt: [["PC_OUT", "STACK_IN", "IE_CLR"], ["SP_INC"]] }),
    ).toEqual(["Interrupt entry never sends STEP_RESET, so the instruction never ends."]);
  });

  it("finds opcodes in a program the table does not define", () => {
    const program = compileProgram("print(1);");
    expect(programProblems(program, base)).toEqual([]);
    const without = { ...base, opcodes: base.opcodes.filter((entry) => entry.mnemonic !== "OUT") };
    expect(programProblems(program, without).map((p) => p.message)).toEqual([
      "Code address 02 holds opcode 80, which the microcode table does not define: the CPU halts there.",
    ]);
  });
});

describe("assembleProgram", () => {
  it("assembles labels, hex, negatives and leaves out unused operands", () => {
    const program = assembleProgram(
      "start: LDI $0A ; ten\n  ADDI -1\n  JZ end // comment\n  JMP start\nend:\n  HALT",
      exercise,
    );
    expect(program.bytes).toEqual([0x10, 10, 0x40, 255, 0xd6, 8, 0x90, 0, 0xf0, 0]);
    expect(program.instructions.map((item) => item.line)).toEqual([1, 2, 3, 4, 6]);
    expect(program.stack).toBe("hardware");
  });

  it("reports unknown instructions, labels and missing operands by line", () => {
    expect(() => assembleProgram("AND 3", base)).toThrow(/Line 1: Unknown instruction “AND”/);
    expect(() => assembleProgram("JMP nowhere", base)).toThrow("Line 1: Unknown label “nowhere”.");
    expect(() => assembleProgram("\nLDI", base)).toThrow("Line 2: LDI needs an operand (literal).");
    expect(() => assembleProgram("LDI 300", base)).toThrow("Line 1: Operands are bytes");
    expect(() => assembleProgram("a:\na: HALT", base)).toThrow("already defined");
  });
});

describe("sharing tables as JSON", () => {
  it("round-trips a table", () => {
    const parsed = parseMicrocodeJson(microcodeJson(exercise));
    expect(parsed).toEqual(JSON.parse(JSON.stringify(exercise)));
    expect(microcodeRom(parsed)).toEqual(microcodeRom(exercise));
  });

  it("rejects JSON without a table's shape", () => {
    expect(() => parseMicrocodeJson("{")).toThrow("Not valid JSON.");
    expect(() => parseMicrocodeJson("[]")).toThrow("Expected a JSON object");
    expect(() => parseMicrocodeJson('{"stack":"cloud"}')).toThrow("stack must be one of");
    const bad = JSON.parse(microcodeJson(exercise));
    bad.opcodes[0].steps[0] = ["FLY"];
    expect(() => parseMicrocodeJson(JSON.stringify(bad))).toThrow("unknown control line “FLY”");
    bad.opcodes[0] = { ...bad.opcodes[1], operand: "maybe" };
    expect(() => parseMicrocodeJson(JSON.stringify(bad))).toThrow("operand must be one of");
  });

  it("reads back a table that has the shape but cannot run, for validateMicrocode to list", () => {
    const broken = JSON.parse(microcodeJson(exercise));
    broken.opcodes[0].steps = [["ACC_IN"]];
    const table = parseMicrocodeJson(JSON.stringify(broken));
    expect(validateMicrocode(table).length).toBeGreaterThan(0);
  });
});
