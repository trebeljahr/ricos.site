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
// the RAM, F8–FA its pixel port (cursor x, cursor y, plot one pixel), E0–E4
// the blitter's registers, and RAM_OUT drives whichever the address selects.
// The blitter reads sprites through a second read port on the code ROM: a
// copy of the ROM addressed by the blitter, so it never waits for a fetch. Every
// clocked part runs on the control unit's GCLK, so HALT
// freezes the whole machine, except the video: a scanout reads the screen
// through its second port one pixel per tick of the raw clock, a monitor
// paints what it reads, and LDM FB reads the scanout's VBLANK.
//
// The stack-in-RAM variant drops the return stack. Data RAM grows to 32 bytes
// (5 address bits), SP is a register that resets to 32, and two more parts drive
// the bus: SP itself and a second adder for SP + OPR, the address of a byte in
// the current stack frame. SP_IN loads SP from the bus (ADDSP), so SP's input
// picks between the bus and SP ± 1. Its control unit holds the variant's
// microcode, generated from the same table as the stepper's.
//
// Both variants have a key port and an interrupt path. Eight KEY BIT switches
// and a KEY PRESS switch stand in for a keyboard: on a clock edge with KEY
// PRESS on, the KEY register latches the code and the KEY READY flip-flop goes
// on; KEY_OUT (the IN instruction) drives the code onto the bus and clears KEY
// READY. IE is a flip-flop set by IE_SET and cleared by IE_CLR. IRQ is KEY READY
// AND IE as they will be after the edge; the INT flip-flop takes it on every
// STEP_RESET edge and otherwise holds. INT tells the control unit to run the
// interrupt entry, which ends with VEC_OUT driving the handler vector onto the
// bus. The bus has 8 driver slots, so drivers past the seventh share an
// auxiliary bus that feeds the last slot.
import {
  compileProgram,
  defaultMicrocode,
  INTERRUPT_SAMPLES,
  INTERRUPT_VECTOR,
  type MicrocodeTable,
  microcodeRom,
  RAM_STACK_SAMPLES,
  SAMPLE_PROGRAMS,
  SIGNALS,
  type Signal,
  type StackModel,
  VIDEO_SAMPLES,
} from "../computerStepper";
import { BLITTER_OUTPUTS } from "./blitterBlock";
import { Builder, ports, type Ref, range } from "./blockBuilder";
import { controlBlockCircuit } from "./controlUnit";
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
  pixelX: "pixel-x",
  pixelY: "pixel-y",
  plotter: "plotter",
  scanout: "scanout",
  crt: "crt",
  blitter: "blitter",
  blitterRom: "blitter-rom",
  acc: "acc",
  alu: "alu",
  flags: "flags",
  sp: "sp",
  stack: "stack",
  frame: "frame",
  out: "out",
  bus: "bus",
  key: "key",
  keyReady: "key-ready",
  ie: "ie",
  irq: "irq",
  int: "int",
} as const;

/** Switch ids of the keyboard: KEY BIT 0–7 and KEY PRESS. */
export const KEY_SWITCHES = {
  bits: range(8).map((bit) => `key-bit${bit}`),
  press: "key-press",
} as const;

/** Switch overrides that press `code` on the next rising clock edge. */
export const keyPressOverrides = (code: number): Record<string, boolean> =>
  Object.fromEntries([
    ...KEY_SWITCHES.bits.map((id, bit) => [id, Boolean((code >> bit) & 1)]),
    [KEY_SWITCHES.press, true],
  ]);

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
  "KEY",
  "IRQ",
] as const;
export type CpuProbe = (typeof CPU_PROBES)[number];

/** Which part drives the bus for each *_OUT line, in bus driver order. */
const SHARED_DRIVERS: [Signal, string, string][] = [
  ["PC_OUT", "pc", "PC"],
  ["ROM_OUT", "rom", "ROM"],
  ["OPR_OUT", "opr", "OPERAND"],
  ["RAM_OUT", "ram", "RAM"],
  ["ACC_OUT", "acc", "ACC"],
  ["ALU_OUT", "alu", "ALU"],
];
const INTERRUPT_DRIVERS: [Signal, string, string][] = [
  ["KEY_OUT", "key", "KEY"],
  ["VEC_OUT", "vector", "VECTOR"],
];
const DRIVERS: Record<StackModel, [Signal, string, string][]> = {
  hardware: [...SHARED_DRIVERS, ["STACK_OUT", "stack", "STACK"], ...INTERRUPT_DRIVERS],
  ram: [
    ...SHARED_DRIVERS,
    ["SP_OUT", "sp", "SP"],
    ["FRAME_OUT", "frame", "SP + OPR"],
    ...INTERRUPT_DRIVERS,
  ],
};
/** Drivers wired straight to the shared bus; the rest go through the auxiliary bus. */
const MAIN_SLOTS = 7;

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
  port: 4050,
  portProbe: 4450,
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
 * stepper tick. `stack` picks the variant; compile the bytes for the same one.
 * `table` is the microcode its control unit's ROM is generated from; pass the
 * same table to `traceTicks` to run them in lockstep.
 */
export function cpuCircuit(
  bytes: readonly number[],
  name = "Toy CPU",
  stack: StackModel = "hardware",
  table: MicrocodeTable = defaultMicrocode(stack),
): Circuit {
  if (table.stack !== stack) throw new Error(`The microcode table is for the ${table.stack} CPU.`);
  const inRam = stack === "ram";
  const drivers = DRIVERS[stack];
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
    ram: { id: CPU_PARTS.ram, x: X.part, y: 2740, label: inRam ? "DATA RAM + STACK" : "DATA RAM" },
    ramKind: inRam ? "ram32" : "ram16",
    screen: { id: CPU_PARTS.screen, x: X.part, y: 4550, label: "8×8 SCREEN" },
    pixel: {
      x: { id: CPU_PARTS.pixelX, x: X.port, y: 3700, label: "PIXEL X (F8)" },
      y: { id: CPU_PARTS.pixelY, x: X.port, y: 4150, label: "PIXEL Y (F9)" },
      plotter: { id: CPU_PARTS.plotter, x: X.port, y: 4600, label: "PIXEL PLOTTER (FA)" },
    },
    // The beam runs on the raw clock, so the picture stays up after HALT.
    video: {
      scanout: { id: CPU_PARTS.scanout, x: X.port, y: 5150, label: "SCANOUT (FB = VBLANK)" },
      crt: { id: CPU_PARTS.crt, x: X.part, y: 5150, label: "8×8 MONITOR" },
      clock: "clock",
    },
    blitter: {
      unit: { id: CPU_PARTS.blitter, x: X.port, y: 5700, label: "BLITTER (E0–E4)" },
      rom: { id: CPU_PARTS.blitterRom, x: X.port, y: 6200, label: "CODE ROM, BLITTER PORT" },
      bytes,
    },
    x: X.helper,
    y: 2320,
  });
  for (const [part, y, label] of [
    [CPU_PARTS.pixelX, 3700, "PIXEL X"],
    [CPU_PARTS.pixelY, 4150, "PIXEL Y"],
  ] as const) {
    b.add(`${part}-display`, "display4", X.portProbe, y, label);
    wireBits(bits(part, 3), `${part}-display`);
  }
  b.gate(
    "blitter-busy",
    "lamp",
    X.portProbe,
    5700,
    [CPU_PARTS.blitter, BLITTER_OUTPUTS.busy],
    undefined,
    "BLITTER BUSY",
  );
  // The handler vector: a constant byte, one HIGH or GROUND per bit.
  b.add("vec-one", "high", X.clock, 5000, "1");
  b.add("vec-zero", "ground", X.clock, 5100, "0");
  const vectorBits = range(8).map(
    (bit): Ref => ((INTERRUPT_VECTOR >> bit) & 1 ? "vec-one" : "vec-zero"),
  );
  const driverBits = (part: string) =>
    part === CPU_PARTS.ram ? dataRead : part === "vector" ? vectorBits : bits(part);
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
  b.nodes.push({
    id: CPU_PARTS.control,
    type: "module",
    x: X.code,
    y: 1400,
    label: "CONTROL UNIT",
    module: controlBlockCircuit("control", microcodeRom(table), table.opcodes),
    behaviour: "control",
  });
  wireBits(bits(CPU_PARTS.ir), CPU_PARTS.control);
  b.connect([CPU_PARTS.flags, 0], CPU_PARTS.control, 8);
  b.connect("clock", CPU_PARTS.control, 9);
  b.connect(CPU_PARTS.int, CPU_PARTS.control, 10);
  b.connect(["zero", 0], CPU_PARTS.control, 11);

  // ------------------------------------------------------------ bus
  drivers.forEach(([signal, part, label], index) => {
    const y = 30 + index * 420;
    b.add(`${part}-lanes`, "merger", X.merge, y, `${label} LANES`);
    wireBits(driverBits(part), `${part}-lanes`);
    b.add(`${part}-drive`, "busdriver", X.drive, y, signal);
    b.connect(`${part}-lanes`, `${part}-drive`);
    b.connect(line(signal), `${part}-drive`, 1);
    if (index < MAIN_SLOTS) b.connect(`${part}-drive`, CPU_PARTS.bus, index);
    else b.connect(`${part}-drive`, "aux-bus", index - MAIN_SLOTS);
  });
  b.add("aux-bus", "bus", X.bus, 30 + MAIN_SLOTS * 420, "MORE DRIVERS");
  b.connect("aux-bus", CPU_PARTS.bus, MAIN_SLOTS);
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
  b.connect(line("ALU_AND"), CPU_PARTS.alu, 17);

  // FLAGS_IN latches the ALU's carry (or borrow); zero is wired to ACC and
  // goes back to the control unit, which branches on it like on carry.
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

  // SP ← SP ± 1 through its own ALU.
  block(inRam ? "sp8" : "register8", CPU_PARTS.sp, X.part, 3200, "STACK POINTER (SP)");
  block("alu8", "sp-step", X.helper, 3200, "SP ± 1");
  b.add("one", "high", X.helper, 3700, "1");
  wireBits(bits(CPU_PARTS.sp), "sp-step");
  b.connect("one", "sp-step", 8);
  b.connect(line("SP_DEC"), "sp-step", 16);
  b.gate("sp-move", "or", X.helper, 3850, line("SP_INC"), line("SP_DEC"), "SP MOVES");
  b.connect(gclk, CPU_PARTS.sp, 9);
  probe("sp-probe", "SP", X.partProbe, 3200, bits(CPU_PARTS.sp));

  if (inRam) {
    // SP's input: the bus on SP_IN (ADDSP), else SP ± 1.
    b.gate("sp-keep-step", "not", X.helper, 4000, line("SP_IN"), undefined, "NOT SP_IN");
    for (const bit of range(8)) {
      const y = 4100 + bit * 120;
      const fromBus = b.gate(`sp-bus${bit}`, "and", X.helper, y, lane(bit), line("SP_IN"));
      const fromStep = b.gate(
        `sp-step${bit}`,
        "and",
        X.helper,
        y + 60,
        ["sp-step", bit],
        "sp-keep-step",
      );
      b.gate(`sp-d${bit}`, "or", X.helper + 150, y, fromBus, fromStep);
      b.connect(`sp-d${bit}`, CPU_PARTS.sp, bit);
    }
    b.gate("sp-load", "or", X.helper + 150, 3850, "sp-move", line("SP_IN"), "SP LOADS");
    b.connect("sp-load", CPU_PARTS.sp, 8);

    // SP + OPR: the address of a stack-frame byte, for LDS, STS, ADDS, SUBS and ADDSP.
    block("alu8", CPU_PARTS.frame, X.part, 3650, "FRAME ADDRESS (SP + OPR)");
    wireBits(bits(CPU_PARTS.sp), CPU_PARTS.frame);
    wireBits(bits(CPU_PARTS.opr), CPU_PARTS.frame, 8);
    b.add("add", "ground", X.helper, 3650, "ADD");
    b.connect("add", CPU_PARTS.frame, 16);
  } else {
    wireBits(bits("sp-step"), CPU_PARTS.sp);
    b.connect("sp-move", CPU_PARTS.sp, 8);

    // The return stack is a RAM addressed by SP.
    block("ram16", CPU_PARTS.stack, X.part, 3650, "RETURN STACK");
    wireBits(bits(CPU_PARTS.sp, 4), CPU_PARTS.stack);
    wireBits(range(8).map(lane), CPU_PARTS.stack, 4);
    b.connect(line("STACK_IN"), CPU_PARTS.stack, 12);
    b.connect(gclk, CPU_PARTS.stack, 13);
  }

  busRegister(CPU_PARTS.out, 4100, "OUTPUT", line("OUT_IN"));
  probe("out-probe", "OUT", X.partProbe, 4100, bits(CPU_PARTS.out));

  // ------------------------------------------------------------ keyboard + interrupt
  const keyY = 5300;
  b.add(KEY_SWITCHES.press, "switch", X.clock, keyY + 8 * 90, "KEY PRESS");
  block("register8", CPU_PARTS.key, X.code, keyY, "KEY PORT");
  for (const [bit, id] of KEY_SWITCHES.bits.entries()) {
    b.add(id, "switch", X.clock, keyY + bit * 90, `KEY BIT ${bit}`);
    b.connect(id, CPU_PARTS.key, bit);
  }
  b.connect(KEY_SWITCHES.press, CPU_PARTS.key, 8);
  b.connect(gclk, CPU_PARTS.key, 9);
  probe("key-probe", "KEY", X.codeProbe, keyY, bits(CPU_PARTS.key));
  /** A flip-flop clocked by GCLK whose next value is `next`. */
  const flag = (id: string, y: number, label: string, next: Ref) => {
    b.add(id, "dff", X.merge, y, label);
    b.connect(next, id, 0);
    b.connect(gclk, id, 1);
  };
  const flagY = keyY + 500;
  // KEY READY: set by a press, cleared when IN reads the key.
  b.gate("key-unread", "not", X.code, flagY, line("KEY_OUT"), undefined, "NOT KEY_OUT");
  b.gate("key-waits", "and", X.code + 150, flagY, CPU_PARTS.keyReady, "key-unread");
  const ready = b.gate("ready-next", "or", X.codeProbe, flagY, KEY_SWITCHES.press, "key-waits");
  flag(CPU_PARTS.keyReady, flagY, "KEY READY", ready);
  // IE: set by IE_SET (EI, RETI), cleared by IE_CLR (DI, interrupt entry).
  b.gate("ie-kept", "not", X.code, flagY + 200, line("IE_CLR"), undefined, "NOT IE_CLR");
  b.gate("ie-stays", "and", X.code + 150, flagY + 200, CPU_PARTS.ie, "ie-kept");
  const enabled = b.gate("ie-next", "or", X.codeProbe, flagY + 200, line("IE_SET"), "ie-stays");
  flag(CPU_PARTS.ie, flagY + 200, "INTERRUPTS ON (IE)", enabled);
  // INT: takes IRQ when an instruction ends, otherwise holds.
  b.gate(CPU_PARTS.irq, "and", X.drive, flagY + 100, ready, enabled, "IRQ");
  b.gate("int-take", "and", X.drive, flagY + 400, line("STEP_RESET"), CPU_PARTS.irq);
  b.gate("int-mid", "not", X.code, flagY + 400, line("STEP_RESET"), undefined, "NOT STEP_RESET");
  b.gate("int-hold", "and", X.code + 150, flagY + 400, "int-mid", CPU_PARTS.int);
  b.gate("int-next", "or", X.codeProbe, flagY + 400, "int-take", "int-hold");
  flag(CPU_PARTS.int, flagY + 400, "INT", "int-next");
  probe("irq-probe", "IRQ", X.bus, flagY, [CPU_PARTS.keyReady, CPU_PARTS.ie, CPU_PARTS.int]);

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
        id: "interrupt",
        label: "Interrupt: key press → KEY READY → IRQ → INT → push PC → vector",
        nodeIds: [
          ...KEY_SWITCHES.bits,
          KEY_SWITCHES.press,
          CPU_PARTS.key,
          "key-probe",
          CPU_PARTS.keyReady,
          CPU_PARTS.ie,
          CPU_PARTS.irq,
          CPU_PARTS.int,
          "irq-probe",
        ],
        activeWhen: CPU_PARTS.int,
      },
      {
        id: "screen",
        label: "Screen: STM F8 sets the cursor's x, F9 its y, FA plots one pixel",
        nodeIds: [
          CPU_PARTS.screen,
          CPU_PARTS.pixelX,
          `${CPU_PARTS.pixelX}-display`,
          CPU_PARTS.pixelY,
          `${CPU_PARTS.pixelY}-display`,
          CPU_PARTS.plotter,
          CPU_PARTS.scanout,
          CPU_PARTS.crt,
        ],
      },
      {
        id: "blitter",
        label: "Blitter: draws one screen row per tick by itself; while BUSY it owns the screen",
        nodeIds: [CPU_PARTS.blitter, CPU_PARTS.blitterRom, "blitter-busy"],
        activeWhen: "blitter-busy",
      },
      {
        id: "bus",
        label: "One shared bus: each *_OUT line enables one driver",
        nodeIds: [
          ...drivers.flatMap(([, part]) => [`${part}-lanes`, `${part}-drive`]),
          CPU_PARTS.bus,
          "aux-bus",
          "bus-lanes",
          "bus-probe",
        ],
      },
    ],
  };
}

/** The CPU preset with a program compiled from source for the same variant. */
export const cpuFromSource = (source: string, name?: string, stack: StackModel = "hardware") =>
  cpuCircuit(compileProgram(source, { stack }).bytes, name, stack);

const LOOP_PRESET = "Toy CPU (LOOP program)";
const RECURSION_PRESET = "Toy CPU, stack in RAM (RECURSION program)";
const KEYBOARD_PRESET = "Toy CPU (KEYBOARD program)";
const CROSS_PRESET = "Toy CPU (CROSS program)";
const TEARING_PRESET = "Toy CPU (TEARING program)";
const VSYNC_PRESET = "Toy CPU (VSYNC program)";
const SCANOUT_PRESET = "Scanout and monitor";
const BLIT_PRESET = "Toy CPU (BLIT program)";

/**
 * A dual-port screen read by a scanout, which drives a monitor: the reader
 * writes rows with ROW, DATA and WE while the beam reads them out.
 */
function scanoutBench(): Circuit {
  const b = new Builder();
  b.add("row", "input4", 0, 40, "ROW", { numberValue: 3 });
  b.add("data", "input8", 0, 240, "DATA", { numberValue: 0x3c });
  b.add("we", "switch", 0, 520, "WE");
  b.add("clk", "clock", 0, 640, "CLOCK");
  b.nodes.push({ ...datapathNode("vram8x8", "vram", 400, 40), label: "DUAL-PORT SCREEN" });
  b.nodes.push(datapathNode("scanout", "scanout", 800, 40));
  b.nodes.push(datapathNode("crt8x8", "monitor", 1200, 40));
  for (let bit = 0; bit < 3; bit++) b.connect(["row", bit], "vram", bit);
  for (let bit = 0; bit < 8; bit++) b.connect(["data", bit], "vram", 3 + bit);
  b.connect("we", "vram", 11);
  for (let bit = 0; bit < 3; bit++) b.connect(["scanout", 4 + bit], "vram", 12 + bit);
  b.connect("clk", "vram", 15);
  for (let bit = 0; bit < 8; bit++) b.connect(["vram", 8 + bit], "scanout", bit);
  b.connect("clk", "scanout", 8);
  for (const [input, output] of [0, 7, 8].entries())
    b.connect(["scanout", output], "monitor", input);
  b.connect("clk", "monitor", 3);
  for (const [i, [output, label]] of (
    [
      [7, "HSYNC"],
      [8, "VSYNC"],
      [9, "VBLANK"],
    ] as const
  ).entries())
    b.gate(
      `lamp-${label.toLowerCase()}`,
      "lamp",
      1200,
      520 + i * 100,
      ["scanout", output],
      undefined,
      label,
    );
  return b.circuit(SCANOUT_PRESET);
}

/** Builder examples: the CPU running one of the stepper's sample programs. */
export const CPU_PRESETS: Record<string, Circuit> = {
  [LOOP_PRESET]: cpuFromSource(SAMPLE_PROGRAMS.LOOP, LOOP_PRESET),
  [RECURSION_PRESET]: cpuFromSource(RAM_STACK_SAMPLES.RECURSION, RECURSION_PRESET, "ram"),
  [KEYBOARD_PRESET]: cpuFromSource(INTERRUPT_SAMPLES.KEYBOARD, KEYBOARD_PRESET),
  [CROSS_PRESET]: cpuFromSource(SAMPLE_PROGRAMS.CROSS, CROSS_PRESET),
  [SCANOUT_PRESET]: scanoutBench(),
  [TEARING_PRESET]: cpuFromSource(VIDEO_SAMPLES.TEARING, TEARING_PRESET),
  [VSYNC_PRESET]: cpuFromSource(VIDEO_SAMPLES.VSYNC, VSYNC_PRESET),
  [BLIT_PRESET]: cpuFromSource(SAMPLE_PROGRAMS.BLIT, BLIT_PRESET),
};

export const CPU_HINTS: Record<string, string> = {
  [LOOP_PRESET]:
    "The program stepper's CPU, running its LOOP program. Each clock cycle is one micro-step: the control unit switches on its control lines, one part drives the bus, and the parts whose *_IN line is on take the bus value. Run the clock until HALTED lights; OUT then shows 6.",
  [RECURSION_PRESET]:
    "The same CPU with its stack in data RAM: SP starts at 32 and counts down, CALL stores the return address at RAM[SP], and each call of sum gets its own stack frame at SP + 0, SP + 1, … That is what lets sum call itself. Run the clock until HALTED lights; OUT then shows 10.",
  [KEYBOARD_PRESET]:
    "The CPU waiting in a loop for keys. Set a key code on KEY BIT 0–7, switch KEY PRESS on for one clock cycle, then off. KEY READY and IRQ light; when the current instruction ends, INT comes on and the interrupt box glows: the control unit pushes PC, turns interrupts off and drives the vector 02 into PC. The handler draws the key code on screen row 3 and counts the presses on OUT.",
  [SCANOUT_PRESET]:
    "A real display is read out, not looked at: the SCANOUT reads one pixel per clock tick, left to right and top to bottom, and the MONITOR paints it where its own beam is. HSYNC ends each line and VSYNC each frame, so the monitor's beam stays in step; lines 8–15 are vertical blank, when the beam is off the screen. The CPU and the beam share one framebuffer. This one is dual-ported: the beam reads through RA and V while writes go through A, D and WE, so neither ever waits. The other way is arbitration on one port, where the beam wins and the CPU stalls. Set ROW and DATA, switch WE on for one clock cycle, and watch the row appear only when the beam reaches it.",
  [TEARING_PRESET]:
    "The CPU redraws the whole screen in a loop, left half lit, then right half, while the scanout reads it out one pixel per tick. Nothing ties a redraw to the beam, so it starts anywhere in a frame and the MONITOR shows the top of one picture over the bottom of the other: tearing. Run the clock and watch the split move.",
  [VSYNC_PRESET]:
    "The TEARING program with wait_vblank() before each redraw: LDM FB reads the scanout's VBLANK, and ADDI 255 turns a 1 into a carry for JNC, so the loop runs until the beam reaches the blank lines. The redraw then starts while the beam is off the screen and stays ahead of it, so every frame on the MONITOR is one whole picture.",
  [CROSS_PRESET]:
    "The CPU drawing an X with plot(x, y). Each plot is three stores: STM F8 loads PIXEL X, STM F9 loads PIXEL Y, and STM FA sends the colour through the PIXEL PLOTTER. On that tick the screen's row address comes from PIXEL Y, and the plotter hands back the row with one bit changed. Run the clock and watch the screen fill in, one pixel per plot, until HALTED lights.",
  [BLIT_PRESET]:
    "The CPU handing the drawing to the blitter. It stores the sprite's ROM address in E3 and a row in E1, then writes command 6 (COPY SPRITE) to E4. BLITTER BUSY lights, and on each of the next 8 clock edges the blitter copies one sprite byte from its own read port on the code ROM into a screen row, while the CPU fetches and runs let count = 0 and the start of its loop. Storing the same 8 rows itself takes the CPU 16 instructions and 92 ticks (the SCREEN sample). Before the CPU fills the last row itself it waits for BUSY to clear: while BUSY the blitter owns the screen, and a CPU write would be lost.",
};
