// Lockstep test: the circuit CPU against the stepper's per-tick trace. For
// every program, every tick, the control word and bus the tick acts on (read
// before its rising edge) and every probe, RAM byte and stack entry after the
// tick must match. This is what keeps the two demos connected.
import { describe, expect, it } from "vitest";
import {
  type CompiledProgram,
  compileProgram,
  decodeControlWord,
  encodeControlWord,
  ISA,
  OPCODES,
  SAMPLE_PROGRAMS,
  SIGNALS,
  type Tick,
  traceTicks,
} from "../computerStepper";
import { CPU_PARTS, CPU_PRESETS, cpuCircuit, cpuFromSource } from "./cpuPreset";
import { type Circuit, initialSnapshot, type Snapshot, step, validateCircuit } from "./logic";
import { readProbes } from "./probes";

type Bytes = { bytes: number[] };

/** A program given as raw bytes, for opcodes and branches the compiler never emits. */
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

const { LDI, LDM, STM, ADDI, ADDM, SUBI, SUBM, OUT, JMP, JNC, CALL, RET, HALT } = OPCODES;

/** Seeded PRNG (mulberry32), so a failing random program can be rerun. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A random straight-line program over every non-stack opcode, with forward-only
 * JMP/JNC so it always reaches HALT. Operands are any byte, so RAM addresses
 * above 15 wrap, and adds and subtracts carry and borrow.
 */
function randomProgram(seed: number, length = 40): CompiledProgram {
  const next = random(seed);
  const byte = () => Math.floor(next() * 256);
  const opcodes = [LDI, LDM, STM, ADDI, ADDM, SUBI, SUBM, OUT, JMP, JNC];
  const pairs: [number, number][] = [];
  for (let i = 0; i < length; i++) {
    const opcode = opcodes[Math.floor(next() * opcodes.length)];
    const forward = 2 * (i + 1 + Math.floor(next() * 4));
    pairs.push([opcode, opcode === JMP || opcode === JNC ? Math.min(forward, 2 * length) : byte()]);
  }
  pairs.push([HALT, 0]);
  return raw(...pairs);
}

const PROGRAMS: Record<string, CompiledProgram> = {
  ...Object.fromEntries(
    Object.entries(SAMPLE_PROGRAMS).map(([name, source]) => [name, compileProgram(source)]),
  ),
  "every opcode": raw(
    [LDI, 200],
    [STM, 3],
    [ADDI, 100], // carry out
    [OUT, 0],
    [ADDM, 3],
    [SUBI, 250], // borrow
    [SUBM, 3],
    [LDM, 3],
    [JNC, 20], // carry clear: taken
    [HALT, 0],
    [CALL, 26], // address 20
    [OUT, 0],
    [HALT, 0],
    [SUBI, 1], // address 26
    [RET, 0],
  ),
  "JNC not taken": raw([LDI, 1], [SUBI, 2], [JNC, 10], [LDI, 7], [OUT, 0], [HALT, 0]),
  "nested CALL/RET": raw(
    [CALL, 8],
    [OUT, 0],
    [JMP, 22],
    [HALT, 0], // never reached
    [LDI, 1], // address 8
    [CALL, 16],
    [ADDI, 1],
    [RET, 0],
    [ADDI, 10], // address 16
    [CALL, 24],
    [RET, 0],
    [HALT, 0], // address 22
    [ADDI, 100], // address 24
    [RET, 0],
  ),
  "countdown loop": raw(
    [LDI, 5],
    [STM, 0],
    [LDM, 0], // address 4
    [OUT, 0],
    [SUBI, 1],
    [STM, 0],
    [JNC, 4],
    [HALT, 0],
  ),
  "unknown opcode halts": raw([LDI, 9], [0x00, 0], [OUT, 0]),
  "compiled calls in a loop": compileProgram(
    "fn twice(n) {\n  return n + n;\n}\nfn add3(n) {\n  let m = twice(n);\n  return m + 3;\n}\nlet total = 0;\nfor (let i = 0; i < 5; i = i + 2) {\n  let t = add3(i);\n  total = total + t;\n  print(total);\n}\nprint(total);",
  ),
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((seed) => [`random ${seed}`, randomProgram(seed)])),
};

const busOf = (state: Snapshot) => state.buses?.[CPU_PARTS.bus] ?? "Z";
const controlOf = (state: Snapshot) =>
  (state.outputs[CPU_PARTS.control] ?? [])
    .slice(0, SIGNALS.length)
    .reduce((word, bit, index) => (bit ? word | (1 << index) : word), 0);
const bytesOf = (state: Snapshot, id: string) => (state.blocks?.[id] as Bytes).bytes;

function expected(tick: Tick) {
  const r = tick.registers;
  return {
    PC: r.pc,
    CMAR: r.cmar,
    IR: r.ir,
    OPERAND: r.opr,
    DMAR: r.dmar,
    ACC: r.acc,
    FLAGS: (r.carry ? 1 : 0) | (r.zero ? 2 : 0),
    SP: r.sp,
    OUT: r.out,
  };
}

/** Runs the circuit next to the trace; returns the number of ticks compared. */
function lockstep(program: CompiledProgram, circuit: Circuit = cpuCircuit(program.bytes)) {
  const ticks = traceTicks(program);
  expect(ticks.at(-1)!.halted, "the trace ends on HALT").toBe(true);
  expect(ticks.some((tick) => tick.fault)).toBe(false);
  let state = step(circuit, initialSnapshot(), false);
  for (const tick of ticks) {
    const where = `tick ${tick.index} (instruction ${tick.instruction} at ${tick.address}, T${tick.t})`;
    expect(decodeControlWord(controlOf(state)), `${where}: control word`).toEqual(
      decodeControlWord(encodeControlWord(tick.control)),
    );
    expect(busOf(state), `${where}: bus`).toBe(tick.bus ?? "Z");
    state = step(circuit, state, true);
    state = step(circuit, state, false);
    expect(state.unstable, `${where}: settles`).toBe(false);
    const { BUS: _bus, ...probes } = readProbes(circuit, state);
    expect(probes, `${where}: probes`).toEqual(expected(tick));
    expect(bytesOf(state, CPU_PARTS.ram), `${where}: data RAM`).toEqual(tick.ram);
    expect(bytesOf(state, CPU_PARTS.stack).slice(0, tick.registers.sp), `${where}: stack`).toEqual(
      tick.stack,
    );
  }
  // HALT gates the clock: more cycles change nothing.
  const halted = readProbes(circuit, state);
  for (let i = 0; i < 3; i++) state = step(circuit, step(circuit, state, true), false);
  expect(readProbes(circuit, state)).toEqual(halted);
  return ticks.length;
}

describe("CPU preset", () => {
  it("passes the circuit validator with every probe present", () => {
    const circuit = cpuFromSource(SAMPLE_PROGRAMS.EXAMPLE);
    expect(validateCircuit(JSON.parse(JSON.stringify(circuit)))).not.toBeNull();
    expect(Object.keys(readProbes(circuit, initialSnapshot())).sort()).toEqual([
      "ACC",
      "BUS",
      "CMAR",
      "DMAR",
      "FLAGS",
      "IR",
      "OPERAND",
      "OUT",
      "PC",
      "SP",
    ]);
  });

  it("loads compileProgram bytes into the code ROM", () => {
    const program = compileProgram(SAMPLE_PROGRAMS.FUNCTION);
    const circuit = cpuCircuit(program.bytes);
    const state = step(circuit, initialSnapshot(), false);
    expect((state.blocks?.[CPU_PARTS.rom] as Bytes).bytes.slice(0, program.bytes.length)).toEqual(
      program.bytes,
    );
  });

  it("covers every opcode across the lockstep programs", () => {
    const used = new Set(
      Object.values(PROGRAMS).flatMap((p) => traceTicks(p).map((t) => t.registers.ir)),
    );
    for (const { opcode } of ISA)
      expect(used.has(opcode), ISA.find((i) => i.opcode === opcode)!.mnemonic).toBe(true);
    const jnc = Object.values(PROGRAMS).flatMap((p) =>
      traceTicks(p).filter((t) => t.registers.ir === JNC && t.t === 4),
    );
    expect(new Set(jnc.map((t) => t.control.includes("PC_IN")))).toEqual(new Set([true, false]));
  });
});

describe("CPU lockstep with the per-tick trace", () => {
  for (const [name, program] of Object.entries(PROGRAMS))
    it(name, () => {
      expect(lockstep(program)).toBeGreaterThan(0);
    });

  it("runs the builder preset to HALT with OUT = 6", () => {
    const [circuit] = Object.values(CPU_PRESETS);
    const ticks = lockstep(compileProgram(SAMPLE_PROGRAMS.LOOP), circuit);
    expect(ticks).toBeGreaterThan(50);
  });
});
