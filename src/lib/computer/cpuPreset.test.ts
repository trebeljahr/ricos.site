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
  traceTicks,
} from "../computerStepper";
import { CPU_PARTS, CPU_PRESETS, cpuCircuit, cpuFromSource } from "./cpuPreset";
import { expectedProbes, PROGRAMS } from "./cpuTestPrograms";
import { type Circuit, initialSnapshot, type Snapshot, step, validateCircuit } from "./logic";
import { readProbes } from "./probes";

const { JNC } = OPCODES;

type Bytes = { bytes: number[] };

const busOf = (state: Snapshot) => state.buses?.[CPU_PARTS.bus] ?? "Z";
const controlOf = (state: Snapshot) =>
  (state.outputs[CPU_PARTS.control] ?? [])
    .slice(0, SIGNALS.length)
    .reduce((word, bit, index) => (bit ? word | (1 << index) : word), 0);
const bytesOf = (state: Snapshot, id: string) => (state.blocks?.[id] as Bytes).bytes;

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
    expect(probes, `${where}: probes`).toEqual(expectedProbes(tick));
    expect(bytesOf(state, CPU_PARTS.ram), `${where}: data RAM`).toEqual(tick.ram);
    expect(bytesOf(state, CPU_PARTS.screen), `${where}: screen`).toEqual(tick.screen);
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
    // Screen writes and reads through DMAR F0–F7, beyond the SMILEY sample's writes.
    const screenTicks = Object.values(PROGRAMS).flatMap((p) =>
      traceTicks(p).filter(
        (t, i, all) => i > 0 && t.control.includes("RAM_OUT") && all[i - 1].registers.dmar >= 0xf0,
      ),
    );
    expect(screenTicks.length).toBeGreaterThan(0);
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
