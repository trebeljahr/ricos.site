// The grader on G's correct CPU preset (passes every program) and on broken
// copies of it, each with one wiring mistake a reader could make. Every broken
// copy must stop at the expected tick and name the expected cause.
import { describe, expect, it } from "vitest";
import {
  type CompiledProgram,
  compileProgram,
  OPCODES,
  SAMPLE_PROGRAMS,
  SIGNALS,
  type Signal,
  type Tick,
  traceTicks,
} from "../computerStepper";
import {
  CAUSE_RULES,
  type CauseRule,
  CPU_LEVELS,
  checkStructure,
  findParts,
  type GradeFailure,
  gradeCpu,
} from "./cpuGrader";
import { CPU_PARTS, cpuCircuit } from "./cpuPreset";
import type { Circuit, Wire } from "./logic";

const raw = (...pairs: [number, number][]): CompiledProgram => ({
  instructions: pairs.map(([opcode, operand], i) => ({
    address: i * 2,
    opcode,
    operand,
    label: "",
    line: 0,
  })),
  bytes: pairs.flat(),
  variables: [],
});
const { LDI, STM, ADDI, SUBI, OUT, JNC, CALL, RET, HALT } = OPCODES;

const PROGRAMS: Record<string, CompiledProgram> = {
  ...Object.fromEntries(
    Object.entries(SAMPLE_PROGRAMS).map(([name, source]) => [name, compileProgram(source)]),
  ),
  "JNC not taken": raw([LDI, 1], [SUBI, 2], [JNC, 10], [LDI, 7], [OUT, 0], [HALT, 0]),
  "store and call": raw([LDI, 5], [STM, 2], [CALL, 10], [OUT, 0], [HALT, 0], [ADDI, 1], [RET, 0]),
};

// ------------------------------------------------ breaking the preset

const clone = (circuit: Circuit): Circuit => JSON.parse(JSON.stringify(circuit));
const line = (signal: Signal) => SIGNALS.indexOf(signal);
const into = (to: string, input: number) => (wire: Wire) => wire.to === to && wire.input === input;

function removeWire(circuit: Circuit, to: string, input: number): Circuit {
  const copy = clone(circuit);
  const before = copy.wires.length;
  copy.wires = copy.wires.filter((wire) => !into(to, input)(wire));
  expect(copy.wires.length, `a wire into ${to}:${input}`).toBe(before - 1);
  return copy;
}

/** Moves the wire into `to:input` so it comes from control line `signal`. */
function rewire(circuit: Circuit, to: string, input: number, signal: Signal): Circuit {
  const copy = clone(circuit);
  const wire = copy.wires.find(into(to, input))!;
  wire.from = CPU_PARTS.control;
  wire.output = line(signal);
  return copy;
}

/** Swaps the sources of two inputs. */
function swap(circuit: Circuit, a: [string, number], b: [string, number]): Circuit {
  const copy = clone(circuit);
  const first = copy.wires.find(into(...a))!;
  const second = copy.wires.find(into(...b))!;
  [first.to, first.input, second.to, second.input] = [
    second.to,
    second.input,
    first.to,
    first.input,
  ];
  return copy;
}

const firstTick = (program: CompiledProgram, match: (tick: Tick) => boolean) =>
  traceTicks(program).find(match)!.index;

function failureOf(circuit: Circuit, program: CompiledProgram): GradeFailure {
  const result = gradeCpu(circuit, program);
  if (!("failure" in result)) throw new Error(`expected a failure, got ${JSON.stringify(result)}`);
  return result.failure;
}

// ------------------------------------------------ tests

describe("CPU grader on the correct preset", () => {
  for (const [name, program] of Object.entries(PROGRAMS))
    it(`passes ${name}`, () => {
      const result = gradeCpu(cpuCircuit(program.bytes), program);
      expect(result).toEqual({ pass: true, ticks: traceTicks(program).length });
    });

  it("passes the structure check for every level", () => {
    const circuit = cpuCircuit([]);
    for (const level of CPU_LEVELS) expect(checkStructure(circuit, level), level.name).toEqual([]);
  });

  it("finds every part by probe name and block type", () => {
    const { control, bus, parts, drivers } = findParts(cpuCircuit([]));
    expect(control?.id).toBe(CPU_PARTS.control);
    expect(bus?.id).toBe(CPU_PARTS.bus);
    expect(
      Object.fromEntries(Object.entries(parts).map(([role, node]) => [role, node?.id])),
    ).toEqual({
      PC: "pc",
      CMAR: "cmar",
      IR: "ir",
      OPR: "opr",
      ACC: "acc",
      FLAGS: "flags",
      DMAR: "dmar",
      SP: "sp",
      OUT: "out",
      ROM: "rom",
      SCREEN: "screen",
      RAM: "ram",
      STACK: "stack",
      ALU: "alu",
    });
    expect(drivers.map((driver) => driver.role)).toEqual([
      "PC",
      "ROM",
      "OPR",
      "RAM",
      "ACC",
      "ALU",
      "STACK",
    ]);
  });

  it("grades a full program fast enough for a button press", () => {
    const program = compileProgram(SAMPLE_PROGRAMS.LOOP);
    const circuit = cpuCircuit(program.bytes);
    const started = performance.now();
    expect(gradeCpu(circuit, program).pass).toBe(true);
    const ms = performance.now() - started;
    console.info(`graded LOOP (${traceTicks(program).length} ticks) in ${ms.toFixed(0)} ms`);
    expect(ms).toBeLessThan(1000);
  });
});

describe("CPU grader structure check", () => {
  it("names a missing probe before simulating", () => {
    const circuit = clone(cpuCircuit([]));
    circuit.nodes = circuit.nodes.filter((node) => node.probe !== "ACC");
    const result = gradeCpu(circuit, PROGRAMS["JNC not taken"]);
    expect(result).toEqual({
      pass: false,
      structure: ["No probe named ACC. Add a probe display named ACC."],
    });
  });

  it("names missing blocks, a missing bus and a probe on the wrong part", () => {
    const circuit = clone(cpuCircuit([]));
    circuit.nodes = circuit.nodes.filter(
      (node) => ![CPU_PARTS.bus, "aux-bus", "alu"].includes(node.id),
    );
    circuit.wires.find(into("acc-probe", 0))!.from = "bus-lanes";
    const errors = checkStructure(circuit);
    expect(errors).toContain("This level needs 2 ALUs; found 1.");
    expect(errors).toContain("No shared bus. Add a bus node and connect the bus drivers to it.");
    expect(errors).toContain("The ACC probe is not wired to the outputs of a register.");
  });

  it("only asks for a level's own parts", () => {
    const circuit = clone(cpuCircuit([]));
    circuit.nodes = circuit.nodes.filter(
      (node) => !["acc-probe", "sp-probe", "ram"].includes(node.id),
    );
    expect(checkStructure(circuit, CPU_LEVELS[0])).toEqual([]);
    expect(checkStructure(circuit, CPU_LEVELS[1])).toEqual([
      "No probe named ACC. Add a probe display named ACC.",
    ]);
  });
});

type Broken = {
  name: string;
  program: CompiledProgram;
  break: (circuit: Circuit) => Circuit;
  tick: (program: CompiledProgram) => number;
  rule: CauseRule;
  part: string;
  message: RegExp;
};

const program = PROGRAMS["store and call"];
const has = (signal: Signal) => (tick: Tick) => tick.control.includes(signal);

const BROKEN: Broken[] = [
  {
    name: "ACC load wire removed",
    program,
    break: (c) => removeWire(c, "acc", 8),
    tick: (p) => firstTick(p, has("ACC_IN")),
    rule: "register-not-loaded",
    part: "acc",
    message: /ACC_IN was active and the bus held 05, but ACC stayed 00: .*not connected/,
  },
  {
    name: "ACC_IN and OPR_IN swapped",
    program,
    break: (c) => swap(c, ["acc", 8], ["opr", 8]),
    tick: (p) => firstTick(p, has("OPR_IN")),
    rule: "register-not-loaded",
    part: "opr",
    message: /OPERAND's load input isn't on OPR_IN \(it is on ACC_IN\)/,
  },
  {
    name: "ACC's bus driver also on PC_OUT (double driver)",
    program,
    break: (c) => rewire(c, "acc-drive", 1, "PC_OUT"),
    tick: () => 0,
    rule: "bus-conflict",
    part: "acc-drive",
    message:
      /2 drivers on the bus at once \(PC, ACC\)\. ACC's bus driver enable is on PC_OUT; it belongs on ACC_OUT/,
  },
  {
    name: "ROM output enable removed",
    program,
    break: (c) => removeWire(c, "rom-drive", 1),
    tick: (p) => firstTick(p, has("ROM_OUT")),
    rule: "bus-no-driver",
    part: "rom-drive",
    message: /bus is Z during ROM_OUT: the code ROM's output enable isn't connected/,
  },
  {
    name: "ACC drives the bus on OPR_OUT",
    program,
    break: (c) => swap(c, ["acc-drive", 1], ["opr-drive", 1]),
    tick: (p) => firstTick(p, has("OPR_OUT")),
    rule: "bus-wrong-driver",
    part: "acc-drive",
    message: /ACC drove the bus during OPR_OUT, not OPERAND/,
  },
  {
    name: "PC_INC wire removed",
    program,
    break: (c) => removeWire(c, "pc", 8),
    tick: (p) => firstTick(p, has("PC_INC")),
    rule: "pc-no-increment",
    part: "pc",
    message: /PC stayed 00 during PC_INC/,
  },
  {
    name: "carry flag not reaching the control unit",
    program: PROGRAMS["JNC not taken"],
    break: (c) => removeWire(c, "control", 8),
    tick: (p) => firstTick(p, (t) => t.registers.ir === JNC && t.t === 4),
    rule: "control-flag",
    part: "control",
    message: /JNC chose the wrong branch: the carry flag is 1/,
  },
  {
    name: "ACC clock removed",
    program,
    break: (c) => removeWire(c, "acc", 9),
    tick: (p) => firstTick(p, has("ACC_IN")),
    rule: "register-not-clocked",
    part: "acc",
    message: /ACC stayed 00: its CLK input is not connected/,
  },
  {
    name: "ACC lanes 0 and 1 crossed",
    program,
    break: (c) => swap(c, ["acc", 0], ["acc", 1]),
    tick: (p) => firstTick(p, has("ACC_IN")),
    rule: "register-wrong-value",
    part: "acc",
    message: /ACC loaded 06 while the bus held 05/,
  },
  {
    name: "RAM write enable removed",
    program,
    break: (c) => removeWire(c, "ram", 12),
    tick: (p) => firstTick(p, has("RAM_IN")),
    rule: "ram-not-written",
    part: "ram",
    message: /RAM_IN was active and the bus held 05, but the data RAM didn't store it/,
  },
  {
    name: "screen write enable removed",
    program: raw([LDI, 9], [STM, 0xf3], [HALT, 0]),
    break: (c) => removeWire(c, "screen", 11),
    tick: (p) => firstTick(p, has("RAM_IN")),
    rule: "ram-not-written",
    part: "screen",
    message:
      /RAM_IN was active and the bus held 09, but the screen didn't store it: its WE input is not connected/,
  },
  {
    name: "SP load removed",
    program,
    break: (c) => removeWire(c, "sp", 8),
    tick: (p) => firstTick(p, has("SP_INC")),
    rule: "sp-no-move",
    part: "sp",
    message: /SP is 00 after SP_INC, expected 01/,
  },
  {
    name: "IR opcode bit not reaching the control unit",
    program,
    break: (c) => removeWire(c, "control", 4),
    tick: (p) => firstTick(p, (t) => t.t === 4),
    rule: "control-opcode",
    part: "control",
    message: /it doesn't see the opcode.*input 4 is wrong/,
  },
];

describe("CPU grader on broken copies of the preset", () => {
  for (const broken of BROKEN)
    it(broken.name, () => {
      const circuit = broken.break(cpuCircuit(broken.program.bytes));
      const failure = failureOf(circuit, broken.program);
      expect(failure.tick).toBe(broken.tick(broken.program));
      expect(failure.cause.rule).toBe(broken.rule);
      expect(failure.cause.part).toBe(broken.part);
      expect(failure.cause.message).toMatch(broken.message);
    });

  it("covers every cause rule except the fallbacks", () => {
    const tested = new Set(BROKEN.map((broken) => broken.rule));
    const untested = CAUSE_RULES.filter((rule) => !tested.has(rule));
    expect(untested).toEqual([
      "unstable",
      "control-word",
      "bus-wrong-value",
      "register-loaded-wrongly",
      "flags-wrong",
      "memory-wrong",
      "unknown",
    ]);
  });

  it("reports the instruction, T-state and both sides of the first wrong tick", () => {
    const circuit = removeWire(cpuCircuit(program.bytes), "acc", 8);
    const failure = failureOf(circuit, program);
    expect(failure.instruction).toEqual({
      address: 0,
      mnemonic: "LDI",
      operand: "number 5",
      text: "LDI #5",
    });
    expect(failure.t).toBe(4);
    // ACC = 0 also sets the zero bit of FLAGS.
    expect(failure.wrong).toEqual(["ACC", "FLAGS"]);
    expect(failure.expected.control).toEqual(["OPR_OUT", "ACC_IN", "STEP_RESET"]);
    expect(failure.actual.control).toEqual(failure.expected.control);
    expect(failure.expected.bus).toEqual({ value: 5, drivers: ["OPR"] });
    expect(failure.actual.bus).toEqual({ value: 5, drivers: ["OPR"] });
    expect(failure.expected.probes.ACC).toBe(5);
    expect(failure.actual.probes.ACC).toBe(0);
    expect(failure.actual.probes.PC).toBe(2);
  });

  it("catches two drivers that agree, and shows X once they fight", () => {
    const circuit = rewire(cpuCircuit(program.bytes), "acc-drive", 1, "PC_OUT");
    const failure = failureOf(circuit, program);
    // PC and ACC both hold 0 at tick 0: no X yet, but two drivers.
    expect(failure.actual.bus).toEqual({ value: 0, drivers: ["PC", "ACC"] });
    expect(failure.expected.bus).toEqual({ value: 0, drivers: ["PC"] });
    expect(failure.wrong).toEqual(["bus"]);
    const fight = failureOf(rewire(circuit, "acc-drive", 1, "PC_INC"), program);
    expect(fight.tick).toBe(1);
    expect(fight.actual.bus).toEqual({ value: "X", drivers: ["ROM", "ACC"] });
    expect(fight.cause.rule).toBe("bus-conflict");
  });

  it("level 1 grades the fetch only", () => {
    const circuit = removeWire(cpuCircuit(program.bytes), "acc", 8);
    expect(gradeCpu(circuit, program, { level: CPU_LEVELS[0] }).pass).toBe(true);
    expect(gradeCpu(circuit, program, { level: CPU_LEVELS[1] }).pass).toBe(false);
  });
});
