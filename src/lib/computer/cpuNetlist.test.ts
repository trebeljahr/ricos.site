// Lockstep test for the CPU unfolded all the way down to gates: the compiled
// netlist against the folded CPU (behavioural blocks) and against the
// stepper's per-tick trace. All programs run at once, one per bit of the
// netlist's 32-bit words.
import { describe, expect, it } from "vitest";
import {
  type CompiledProgram,
  compileProgram,
  SAMPLE_PROGRAMS,
  SIGNALS,
  type StackModel,
  traceTicks,
} from "../computerStepper";
import { cpuNetlist, loadProgram, readCpu } from "./cpuNetlist";
import { CPU_PARTS, cpuCircuit } from "./cpuPreset";
import { expectedProbes, PROGRAMS, RAM_PROGRAMS } from "./cpuTestPrograms";
import { type Circuit, initialSnapshot, type Snapshot, step } from "./logic";
import { compileNetlist, NetlistSim } from "./netlist";
import { createNetlistRunner } from "./netlistRunner";
import { readProbes } from "./probes";

type Bytes = { bytes: number[] };

/** Flip-flops, logic gates and bus parts in a circuit, every module opened. */
function countParts(circuit: Circuit, total = { dff: 0, gates: 0, bus: 0 }) {
  for (const node of circuit.nodes) {
    if (node.type === "dff") total.dff++;
    else if (
      ["and", "or", "xor", "xnor", "nand", "nor", "not", "nmos", "pmos", "junction"].includes(
        node.type,
      )
    )
      total.gates++;
    else if (["merger", "busdriver", "bus"].includes(node.type)) total.bus++;
    else if (node.module) countParts(node.module, total);
  }
  return total;
}
const controlOf = (state: Snapshot) =>
  (state.outputs[CPU_PARTS.control] ?? [])
    .slice(0, SIGNALS.length)
    .reduce((word, bit, index) => (bit ? word | (1 << index) : word), 0);
const shapes = { hardware: cpuCircuit([]), ram: cpuCircuit([], undefined, "ram") };
/** The stack-in-RAM CPU has no stack part: its stack bytes are RAM bytes. */
const folded = (state: Snapshot, stack: StackModel = "hardware") => ({
  control: controlOf(state),
  bus: state.buses?.[CPU_PARTS.bus] ?? "Z",
  probes: readProbes(shapes[stack], state),
  ram: (state.blocks?.[CPU_PARTS.ram] as Bytes).bytes,
  stack: (state.blocks?.[CPU_PARTS.stack] as Bytes | undefined)?.bytes ?? [],
  screen: (state.blocks?.[CPU_PARTS.screen] as Bytes).bytes,
});

describe("CPU unfolded to a gate netlist", () => {
  const cpu = cpuNetlist(cpuCircuit(compileProgram(SAMPLE_PROGRAMS.LOOP).bytes));

  it("unfolds every block, memory included, into an acyclic netlist", () => {
    const { stats } = cpu.netlist;
    const parts = countParts(cpuCircuit([]));
    expect(stats.flipFlops).toBe(parts.dff);
    expect(stats.gates).toBe(parts.gates);
    expect(stats.busParts).toBe(parts.bus);
    expect(stats.feedbackGates).toBe(0);
    expect(cpu.rom).toHaveLength(256);
    expect(cpu.ram.length).toBeGreaterThanOrEqual(16);
    expect(cpu.screen).toHaveLength(8);
    expect(cpu.netlist.probes.map(([name]) => name).sort()).toEqual(
      ["ACC", "BUS", "CMAR", "DMAR", "FLAGS", "IR", "OPERAND", "OUT", "PC", "SP"].sort(),
    );
  });

  it("generated code and the interpreter agree", () => {
    const fast = new NetlistSim(cpu.netlist);
    const slow = new NetlistSim(cpu.netlist, { generate: false });
    let differ = 0;
    for (let i = 0; i < 200; i++) {
      fast.tick();
      slow.tick();
      for (let net = 0; net < fast.values.length; net++)
        if (fast.values[net] !== slow.values[net]) differ++;
    }
    expect(differ).toBe(0);
  });

  const variants: [StackModel, Record<string, CompiledProgram>][] = [
    ["hardware", PROGRAMS],
    ["ram", RAM_PROGRAMS],
  ];
  for (const [stack, set] of variants) {
    const programs = Object.entries(set);
    it(`${stack} stack: runs ${programs.length} programs side by side in lockstep with the folded CPU and the trace`, () => {
      expect(programs.length).toBeLessThanOrEqual(32);
      const cpu = cpuNetlist(cpuCircuit([], undefined, stack));
      if (stack === "ram") {
        expect(cpu.ram).toHaveLength(32);
        expect(cpu.stack).toHaveLength(0);
      }
      const sim = new NetlistSim(cpu.netlist);
      for (const [copy, [, program]] of programs.entries())
        loadProgram(sim, cpu, program.bytes, copy);
      const runs = programs.map(([name, program]) => ({
        name,
        ticks: traceTicks(program),
        circuit: cpuCircuit(program.bytes, undefined, stack),
        state: initialSnapshot(),
      }));
      for (const run of runs) run.state = step(run.circuit, run.state, false);
      sim.step(false);
      const longest = Math.max(...runs.map((run) => run.ticks.length));
      for (let index = 0; index <= longest + 2; index++) {
        runs.forEach((run, copy) => {
          const tick = run.ticks[index];
          const gates = readCpu(sim, cpu, copy);
          const where = `${run.name}, tick ${index}`;
          const { probes: _p, ...before } = folded(run.state, stack);
          // Before the rising edge: the control word and bus the tick acts on.
          expect({ control: gates.control, bus: gates.bus }, `${where}: control and bus`).toEqual({
            control: before.control,
            bus: before.bus,
          });
          if (tick) expect(gates.bus, `${where}: bus vs trace`).toBe(tick.bus ?? "Z");
        });
        sim.tick();
        runs.forEach((run, copy) => {
          run.state = step(run.circuit, step(run.circuit, run.state, true), false);
          const tick = run.ticks[index];
          const gates = readCpu(sim, cpu, copy);
          const where = `${run.name}, after tick ${index}`;
          const after = folded(run.state, stack);
          expect(sim.unstable).toBe(0);
          expect(gates.probes, `${where}: probes vs folded`).toEqual(after.probes);
          expect(gates.ram, `${where}: RAM vs folded`).toEqual(after.ram);
          expect(gates.stack, `${where}: stack vs folded`).toEqual(after.stack);
          expect(gates.screen, `${where}: screen vs folded`).toEqual(after.screen);
          // Past its trace a program has halted, and HALT freezes it.
          const last = run.ticks[Math.min(index, run.ticks.length - 1)];
          const { BUS: _bus, ...probes } = gates.probes;
          expect(probes, `${where}: probes vs trace`).toEqual(expectedProbes(last));
          expect(gates.ram, `${where}: RAM vs trace`).toEqual(last.ram);
          expect(gates.screen, `${where}: screen vs trace`).toEqual(last.screen);
          if (stack === "hardware")
            expect(gates.stack.slice(0, last.registers.sp), `${where}: stack vs trace`).toEqual(
              last.stack,
            );
          expect(gates.control, `${where}: next control word vs folded`).toBe(after.control);
          if (!tick) expect(gates.halted, `${where}: halted`).toBe(true);
        });
      }
    }, 60_000);
  }

  it("measures ticks per second", () => {
    const sim = new NetlistSim(cpu.netlist);
    for (let i = 0; i < 2000; i++) sim.tick();
    const count = 5000;
    const start = performance.now();
    for (let i = 0; i < count; i++) sim.tick();
    const perSecond = Math.round(count / ((performance.now() - start) / 1000));
    console.info(
      `CPU as gates: ${cpu.netlist.stats.gates} gates, ${cpu.netlist.stats.flipFlops} flip-flops, ${cpu.netlist.stats.nets} nets, ${perSecond} ticks/s (×32 copies bit-parallel)`,
    );
    expect(perSecond).toBeGreaterThan(500);
  }, 30_000);
});

describe("netlist compiler", () => {
  it("keeps feedback loops: an SR latch built from NOR gates holds its bit", () => {
    const circuit = {
      name: "NOR latch",
      nodes: [
        { id: "s", type: "pulse" as const, x: 0, y: 0 },
        { id: "r", type: "pulse" as const, x: 0, y: 0 },
        { id: "q", type: "nor" as const, x: 0, y: 0 },
        { id: "nq", type: "nor" as const, x: 0, y: 0 },
      ],
      wires: [
        { id: "1", from: "r", to: "q", input: 0 },
        { id: "2", from: "nq", to: "q", input: 1 },
        { id: "3", from: "s", to: "nq", input: 0 },
        { id: "4", from: "q", to: "nq", input: 1 },
      ],
    };
    const netlist = compileNetlist(circuit);
    expect(netlist.stats.feedbackGates).toBe(2);
    const sim = new NetlistSim(netlist);
    const [s] = netlist.nodes.get("s")!;
    const [q] = netlist.nodes.get("q")!;
    sim.setConstant(s, -1);
    sim.step(false);
    expect(sim.bit(q)).toBe(true);
    sim.setConstant(s, 0);
    sim.step(false);
    expect(sim.bit(q)).toBe(true);
  });

  it("resolves a bus per copy: Z, one driver, agreeing and fighting drivers", () => {
    const node = (id: string, type: string, extra = {}) => ({ id, type, x: 0, y: 0, ...extra });
    const circuit = {
      name: "bus",
      nodes: [
        node("a", "input8", { numberValue: 5 }),
        node("b", "input8", { numberValue: 9 }),
        node("ma", "merger"),
        node("mb", "merger"),
        node("ea", "switch"),
        node("eb", "switch"),
        node("da", "busdriver"),
        node("db", "busdriver"),
        node("bus", "bus"),
      ],
      wires: [
        ...Array.from({ length: 8 }, (_, bit) => [
          { id: `a${bit}`, from: "a", output: bit, to: "ma", input: bit },
          { id: `b${bit}`, from: "b", output: bit, to: "mb", input: bit },
        ]).flat(),
        { id: "1", from: "ma", to: "da", input: 0 },
        { id: "2", from: "ea", to: "da", input: 1 },
        { id: "3", from: "mb", to: "db", input: 0 },
        { id: "4", from: "eb", to: "db", input: 1 },
        { id: "5", from: "da", to: "bus", input: 0 },
        { id: "6", from: "db", to: "bus", input: 1 },
      ],
    } as Parameters<typeof compileNetlist>[0];
    const netlist = compileNetlist(circuit);
    const sim = new NetlistSim(netlist);
    const [ea] = netlist.nodes.get("ea")!;
    const [eb] = netlist.nodes.get("eb")!;
    const b = netlist.nodes.get("b")!;
    // Copy 0: nobody drives. 1: A. 2: A and B disagree. 3: A and B both 5.
    sim.setConstant(ea, 0b1110);
    sim.setConstant(eb, 0b1100);
    for (const [bit, net] of b.entries())
      if ((5 >> bit) & 1) sim.setConstant(net, sim.values[net] | 0b1000);
    for (const [bit, net] of b.entries())
      if (!((5 >> bit) & 1)) sim.setConstant(net, sim.values[net] & ~0b1000);
    sim.step(false);
    const bus = netlist.buses.get("bus")!;
    expect([0, 1, 2, 3].map((copy) => sim.bus(bus, copy))).toEqual(["Z", 5, "X", 5]);
  });
});

describe("netlist worker protocol", () => {
  it("loads the CPU, runs it to HALT within a time budget and reads its probes", () => {
    const handle = createNetlistRunner();
    const loaded = handle({
      type: "load",
      circuit: cpuCircuit(compileProgram(SAMPLE_PROGRAMS.LOOP).bytes),
      halt: "halted",
    });
    expect(loaded.type === "loaded" && loaded.stats.gates).toBeGreaterThan(5000);
    let state = handle({ type: "step", ticks: 10 });
    expect(state).toMatchObject({ type: "state", tick: 10, ran: 10, halted: false });
    for (let i = 0; i < 100 && state.type === "state" && !state.halted; i++)
      state = handle({ type: "step", ticks: 1_000_000, budgetMs: 20 });
    expect(state).toMatchObject({ type: "state", halted: true, probes: { OUT: 6, ACC: 6 } });
    const total = state.type === "state" ? state.tick : 0;
    expect(handle({ type: "step", ticks: 50 })).toMatchObject({ ran: 0, tick: total });
    expect(handle({ type: "reset" })).toMatchObject({ tick: 0, halted: false, probes: { OUT: 0 } });
  });
});
