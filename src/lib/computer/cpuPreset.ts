// The toy CPU as a circuit: the program stepper's machine built from the
// datapath blocks and the control unit, on one shared 8-lane bus.
//
// The layout reads left to right like a datapath diagram: the clock and the
// code side (PC, CMAR, code ROM) on the left, then the bus drivers, the bus
// itself, and on the right every part that reads the bus (IR, operand
// register, ACC, ALU, flags, data RAM, stack, output). The control unit sits
// under the code side; its control lines fan out to every part. A named probe
// display sits beside each register, so `readProbes` returns the stepper's
// registers.
//
// The stepper's return stack is "write at SP, then SP + 1" (CALL) and "SP − 1,
// then read at SP" (RET), one micro-step each, so the stack here is a 16-byte
// RAM addressed by SP, and SP is a register with its own ALU as an
// incrementer. DMAR holds a full byte: F0–F7 reach the 8×8 screen instead of
// the RAM, and RAM_OUT drives whichever of the two the address selects. Every
// clocked part runs on the control unit's GCLK, so HALT
// freezes the whole machine.
import { compileProgram, SAMPLE_PROGRAMS, SIGNALS, type Signal } from "../computerStepper";
import { Builder, ports, type Ref, range } from "./blockBuilder";
import { addDataMemory, type DatapathKind, datapathNode } from "./datapathBlocks";
import type { Circuit } from "./logic";

/** Node ids of the parts a caller (tests, the joined UI) reads state from. */
export const CPU_PARTS = {
  control: "control",
  pc: "pc",
  cmar: "cmar",
  rom: "rom",
  ir: "ir",
  opr: "opr",
  dmar: "dmar",
  ram: "ram",
  screen: "screen",
  acc: "acc",
  alu: "alu",
  flags: "flags",
  sp: "sp",
  stack: "stack",
  out: "out",
  bus: "bus",
} as const;

/** Probe names on the CPU's displays. FLAGS bit 0 is carry, bit 1 is zero. */
export const CPU_PROBES = [
  "PC",
  "CMAR",
  "IR",
  "OPERAND",
  "DMAR",
  "ACC",
  "FLAGS",
  "SP",
  "OUT",
  "BUS",
] as const;
export type CpuProbe = (typeof CPU_PROBES)[number];

/** Which part drives the bus for each *_OUT line, in bus driver order. */
const DRIVERS: [Signal, string, string][] = [
  ["PC_OUT", "pc", "PC"],
  ["ROM_OUT", "rom", "ROM"],
  ["OPR_OUT", "opr", "OPERAND"],
  ["RAM_OUT", "ram", "RAM"],
  ["ACC_OUT", "acc", "ACC"],
  ["ALU_OUT", "alu", "ALU"],
  ["STACK_OUT", "stack", "STACK"],
];

// Columns, left to right.
const X = {
  clock: 0,
  code: 300,
  codeProbe: 700,
  merge: 1000,
  drive: 1250,
  bus: 1500,
  lanes: 1750,
  part: 2050,
  partProbe: 2450,
  helper: 2750,
};

function zeroTestCircuit(): Circuit {
  const b = new Builder();
  ports(
    b,
    range(8).map((bit) => [`a${bit}`, `A${bit}`]),
  );
  const any = b.orTree(
    "any",
    range(8).map((bit) => `a${bit}`),
    200,
    30,
    "ANY BIT",
  );
  b.gate("none", "not", 700, 30, any, undefined, "ALL ZERO");
  b.gate("zero", "lamp", 850, 30, "none", undefined, "ZERO");
  return b.circuit("Zero test");
}

/**
 * The CPU with `bytes` in its code ROM, e.g. `compileProgram(source).bytes`.
 * Drive it with the `clock` node: one full clock cycle (high, then low) is one
 * stepper tick.
 */
export function cpuCircuit(bytes: readonly number[], name = "Toy CPU"): Circuit {
  const b = new Builder();
  const block = (kind: DatapathKind, id: string, x: number, y: number, label: string) => {
    const node = datapathNode(kind, id, x, y, kind === "rom256" ? bytes : undefined);
    b.nodes.push({ ...node, label });
    return id;
  };
  const line = (signal: Signal): Ref => [CPU_PARTS.control, SIGNALS.indexOf(signal)];
  const gclk: Ref = [CPU_PARTS.control, SIGNALS.length];
  const lane = (bit: number): Ref => ["bus-lanes", bit];
  const bits = (id: string, count = 8) => range(count).map((bit): Ref => [id, bit]);
  const wireBits = (from: Ref[], to: string, first = 0) => {
    for (const [bit, source] of from.entries()) b.connect(source, to, first + bit);
  };
  const probe = (id: string, name: CpuProbe, x: number, y: number, from: Ref[]) => {
    b.add(id, from.length > 4 ? "display8" : "display4", x, y, name, { probe: name });
    wireBits(from, id);
  };
  // Data RAM and screen behind DMAR; RAM_OUT drives the selected byte.
  const dataRead = addDataMemory(b, {
    address: bits(CPU_PARTS.dmar),
    data: range(8).map(lane),
    we: line("RAM_IN"),
    clock: gclk,
    ram: { id: CPU_PARTS.ram, x: X.part, y: 2740, label: "DATA RAM" },
    screen: { id: CPU_PARTS.screen, x: X.part, y: 4550, label: "8×8 SCREEN" },
    x: X.helper,
    y: 2320,
  });
  const driverBits = (part: string) => (part === CPU_PARTS.ram ? dataRead : bits(part));
  /** A register8 that loads the bus on `load`, clocked by GCLK. */
  const busRegister = (id: string, y: number, label: string, load: Ref) => {
    block("register8", id, X.part, y, label);
    wireBits(range(8).map(lane), id);
    b.connect(load, id, 8);
    b.connect(gclk, id, 9);
  };

  // ------------------------------------------------------------ clock + code side
  ports(b, [["clock", "CLOCK"]]);
  block("counter8", CPU_PARTS.pc, X.code, 30, "PROGRAM COUNTER");
  wireBits(range(8).map(lane), CPU_PARTS.pc);
  b.connect(line("PC_INC"), CPU_PARTS.pc, 8);
  b.connect(line("PC_IN"), CPU_PARTS.pc, 9);
  b.connect(gclk, CPU_PARTS.pc, 10);
  probe("pc-probe", "PC", X.codeProbe, 30, bits(CPU_PARTS.pc));

  block("register8", CPU_PARTS.cmar, X.code, 500, "CODE ADDRESS (CMAR)");
  wireBits(range(8).map(lane), CPU_PARTS.cmar);
  b.connect(line("CMAR_IN"), CPU_PARTS.cmar, 8);
  b.connect(gclk, CPU_PARTS.cmar, 9);
  probe("cmar-probe", "CMAR", X.codeProbe, 500, bits(CPU_PARTS.cmar));

  block("rom256", CPU_PARTS.rom, X.code, 950, "CODE ROM");
  wireBits(bits(CPU_PARTS.cmar), CPU_PARTS.rom);

  // ------------------------------------------------------------ control unit
  block("control", CPU_PARTS.control, X.code, 1400, "CONTROL UNIT");
  wireBits(bits(CPU_PARTS.ir), CPU_PARTS.control);
  b.connect([CPU_PARTS.flags, 0], CPU_PARTS.control, 8);
  b.connect("clock", CPU_PARTS.control, 9);

  // ------------------------------------------------------------ bus
  DRIVERS.forEach(([signal, part, label], index) => {
    const y = 30 + index * 420;
    b.add(`${part}-lanes`, "merger", X.merge, y, `${label} LANES`);
    wireBits(driverBits(part), `${part}-lanes`);
    b.add(`${part}-drive`, "busdriver", X.drive, y, signal);
    b.connect(`${part}-lanes`, `${part}-drive`);
    b.connect(line(signal), `${part}-drive`, 1);
    b.connect(`${part}-drive`, CPU_PARTS.bus, index);
  });
  b.add(CPU_PARTS.bus, "bus", X.bus, 1200, "SHARED BUS");
  b.add("bus-lanes", "splitter", X.lanes, 1200, "BUS LANES");
  b.connect(CPU_PARTS.bus, "bus-lanes");
  probe("bus-probe", "BUS", X.lanes, 1600, range(8).map(lane));

  // ------------------------------------------------------------ bus readers
  busRegister(CPU_PARTS.ir, 30, "INSTRUCTION (IR)", line("IR_IN"));
  probe("ir-probe", "IR", X.partProbe, 30, bits(CPU_PARTS.ir));

  busRegister(CPU_PARTS.opr, 450, "OPERAND", line("OPR_IN"));
  probe("opr-probe", "OPERAND", X.partProbe, 450, bits(CPU_PARTS.opr));

  busRegister(CPU_PARTS.acc, 870, "ACCUMULATOR", line("ACC_IN"));
  probe("acc-probe", "ACC", X.partProbe, 870, bits(CPU_PARTS.acc));

  block("alu8", CPU_PARTS.alu, X.part, 1290, "ALU");
  wireBits(bits(CPU_PARTS.acc), CPU_PARTS.alu);
  wireBits(bits(CPU_PARTS.opr), CPU_PARTS.alu, 8);
  b.connect(line("ALU_SUB"), CPU_PARTS.alu, 16);

  // FLAGS_IN latches the ALU's carry (or borrow); zero is wired to ACC.
  block("register8", CPU_PARTS.flags, X.part, 1900, "CARRY FLAG");
  b.connect([CPU_PARTS.alu, 8], CPU_PARTS.flags, 0);
  b.connect(line("FLAGS_IN"), CPU_PARTS.flags, 8);
  b.connect(gclk, CPU_PARTS.flags, 9);
  b.nodes.push({
    id: "zero",
    type: "module",
    x: X.helper,
    y: 870,
    label: "ACC = 0",
    module: zeroTestCircuit(),
  });
  wireBits(bits(CPU_PARTS.acc), "zero");
  probe("flags-probe", "FLAGS", X.partProbe, 1900, [
    [CPU_PARTS.flags, 0],
    ["zero", 0],
  ]);

  busRegister(CPU_PARTS.dmar, 2320, "DATA ADDRESS (DMAR)", line("DMAR_IN"));
  probe("dmar-probe", "DMAR", X.partProbe, 2320, bits(CPU_PARTS.dmar));

  // SP ← SP ± 1 through its own ALU; the stack RAM is addressed by SP.
  block("register8", CPU_PARTS.sp, X.part, 3200, "STACK POINTER (SP)");
  block("alu8", "sp-step", X.helper, 3200, "SP ± 1");
  b.add("one", "high", X.helper, 3700, "1");
  wireBits(bits(CPU_PARTS.sp), "sp-step");
  b.connect("one", "sp-step", 8);
  b.connect(line("SP_DEC"), "sp-step", 16);
  wireBits(bits("sp-step"), CPU_PARTS.sp);
  b.gate("sp-move", "or", X.helper, 3850, line("SP_INC"), line("SP_DEC"), "SP MOVES");
  b.connect("sp-move", CPU_PARTS.sp, 8);
  b.connect(gclk, CPU_PARTS.sp, 9);
  probe("sp-probe", "SP", X.partProbe, 3200, bits(CPU_PARTS.sp));

  block("ram16", CPU_PARTS.stack, X.part, 3650, "RETURN STACK");
  wireBits(bits(CPU_PARTS.sp, 4), CPU_PARTS.stack);
  wireBits(range(8).map(lane), CPU_PARTS.stack, 4);
  b.connect(line("STACK_IN"), CPU_PARTS.stack, 12);
  b.connect(gclk, CPU_PARTS.stack, 13);

  busRegister(CPU_PARTS.out, 4100, "OUTPUT", line("OUT_IN"));
  probe("out-probe", "OUT", X.partProbe, 4100, bits(CPU_PARTS.out));

  // A packaged circuit needs a lamp output; this one shows the HALT line.
  b.gate("halted", "lamp", X.codeProbe, 1400, line("HALT"), undefined, "HALTED");

  return {
    ...b.circuit(name),
    groups: [
      {
        id: "code",
        label: "Fetch: program counter, code address and code ROM",
        nodeIds: [CPU_PARTS.pc, "pc-probe", CPU_PARTS.cmar, "cmar-probe", CPU_PARTS.rom],
      },
      {
        id: "bus",
        label: "One shared bus: each *_OUT line enables one driver",
        nodeIds: [
          ...DRIVERS.flatMap(([, part]) => [`${part}-lanes`, `${part}-drive`]),
          CPU_PARTS.bus,
          "bus-lanes",
          "bus-probe",
        ],
      },
    ],
  };
}

/** The CPU preset with a program compiled from source. */
export const cpuFromSource = (source: string, name?: string) =>
  cpuCircuit(compileProgram(source).bytes, name);

/** Builder examples: the CPU running one of the stepper's sample programs. */
export const CPU_PRESETS: Record<string, Circuit> = {
  "Toy CPU (LOOP program)": cpuFromSource(SAMPLE_PROGRAMS.LOOP, "Toy CPU (LOOP program)"),
};

export const CPU_HINTS: Record<string, string> = {
  "Toy CPU (LOOP program)":
    "The program stepper's CPU, running its LOOP program. Each clock cycle is one micro-step: the control unit switches on its control lines, one part drives the bus, and the parts whose *_IN line is on take the bus value. Run the clock until HALTED lights; OUT then shows 6.",
};
