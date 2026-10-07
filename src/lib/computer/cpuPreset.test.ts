// Lockstep test: the circuit CPU against the stepper's per-tick trace. For
// every program, every tick, the control word and bus the tick acts on (read
// before its rising edge) and every probe, RAM byte and stack entry after the
// tick must match. This is what keeps the two demos connected.
import { describe, expect, it } from "vitest";
import {
  type CompiledProgram,
  compileProgram,
  decodeControlWord,
  defaultMicrocode,
  encodeControlWord,
  INT_OPCODE,
  INTERRUPT_VECTOR,
  ISA,
  isaFor,
  type KeySchedule,
  type MicrocodeTable,
  OPCODES,
  RAM_STACK_SAMPLES,
  SAMPLE_PROGRAMS,
  SIGNALS,
  stackModelOf,
  type Tick,
  traceTicks,
} from "../computerStepper";
import { CPU_PARTS, CPU_PRESETS, cpuCircuit, cpuFromSource, keyPressOverrides } from "./cpuPreset";
import {
  expectedProbes,
  KEYED_PROGRAMS,
  PROGRAMS,
  RAM_PROGRAMS,
  ram,
  randomProgramWith,
} from "./cpuTestPrograms";
import { type Circuit, initialSnapshot, type Snapshot, step, validateCircuit } from "./logic";
import {
  AND_JZ_PROGRAM,
  AND_OPCODE,
  assembleProgram,
  JZ_OPCODE,
  validateMicrocode,
  withOpcodes,
} from "./microcodeTable";
import { readProbes } from "./probes";

const { JNC } = OPCODES;

type Bytes = { bytes: number[] };

const busOf = (state: Snapshot) => state.buses?.[CPU_PARTS.bus] ?? "Z";
const controlOf = (state: Snapshot) =>
  (state.outputs[CPU_PARTS.control] ?? [])
    .slice(0, SIGNALS.length)
    .reduce((word, bit, index) => (bit ? word | (1 << index) : word), 0);
const bytesOf = (state: Snapshot, id: string) => (state.blocks?.[id] as Bytes).bytes;
const cursorOf = (state: Snapshot) =>
  [CPU_PARTS.pixelX, CPU_PARTS.pixelY].map((id) => (state.blocks?.[id] as { q: number }).q);

/**
 * Runs the circuit next to the trace; returns the number of ticks compared.
 * A key press flips the keyboard switches for that tick's rising clock edge.
 * With `maxInstructions`, the program need not halt.
 */
function lockstep(
  program: CompiledProgram,
  circuit?: Circuit,
  keys: KeySchedule = {},
  maxInstructions?: number,
  table: MicrocodeTable = defaultMicrocode(stackModelOf(program)),
) {
  circuit ??= cpuCircuit(program.bytes, undefined, stackModelOf(program), table);
  const inRam = stackModelOf(program) === "ram";
  const ticks = traceTicks(program, maxInstructions, keys, table);
  if (maxInstructions === undefined)
    expect(ticks.at(-1)!.halted, "the trace ends on HALT").toBe(true);
  expect(ticks.some((tick) => tick.fault)).toBe(false);
  let state = step(circuit, initialSnapshot(), false);
  for (const tick of ticks) {
    const where = `tick ${tick.index} (instruction ${tick.instruction} at ${tick.address}, T${tick.t})`;
    expect(decodeControlWord(controlOf(state)), `${where}: control word`).toEqual(
      decodeControlWord(encodeControlWord(tick.control)),
    );
    expect(busOf(state), `${where}: bus`).toBe(tick.bus ?? "Z");
    const press = tick.keyPress === null ? {} : keyPressOverrides(tick.keyPress);
    state = step(circuit, state, true, {}, press);
    state = step(circuit, state, false);
    expect(state.unstable, `${where}: settles`).toBe(false);
    const { BUS: _bus, ...probes } = readProbes(circuit, state);
    expect(probes, `${where}: probes`).toEqual(expectedProbes(tick));
    expect(bytesOf(state, CPU_PARTS.ram), `${where}: data RAM`).toEqual(tick.ram);
    expect(bytesOf(state, CPU_PARTS.screen), `${where}: screen`).toEqual(tick.screen);
    expect(bytesOf(state, CPU_PARTS.bigScreen), `${where}: big screen`).toEqual(tick.frame);
    expect((state.blocks?.[CPU_PARTS.bank] as { q: number }).q, `${where}: bank`).toBe(
      tick.registers.bank,
    );
    expect(cursorOf(state), `${where}: pixel cursor`).toEqual([
      tick.registers.pixelX,
      tick.registers.pixelY,
    ]);
    if (!inRam)
      expect(
        bytesOf(state, CPU_PARTS.stack).slice(0, tick.registers.sp),
        `${where}: stack`,
      ).toEqual(tick.stack);
  }
  if (maxInstructions !== undefined) return ticks.length;
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
      "IRQ",
      "KEY",
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

  for (const [stack, programs] of [
    ["hardware", PROGRAMS],
    ["ram", RAM_PROGRAMS],
  ] as const)
    it(`covers every ${stack}-stack opcode across the lockstep programs`, () => {
      const used = new Set(
        Object.values(programs).flatMap((p) => traceTicks(p).map((t) => t.registers.ir)),
      );
      for (const { opcode, mnemonic } of isaFor(stack))
        expect(used.has(opcode), mnemonic).toBe(true);
      const jnc = Object.values(programs).flatMap((p) =>
        traceTicks(p).filter((t) => t.registers.ir === JNC && t.t === 4),
      );
      expect(new Set(jnc.map((t) => t.control.includes("PC_IN")))).toEqual(new Set([true, false]));
      // Screen writes and reads through DMAR F0–F7, beyond the SMILEY sample's writes.
      const screenTicks = Object.values(programs).flatMap((p) =>
        traceTicks(p).filter(
          (t, i, all) =>
            i > 0 && t.control.includes("RAM_OUT") && all[i - 1].registers.dmar >= 0xf0,
        ),
      );
      expect(screenTicks.length).toBeGreaterThan(0);
    });

  it("lists every opcode in one of the two instruction sets", () => {
    const both = new Set([...isaFor("hardware"), ...isaFor("ram")].map((i) => i.opcode));
    expect(both.size).toBe(ISA.length);
  });
});

describe("CPU lockstep with the per-tick trace", () => {
  for (const [name, program] of Object.entries(PROGRAMS))
    it(name, () => {
      expect(lockstep(program)).toBeGreaterThan(0);
    });

  it("draws the CROSS preset's X one pixel per plot, as the trace does", () => {
    const circuit = CPU_PRESETS["Toy CPU (CROSS program)"];
    const program = compileProgram(SAMPLE_PROGRAMS.CROSS);
    lockstep(program, circuit);
    const ticks = traceTicks(program);
    expect(ticks.at(-1)!.screen).toEqual([0x81, 0x42, 0x24, 0x18, 0x18, 0x24, 0x42, 0x81]);
    const plots = ticks.filter((tick) => tick.screenWrite?.x != null);
    expect(plots).toHaveLength(16);
    // Each plot changes exactly one pixel (the X's centre pixels are each plotted once).
    for (const tick of plots) {
      const before = ticks[tick.index - 1].screen;
      const changed = tick.screen.flatMap((row, y) =>
        Array.from({ length: 8 }, (_, x) => x).filter((x) => ((row ^ before[y]) >> x) & 1),
      );
      expect(changed).toHaveLength(1);
    }
  });

  it("runs the builder preset to HALT with OUT = 6", () => {
    const [circuit] = Object.values(CPU_PRESETS);
    const ticks = lockstep(compileProgram(SAMPLE_PROGRAMS.LOOP), circuit);
    expect(ticks).toBeGreaterThan(50);
  });
});

describe("stack-in-RAM CPU lockstep with the per-tick trace", () => {
  for (const [name, program] of Object.entries(RAM_PROGRAMS))
    it(name, () => {
      expect(lockstep(program)).toBeGreaterThan(0);
    });

  it("runs the recursive builder preset to HALT with OUT = 10, stack frames in RAM", () => {
    const circuit = Object.values(CPU_PRESETS)[1];
    const program = ram(RAM_STACK_SAMPLES.RECURSION);
    lockstep(program, circuit);
    const ticks = traceTicks(program);
    expect(ticks.at(-1)!.output).toEqual([10]);
    // sum(4) … sum(0): five frames of 3 bytes plus a return address each.
    expect(Math.min(...ticks.map((t) => t.registers.sp))).toBe(32 - 5 * 4);
  });

  it("has no return stack and a 32-byte data RAM", () => {
    const circuit = cpuFromSource(SAMPLE_PROGRAMS.EXAMPLE, undefined, "ram");
    expect(circuit.nodes.some((node) => node.id === CPU_PARTS.stack)).toBe(false);
    expect(circuit.nodes.find((node) => node.id === CPU_PARTS.ram)?.behaviour).toBe("ram32");
    expect(validateCircuit(JSON.parse(JSON.stringify(circuit)))).not.toBeNull();
    expect(readProbes(circuit, step(circuit, initialSnapshot(), false)).SP).toBe(32);
  });
});

describe("interrupts in lockstep with the per-tick trace", () => {
  for (const stack of ["hardware", "ram"] as const)
    for (const [name, { program, keys }] of Object.entries(KEYED_PROGRAMS[stack]))
      it(`${stack} stack: ${name}`, () => {
        const endless = !traceTicks(program, undefined, keys).at(-1)!.halted;
        expect(lockstep(program, undefined, keys, endless ? 300 : undefined)).toBeGreaterThan(0);
      });

  const ticksOf = (stack: "hardware" | "ram", name: string) => {
    const { program, keys } = KEYED_PROGRAMS[stack][name];
    return { ticks: traceTicks(program, undefined, keys), keys };
  };
  /** First tick of each interrupt entry. */
  const entries = (ticks: Tick[]) => ticks.filter((tick) => tick.interrupt && tick.t === 0);

  for (const stack of ["hardware", "ram"] as const) {
    it(`${stack} stack: a key mid-instruction waits for the instruction to end, then runs the handler`, () => {
      const { ticks, keys } = ticksOf(stack, "key arriving mid-instruction");
      const pressed = Number(Object.keys(keys)[0]);
      const [entry] = entries(ticks);
      const interrupted = ticks[pressed];
      // The interrupt starts on the tick after the pressed instruction's STEP_RESET.
      const end = ticks.findIndex(
        (tick) => tick.index >= pressed && tick.control.includes("STEP_RESET"),
      );
      expect(interrupted.t).toBe(5);
      expect(entry.index).toBe(end + 1);
      expect(entry.control).toContain("IE_CLR");
      const vector = ticks.find((tick) => tick.interrupt && tick.control.includes("VEC_OUT"))!;
      expect(vector.bus).toBe(INTERRUPT_VECTOR);
      expect(vector.busDriver).toBe("VECTOR");
      // RETI resumes at the PC the entry pushed: the instruction after the interrupted one.
      const reti = ticks.find(
        (tick) => tick.registers.ir === OPCODES.RETI && tick.control.includes("STEP_RESET"),
      )!;
      expect(ticks[reti.index + 1].address).toBe(entry.address);
      expect(entry.address).toBe(interrupted.address + 2);
      const end2 = ticks.at(-1)!;
      expect(end2.halted).toBe(true);
      // Same sum as without the key: ACC and carry survive the handler.
      const plain = traceTicks(KEYED_PROGRAMS[stack]["key arriving mid-instruction"].program);
      expect(end2.output).toEqual([plain.at(-1)!.output[0], 1, 65]);
    });

    it(`${stack} stack: a press while the handler runs waits for RETI`, () => {
      const { ticks } = ticksOf(stack, "nested press while interrupts are off");
      const starts = entries(ticks);
      expect(starts).toHaveLength(2);
      const reti = ticks.filter(
        (tick) => tick.registers.ir === OPCODES.RETI && tick.control.includes("STEP_RESET"),
      );
      // The second entry follows the first RETI directly, with interrupts off in between.
      expect(starts[1].index).toBe(reti[0].index + 1);
      const between = ticks.slice(starts[0].index + 1, reti[0].index);
      expect(between.every((tick) => !tick.registers.ie)).toBe(true);
      expect(between.some((tick) => tick.keyPress !== null)).toBe(true);
      expect(ticks.at(-1)!.output.slice(1)).toEqual([2, 66]);
    });

    it(`${stack} stack: two quick presses interrupt once and keep the later key`, () => {
      const { ticks } = ticksOf(stack, "two presses before the handler reads the key");
      expect(entries(ticks)).toHaveLength(1);
      expect(ticks.at(-1)!.output.slice(1)).toEqual([1, 67]);
    });

    it(`${stack} stack: DI holds the key until EI`, () => {
      const { ticks } = ticksOf(stack, "DI holds a key until EI");
      const [entry] = entries(ticks);
      const ei = ticks.find((tick) => tick.registers.ir === OPCODES.EI && tick.t === 4)!;
      expect(entry.index).toBe(ei.index + 1);
      expect(ticks.at(-1)!.output).toEqual([3, 42, 42]);
    });
  }

  it("runs the interrupt entry from T0 with no fetch, on both CPUs", () => {
    for (const stack of ["hardware", "ram"] as const) {
      const { ticks } = ticksOf(stack, "keyboard sample");
      const entry = entries(ticks)[0];
      expect(entry.control).not.toContain("CMAR_IN");
      expect(entry.control).toContain(stack === "ram" ? "SP_DEC" : "STACK_IN");
      expect(INT_OPCODE).toBe(0xef);
    }
  });

  it("lights the interrupt group in the circuit while INT is on", () => {
    const { program, keys } = KEYED_PROGRAMS.hardware["key arriving mid-instruction"];
    const circuit = cpuCircuit(program.bytes);
    const group = circuit.groups?.find((item) => item.id === "interrupt");
    expect(group?.activeWhen).toBe(CPU_PARTS.int);
    const ticks = traceTicks(program, undefined, keys);
    let state = step(circuit, initialSnapshot(), false);
    const lit: number[] = [];
    for (const tick of ticks) {
      if (state.values[CPU_PARTS.int]) lit.push(tick.index);
      const press = tick.keyPress === null ? {} : keyPressOverrides(tick.keyPress);
      state = step(circuit, step(circuit, state, true, {}, press), false);
    }
    expect(lit).toEqual(ticks.filter((tick) => tick.interrupt).map((tick) => tick.index));
  });
});

describe("an edited microcode table in lockstep with the per-tick trace", () => {
  for (const stack of ["hardware", "ram"] as const) {
    const table = withOpcodes(defaultMicrocode(stack), AND_OPCODE, JZ_OPCODE);

    it(`${stack} stack: the AND and JZ exercise table is valid`, () => {
      expect(validateMicrocode(table)).toEqual([]);
    });

    it(`${stack} stack: runs the AND + JZ program identically in stepper and circuit`, () => {
      const program = assembleProgram(AND_JZ_PROGRAM, table);
      expect(lockstep(program, undefined, {}, undefined, table)).toBeGreaterThan(0);
      const ticks = traceTicks(program, undefined, {}, table);
      expect(ticks.at(-1)!.output).toEqual([12, 8, 4, 0]);
      // JZ took both branches, on the zero flag.
      const jz = ticks.filter((tick) => tick.registers.ir === JZ_OPCODE.opcode && tick.t === 4);
      expect(new Set(jz.map((tick) => tick.control.includes("PC_IN")))).toEqual(
        new Set([true, false]),
      );
    });

    it(`${stack} stack: AND clears a carry left by an add`, () => {
      const program = assembleProgram("LDI 200\nADDI 100\nAND 0xF0\nOUT\nHALT", table);
      const ticks = traceTicks(program, undefined, {}, table);
      const add = ticks.find((tick) => tick.registers.ir === OPCODES.ADDI && tick.t === 4)!;
      expect(add.registers.carry).toBe(true);
      expect(ticks.at(-1)!.registers.carry).toBe(false);
      expect(ticks.at(-1)!.output).toEqual([300 & 255 & 0xf0]);
      lockstep(program, undefined, {}, undefined, table);
    });

    for (const seed of [11, 12, 13])
      it(`${stack} stack: random program ${seed} with AND and JZ`, () => {
        const program = randomProgramWith(seed, stack, [AND_OPCODE.opcode], [JZ_OPCODE.opcode]);
        expect(lockstep(program, undefined, {}, undefined, table)).toBeGreaterThan(0);
      });
  }

  it("runs an edited default opcode: LDI that also adds its operand to OUT", () => {
    const base = defaultMicrocode("hardware");
    const ldi = base.opcodes.find((entry) => entry.mnemonic === "LDI")!;
    const table = withOpcodes(base, {
      ...ldi,
      steps: [
        ["OPR_OUT", "ACC_IN"],
        ["ACC_OUT", "OUT_IN", "STEP_RESET"],
      ],
    });
    const program = assembleProgram("LDI 7\nLDI 9\nHALT", table);
    lockstep(program, undefined, {}, undefined, table);
    expect(traceTicks(program, undefined, {}, table).at(-1)!.output).toEqual([7, 9]);
  });

  it("refuses a table written for the other CPU", () => {
    const program = compileProgram(SAMPLE_PROGRAMS.EXAMPLE);
    expect(() => traceTicks(program, undefined, {}, defaultMicrocode("ram"))).toThrow();
    expect(() =>
      cpuCircuit(program.bytes, undefined, "hardware", defaultMicrocode("ram")),
    ).toThrow();
  });
});
