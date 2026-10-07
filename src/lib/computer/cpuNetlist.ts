// The toy CPU as a gate netlist: where its ROM bytes, control word, bus, RAM
// and stack live once every block is unfolded, so a run can load programs and
// read the machine back out. Paths come from the preset builder's node ids,
// not from the ISA, so new opcodes or microcode change nothing here.
import { SIGNALS } from "../computerStepper";
import type { BusValue } from "./bus";
import { CPU_PARTS } from "./cpuPreset";
import type { Circuit } from "./logic";
import { compileNetlist, type Netlist, type NetlistSim } from "./netlist";

export type CpuNetlist = {
  netlist: Netlist;
  /** Code ROM bytes, 8 constant nets each. */
  rom: number[][];
  /** The same bytes again in the blitter's read port on the code ROM; empty without a blitter. */
  blitterRom: number[][];
  /** The control unit's lines, in SIGNALS order. */
  control: number[];
  halt: number;
  bus: number;
  /** Data RAM and stack rows, 8 flip-flop nets each, as many as the preset builds. */
  ram: number[][];
  stack: number[][];
  /** Screen rows (y), bit i = pixel x = i; empty when the preset has no screen. */
  screen: number[][];
  /** The big screen's frame bytes, bank after bank; empty when the preset has none. */
  frame: number[][];
};

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Reads items 0, 1, 2, … until `read` finds none (memory rows, ROM pages). */
function sequence<T>(read: (i: number) => T | undefined): T[] {
  const found: T[] = [];
  for (let i = 0; ; i++) {
    const item = read(i);
    if (item === undefined) return found;
    found.push(item);
  }
}

export function cpuNetlist(circuit: Circuit): CpuNetlist {
  const netlist = compileNetlist(circuit);
  const nets = (path: string) => {
    const found = netlist.nodes.get(path);
    if (!found) throw new Error(`The CPU netlist has no node ${path}.`);
    return found;
  };
  const rows = (part: string) =>
    sequence((r) =>
      netlist.nodes.has(`${part}/row${r}/cell0`)
        ? range(8).map((bit) => nets(`${part}/row${r}/cell${bit}`)[0])
        : undefined,
    );
  const control = nets(CPU_PARTS.control).slice(0, SIGNALS.length);
  const bus = netlist.buses.get(CPU_PARTS.bus);
  if (bus === undefined) throw new Error("The CPU netlist has no bus.");
  const romBytes = (part: string) =>
    sequence((page) =>
      netlist.nodes.has(`${part}/page${page}/byte0`)
        ? range(16).map((r) => nets(`${part}/page${page}/byte${r}`))
        : undefined,
    ).flat();
  return {
    netlist,
    rom: romBytes(CPU_PARTS.rom),
    blitterRom: romBytes(CPU_PARTS.blitterRom),
    control,
    halt: control[SIGNALS.indexOf("HALT")],
    bus,
    ram: rows(CPU_PARTS.ram),
    stack: rows(CPU_PARTS.stack),
    screen: rows(CPU_PARTS.screen),
    frame: sequence((bank) =>
      netlist.nodes.has(`${CPU_PARTS.bigScreen}/frame/bank${bank}/row0/cell0`)
        ? rows(`${CPU_PARTS.bigScreen}/frame/bank${bank}`)
        : undefined,
    ).flat(),
  };
}

/** Loads `bytes` into copy `copy`'s code ROM (both read ports); the other copies keep theirs. */
export function loadProgram(sim: NetlistSim, cpu: CpuNetlist, bytes: readonly number[], copy = 0) {
  const mask = 1 << copy;
  for (const rom of [cpu.rom, cpu.blitterRom])
    for (const [address, nets] of rom.entries())
      for (const [bit, net] of nets.entries()) {
        const on = ((bytes[address] ?? 0) >> bit) & 1;
        sim.setConstant(net, on ? sim.values[net] | mask : sim.values[net] & ~mask);
      }
}

export type CpuState = {
  control: number;
  bus: BusValue;
  probes: Record<string, number>;
  ram: number[];
  stack: number[];
  screen: number[];
  frame: number[];
  halted: boolean;
};

/** The machine state of one copy, as the lockstep tests and the UI read it. */
export function readCpu(sim: NetlistSim, cpu: CpuNetlist, copy = 0): CpuState {
  return {
    control: cpu.control.reduce((word, net, i) => (sim.bit(net, copy) ? word | (1 << i) : word), 0),
    bus: sim.bus(cpu.bus, copy),
    probes: sim.probes(copy),
    ram: cpu.ram.map((row) => sim.number(row, copy)),
    stack: cpu.stack.map((row) => sim.number(row, copy)),
    screen: cpu.screen.map((row) => sim.number(row, copy)),
    frame: cpu.frame.map((row) => sim.number(row, copy)),
    halted: sim.bit(cpu.halt, copy),
  };
}
