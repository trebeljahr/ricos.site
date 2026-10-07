// The CPU grader: runs a reader's circuit next to the stepper's per-tick
// reference trace and stops at the first tick that goes wrong.
//
// The grader knows nothing about node ids. It finds the parts the way a
// reader names them: the control unit and the shared bus by block type, and
// every register by the named probe display wired to its outputs (an ACC probe
// reading a register makes that register the accumulator). ROM, data RAM,
// stack RAM and ALU are found by block type and by what they are wired to.
//
// Timing follows the lockstep test in cpuPreset.test.ts: a tick's control word
// and bus are read before its rising edge, registers and memory after the full
// clock cycle.
import {
  type BusDriver,
  type CompiledProgram,
  decodeControlWord,
  describeOperand,
  hex,
  ISA,
  SIGNALS,
  type Signal,
  type Tick,
  traceTicks,
} from "../computerStepper";
import type { BusValue } from "./bus";
import { CPU_PROBES, type CpuProbe } from "./cpuPreset";
import type { DatapathKind } from "./datapathBlocks";
import { type Circuit, initialSnapshot, type Node, type Snapshot, step } from "./logic";
import { duplicateProbes, listProbes, readProbes } from "./probes";

// ---------------------------------------------------------------- levels

type GradedProbe = Exclude<CpuProbe, "BUS">;

export type CpuLevel = {
  id: number;
  name: string;
  /** Probes that must exist and are compared after every graded tick. */
  probes: GradedProbe[];
  /** Least number of each block type the circuit needs. */
  blocks: Partial<Record<DatapathKind, number>>;
  /** Memories compared after every graded tick. */
  memory: ("RAM" | "STACK")[];
  /** Only ticks with T ≤ maxT are graded (level 1 grades the fetch alone). */
  maxT?: number;
};

const FETCH_PROBES: GradedProbe[] = ["PC", "CMAR", "IR", "OPERAND"];

/** Requirements of the build-your-own-CPU levels; level 6 is the whole CPU. */
export const CPU_LEVELS: CpuLevel[] = [
  {
    id: 1,
    name: "Fetch",
    probes: FETCH_PROBES,
    blocks: { control: 1, counter8: 1, register8: 3, rom256: 1 },
    memory: [],
    maxT: 3,
  },
  {
    id: 2,
    name: "LDI and OUT",
    probes: [...FETCH_PROBES, "ACC", "OUT"],
    blocks: { control: 1, counter8: 1, register8: 5, rom256: 1 },
    memory: [],
  },
  {
    id: 3,
    name: "ALU and flags",
    probes: [...FETCH_PROBES, "ACC", "OUT", "FLAGS"],
    blocks: { control: 1, counter8: 1, register8: 6, rom256: 1, alu8: 1 },
    memory: [],
  },
  {
    id: 4,
    name: "Data RAM",
    probes: [...FETCH_PROBES, "ACC", "OUT", "FLAGS", "DMAR"],
    blocks: { control: 1, counter8: 1, register8: 7, rom256: 1, alu8: 1, ram16: 1 },
    memory: ["RAM"],
  },
  {
    id: 5,
    name: "Jumps",
    probes: [...FETCH_PROBES, "ACC", "OUT", "FLAGS", "DMAR"],
    blocks: { control: 1, counter8: 1, register8: 7, rom256: 1, alu8: 1, ram16: 1 },
    memory: ["RAM"],
  },
  {
    id: 6,
    name: "CALL and RET",
    probes: [...FETCH_PROBES, "ACC", "OUT", "FLAGS", "DMAR", "SP"],
    blocks: { control: 1, counter8: 1, register8: 8, rom256: 1, alu8: 2, ram16: 2 },
    memory: ["RAM", "STACK"],
  },
];

export const FULL_CPU_LEVEL = CPU_LEVELS[CPU_LEVELS.length - 1];

// ---------------------------------------------------------------- finding parts

type Role = BusDriver | "PC" | "CMAR" | "IR" | "DMAR" | "FLAGS" | "SP" | "OUT" | "SCREEN";

/** The probe a register role is named by. */
const PROBE_OF: Partial<Record<Role, GradedProbe>> = {
  PC: "PC",
  CMAR: "CMAR",
  IR: "IR",
  OPR: "OPERAND",
  DMAR: "DMAR",
  ACC: "ACC",
  FLAGS: "FLAGS",
  SP: "SP",
  OUT: "OUT",
};
const ROLE_OF_PROBE = Object.fromEntries(
  Object.entries(PROBE_OF).map(([role, probe]) => [probe, role as Role]),
) as Record<GradedProbe, Role>;

/** Readable part names, as the stepper panel shows them. */
const PART_NAME: Record<Role, string> = {
  PC: "PC",
  CMAR: "CMAR",
  IR: "IR",
  OPR: "OPERAND",
  DMAR: "DMAR",
  ACC: "ACC",
  FLAGS: "the carry flag",
  SP: "SP",
  OUT: "OUT",
  ROM: "the code ROM",
  RAM: "the data RAM",
  STACK: "the stack RAM",
  SCREEN: "the screen",
  ALU: "the ALU",
  FRAME: "the SP + OPR adder",
};

/** Which control line drives each part onto the bus. */
const OUT_LINE: Record<BusDriver, Signal> = {
  PC: "PC_OUT",
  ROM: "ROM_OUT",
  OPR: "OPR_OUT",
  RAM: "RAM_OUT",
  ACC: "ACC_OUT",
  ALU: "ALU_OUT",
  STACK: "STACK_OUT",
  SP: "SP_OUT",
  FRAME: "FRAME_OUT",
};

/** Which control line loads each register from the bus, and that input's port. */
const LOAD: Partial<Record<Role, { line: Signal; port: number }>> = {
  PC: { line: "PC_IN", port: 9 },
  CMAR: { line: "CMAR_IN", port: 8 },
  IR: { line: "IR_IN", port: 8 },
  OPR: { line: "OPR_IN", port: 8 },
  DMAR: { line: "DMAR_IN", port: 8 },
  ACC: { line: "ACC_IN", port: 8 },
  OUT: { line: "OUT_IN", port: 8 },
};
const CLOCK_PORT: Partial<Record<DatapathKind, number>> = {
  register8: 9,
  counter8: 10,
  ram16: 13,
};

type Source = { from: string; output: number };

export type CpuParts = {
  control?: Node;
  bus?: Node;
  parts: Partial<Record<Role, Node>>;
  /** Bus driver node id → the role of the part it puts on the bus (if known). */
  drivers: { id: string; role?: Role; part?: Node }[];
};

const kindOf = (node: Node | undefined) => node?.behaviour as DatapathKind | undefined;

/** Wire lookups for one circuit level. */
class Wiring {
  private readonly into = new Map<string, Source>();
  private readonly byId: Map<string, Node>;
  constructor(readonly circuit: Circuit) {
    for (const wire of circuit.wires)
      this.into.set(`${wire.to}:${wire.input}`, { from: wire.from, output: wire.output ?? 0 });
    this.byId = new Map(circuit.nodes.map((node) => [node.id, node]));
  }
  node = (id: string | undefined) => (id === undefined ? undefined : this.byId.get(id));
  source = (id: string, input: number) => this.into.get(`${id}:${input}`);
  sourceNode = (id: string, input: number) => this.node(this.source(id, input)?.from);
  readers = (id: string) => this.circuit.wires.filter((wire) => wire.from === id);
}

function roleOfEnable(wiring: Wiring, control: Node | undefined, driver: string) {
  const enable = wiring.source(driver, 1);
  if (!control || enable?.from !== control.id) return undefined;
  const signal = SIGNALS[enable.output];
  return (Object.keys(OUT_LINE) as BusDriver[]).find((role) => OUT_LINE[role] === signal);
}

/** Finds the control unit, the bus, its drivers and every named part. */
export function findParts(circuit: Circuit): CpuParts {
  const wiring = new Wiring(circuit);
  const ofKind = (kind: DatapathKind) => circuit.nodes.filter((node) => kindOf(node) === kind);
  const parts: CpuParts["parts"] = {};

  for (const display of circuit.nodes) {
    const role = display.probe && ROLE_OF_PROBE[display.probe as GradedProbe];
    if (!role || parts[role]) continue;
    const part = wiring.sourceNode(display.id, 0);
    if (part && kindOf(part)) parts[role] = part;
  }
  parts.ROM = ofKind("rom256")[0];
  parts.SCREEN = circuit.nodes.find((node) => node.behaviour === "screen8x8");
  for (const ram of ofKind("ram16")) {
    const address = wiring.source(ram.id, 0)?.from;
    const role = parts.SP && address === parts.SP.id ? "STACK" : "RAM";
    parts[role] ??= ram;
  }

  const buses = circuit.nodes.filter((node) => node.type === "bus");
  const driversOf = (bus: Node) =>
    circuit.wires.filter((w) => w.to === bus.id && wiring.node(w.from)?.type === "busdriver");
  const bus = buses.sort((a, b) => driversOf(b).length - driversOf(a).length)[0];
  const drivers = (bus ? driversOf(bus) : []).map((wire) => {
    let part = wiring.sourceNode(wire.from, 0);
    if (part?.type === "merger") part = wiring.sourceNode(part.id, 0);
    return { id: wire.from, part };
  });
  // The ALU on the bus is the reader's ALU; another alu8 is a helper (SP ± 1).
  parts.ALU =
    drivers.find(({ part }) => kindOf(part) === "alu8")?.part ??
    ofKind("alu8").find((alu) => wiring.source(alu.id, 0)?.from === parts.ACC?.id);
  const roleOf = (node: Node | undefined) =>
    node && (Object.entries(parts).find(([, part]) => part?.id === node.id)?.[0] as Role);

  const control = ofKind("control")[0];
  return {
    control,
    bus,
    parts,
    // A driver fed through gates (e.g. the RAM/screen read mux) is named by its
    // enable line instead of its source.
    drivers: drivers.map(({ id, part }) => ({
      id,
      part,
      role: roleOf(part) ?? (part && kindOf(part) ? undefined : roleOfEnable(wiring, control, id)),
    })),
  };
}

// ---------------------------------------------------------------- structure

const KIND_NAMES: Partial<Record<DatapathKind, string>> = {
  control: "control unit",
  counter8: "program counter block",
  register8: "8-bit register",
  rom256: "code ROM",
  alu8: "ALU",
  ram16: "16-byte RAM",
};

/** Readable errors for missing or misnamed parts; empty when the circuit can be graded. */
export function checkStructure(circuit: Circuit, level: CpuLevel = FULL_CPU_LEVEL): string[] {
  const errors: string[] = [];
  const names = new Set(listProbes(circuit).map((probe) => probe.name));
  for (const probe of level.probes)
    if (!names.has(probe))
      errors.push(`No probe named ${probe}. Add a probe display named ${probe}.`);
  for (const name of duplicateProbes(circuit))
    if ((CPU_PROBES as readonly string[]).includes(name))
      errors.push(`More than one probe is named ${name}. Keep one.`);

  for (const [kind, least] of Object.entries(level.blocks) as [DatapathKind, number][]) {
    const count = circuit.nodes.filter((node) => kindOf(node) === kind).length;
    if (count < least)
      errors.push(
        `This level needs ${least === 1 ? "a" : least} ${KIND_NAMES[kind] ?? kind}${least === 1 ? "" : "s"}; found ${count}.`,
      );
  }

  const { control, bus, parts } = findParts(circuit);
  if (!bus) errors.push("No shared bus. Add a bus node and connect the bus drivers to it.");
  // Control unit inputs: opcode 0–7, carry 8, CLK 9.
  if (control && !new Wiring(circuit).source(control.id, 9))
    errors.push("The control unit's CLK input is not connected to the clock.");
  for (const probe of level.probes) {
    if (!names.has(probe)) continue;
    const role = ROLE_OF_PROBE[probe];
    const want = role === "PC" ? "counter8" : "register8";
    if (!parts[role]) errors.push(`The ${probe} probe is not wired to the outputs of a register.`);
    else if (kindOf(parts[role]) !== want)
      errors.push(
        `The ${probe} probe reads a ${KIND_NAMES[kindOf(parts[role])!] ?? "block"}, not a ${KIND_NAMES[want]}.`,
      );
  }
  if (level.memory.includes("STACK") && !parts.STACK)
    errors.push("No stack RAM: wire SP's outputs to the address inputs of a 16-byte RAM.");
  return errors;
}

// ---------------------------------------------------------------- grading

export type BusReading = { value: BusValue; drivers: string[] };

export type TickSide = {
  control: Signal[];
  bus: BusReading;
  probes: Partial<Record<GradedProbe, number>>;
  ram?: number[];
  /** Screen rows, compared with RAM when the circuit has a screen (DMAR F0–F7). */
  screen?: number[];
  stack?: number[];
};

export type LikelyCause = {
  rule: CauseRule;
  message: string;
  /** Node id of the part to highlight, when known. */
  part?: string;
};

export type GradeFailure = {
  tick: number;
  t: number;
  instruction: { address: number; mnemonic: string; operand: string; text: string };
  /** Which comparisons failed: "control", "bus", a probe name, "RAM" or "STACK". */
  wrong: string[];
  expected: TickSide;
  actual: TickSide;
  cause: LikelyCause;
};

export type GradeResult =
  | { pass: true; ticks: number }
  | { pass: false; structure: string[] }
  | { pass: false; failure: GradeFailure };

export type GradeOptions = {
  level?: CpuLevel;
  /** Stop after this many instructions, as `traceTicks` does. */
  maxInstructions?: number;
};

const busOf = (state: Snapshot, bus: Node | undefined): BusValue =>
  (bus && state.buses?.[bus.id]) ?? "Z";
const controlOf = (state: Snapshot, control: Node | undefined) =>
  decodeControlWord(
    (state.outputs[control?.id ?? ""] ?? [])
      .slice(0, SIGNALS.length)
      .reduce((word, bit, index) => (bit ? word | (1 << index) : word), 0),
  );
const signalOf = (state: Snapshot, source: Source | undefined) =>
  source !== undefined &&
  Boolean(state.outputs[source.from]?.[source.output] ?? state.values[source.from]);
const bytesOf = (state: Snapshot, node: Node | undefined) =>
  node && (state.blocks?.[node.id] as { bytes?: number[] } | undefined)?.bytes;

function instructionAt(program: CompiledProgram, address: number) {
  const listed = program.instructions.find((item) => item.address === address);
  const opcode = listed?.opcode ?? program.bytes[address] ?? 0;
  const operand = listed?.operand ?? program.bytes[address + 1] ?? 0;
  const mnemonic = ISA.find((item) => item.opcode === opcode)?.mnemonic ?? `?${hex(opcode)}`;
  const meaning = describeOperand(opcode, operand, program.variables);
  return {
    address,
    mnemonic,
    operand: meaning.long,
    text: `${mnemonic}${meaning.short ? ` ${meaning.short}` : ""}`,
  };
}

function expectedSide(tick: Tick, level: CpuLevel, screen: boolean): TickSide {
  const r = tick.registers;
  const all: Record<GradedProbe, number> = {
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
  return {
    control: [...tick.control],
    bus: { value: tick.bus ?? "Z", drivers: tick.busDriver ? [tick.busDriver] : [] },
    probes: Object.fromEntries(level.probes.map((probe) => [probe, all[probe]])),
    ...(level.memory.includes("RAM") && { ram: tick.ram }),
    ...(level.memory.includes("RAM") && screen && { screen: tick.screen }),
    ...(level.memory.includes("STACK") && { stack: tick.stack }),
  };
}

const sameSet = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((item) => b.includes(item));

/**
 * Grades `circuit` on `program`: pass, a structure error list, or the first
 * wrong tick with expected and actual values and a likely cause.
 */
export function gradeCpu(
  circuit: Circuit,
  program: CompiledProgram,
  options: GradeOptions = {},
): GradeResult {
  const level = options.level ?? FULL_CPU_LEVEL;
  const structure = checkStructure(circuit, level);
  if (structure.length) return { pass: false, structure };
  const found = findParts(circuit);
  const wiring = new Wiring(circuit);
  const ticks = traceTicks(program, options.maxInstructions);

  const busReading = (state: Snapshot): BusReading => ({
    value: busOf(state, found.bus),
    drivers: found.drivers
      .filter((driver) => signalOf(state, wiring.source(driver.id, 1)))
      .map((driver) => driver.role ?? driver.part?.label ?? driver.id),
  });
  const after = (state: Snapshot, level: CpuLevel): Omit<TickSide, "control" | "bus"> => {
    const read = readProbes(circuit, state);
    return {
      probes: Object.fromEntries(level.probes.map((probe) => [probe, read[probe]])),
      ...(level.memory.includes("RAM") && { ram: bytesOf(state, found.parts.RAM) }),
      ...(level.memory.includes("RAM") &&
        found.parts.SCREEN && { screen: bytesOf(state, found.parts.SCREEN) }),
      ...(level.memory.includes("STACK") && {
        stack: bytesOf(state, found.parts.STACK)?.slice(0, read.SP ?? 0),
      }),
    };
  };

  let state = step(circuit, initialSnapshot(), false);
  let before = after(state, level);
  for (const tick of ticks) {
    if (tick.fault) break;
    const control = controlOf(state, found.control);
    const bus = busReading(state);
    const edge = step(circuit, state, true);
    const next = step(circuit, edge, false);
    const actual: TickSide = { control, bus, ...after(next, level) };
    const expected = expectedSide(tick, level, Boolean(found.parts.SCREEN));
    const graded = level.maxT === undefined || tick.t <= level.maxT;
    const wrong = graded ? compare(expected, actual, next.unstable) : [];
    if (wrong.length) {
      const failure = {
        tick: tick.index,
        t: tick.t,
        instruction: instructionAt(program, tick.address),
        wrong,
        expected,
        actual,
      };
      const context: CauseContext = {
        ...failure,
        tickData: tick,
        before: before.probes,
        found,
        wiring,
        unstable: next.unstable,
      };
      return { pass: false, failure: { ...failure, cause: likelyCause(context) } };
    }
    state = next;
    before = actual;
  }
  return { pass: true, ticks: ticks.length };
}

function compare(expected: TickSide, actual: TickSide, unstable: boolean): string[] {
  const wrong: string[] = [];
  if (unstable) wrong.push("settle");
  if (!sameSet(expected.control, actual.control)) wrong.push("control");
  // Two drivers that agree still count: the enable wiring is wrong either way.
  if (expected.bus.value !== actual.bus.value || !sameSet(expected.bus.drivers, actual.bus.drivers))
    wrong.push("bus");
  for (const [probe, value] of Object.entries(expected.probes))
    if (actual.probes[probe as GradedProbe] !== value) wrong.push(probe);
  if (expected.ram && expected.ram.join() !== actual.ram?.join()) wrong.push("RAM");
  if (expected.screen && expected.screen.join() !== actual.screen?.join()) wrong.push("SCREEN");
  if (expected.stack && expected.stack.join() !== actual.stack?.join()) wrong.push("STACK");
  return wrong;
}

// ---------------------------------------------------------------- likely causes

export const CAUSE_RULES = [
  "unstable",
  "control-flag",
  "control-opcode",
  "control-word",
  "bus-conflict",
  "bus-no-driver",
  "bus-wrong-driver",
  "bus-wrong-value",
  "pc-no-increment",
  "sp-no-move",
  "register-not-loaded",
  "register-not-clocked",
  "register-loaded-wrongly",
  "register-wrong-value",
  "flags-wrong",
  "ram-not-written",
  "memory-wrong",
  "unknown",
] as const;
export type CauseRule = (typeof CAUSE_RULES)[number];

type CauseContext = Omit<GradeFailure, "cause"> & {
  tickData: Tick;
  before: TickSide["probes"];
  found: CpuParts;
  wiring: Wiring;
  unstable: boolean;
};

const value = (v: BusValue | number | undefined) =>
  v === undefined ? "nothing" : typeof v === "number" ? hex(v) : v;

/** Says which control line (or other node) feeds `id`'s input, in words. */
function feedOf(ctx: CauseContext, id: string, input: number): string {
  const source = ctx.wiring.source(id, input);
  if (!source) return "not connected";
  if (source.from === ctx.found.control?.id)
    return source.output < SIGNALS.length
      ? `on ${SIGNALS[source.output]}`
      : "on the control unit's clock output";
  const node = ctx.wiring.node(source.from);
  return `wired to ${node?.label ?? source.from}`;
}
const isLine = (ctx: CauseContext, id: string, input: number, line: Signal) => {
  const source = ctx.wiring.source(id, input);
  return !!source && source.from === ctx.found.control?.id && SIGNALS[source.output] === line;
};
const isClock = (ctx: CauseContext, id: string, input: number) => {
  const source = ctx.wiring.source(id, input);
  return !!source && source.from === ctx.found.control?.id && source.output === SIGNALS.length;
};

type Rule = (ctx: CauseContext) => LikelyCause | undefined;

/** Ordered: the first rule that matches names the cause. */
const RULES: Rule[] = [
  (ctx) =>
    ctx.wrong.includes("settle")
      ? {
          rule: "unstable",
          message:
            "The circuit never settles on this tick: a loop of gates keeps changing. Look for a wire that feeds a part's output back into its own input.",
        }
      : undefined,

  // ------------------------------------------------ control word
  (ctx) => {
    const { control } = ctx.found;
    if (!ctx.wrong.includes("control") || !control) return;
    if (ctx.instruction.mnemonic !== "JNC" || ctx.t < 4) return;
    const carry = ctx.tickData.registers.carry;
    const source = ctx.wiring.source(control.id, 8);
    const fromFlags = source?.from === ctx.found.parts.FLAGS?.id && source?.output === 0;
    if (fromFlags) return;
    return {
      rule: "control-flag",
      message: `JNC chose the wrong branch: the carry flag is ${carry ? 1 : 0}, but it doesn't reach the control unit. Its carry input is ${feedOf(ctx, control.id, 8)}; wire it to the carry flag's Q0.`,
      part: control.id,
    };
  },
  (ctx) => {
    const { control, parts } = ctx.found;
    if (!ctx.wrong.includes("control") || !control || !parts.IR) return;
    const miswired = Array.from({ length: 8 }, (_, bit) => bit).filter((bit) => {
      const source = ctx.wiring.source(control.id, bit);
      return source?.from !== parts.IR!.id || source.output !== bit;
    });
    if (!miswired.length) return;
    return {
      rule: "control-opcode",
      message: `The control unit put out ${ctx.actual.control.join(" ") || "no lines"} instead of ${ctx.expected.control.join(" ")}: it doesn't see the opcode. Wire IR's Q0–Q7 to its opcode inputs in order (input${miswired.length > 1 ? "s" : ""} ${miswired.join(", ")} ${miswired.length > 1 ? "are" : "is"} wrong).`,
      part: control.id,
    };
  },
  (ctx) =>
    ctx.wrong.includes("control")
      ? {
          rule: "control-word",
          message: `The control unit put out ${ctx.actual.control.join(" ") || "no lines"} instead of ${ctx.expected.control.join(" ")}. Check the wire from the carry flag and from IR to the control unit.`,
          part: ctx.found.control?.id,
        }
      : undefined,

  // ------------------------------------------------ bus
  (ctx) => {
    if (!ctx.wrong.includes("bus") || ctx.actual.bus.drivers.length < 2) return;
    // Agreeing drivers leave a value on the bus; fighting ones leave X.
    const expected = ctx.expected.bus.drivers[0];
    const intruder =
      ctx.found.drivers.find(
        (d) =>
          d.role !== expected && ctx.actual.bus.drivers.includes(d.role ?? d.part?.label ?? d.id),
      ) ?? ctx.found.drivers[0];
    const name = intruder.role ? PART_NAME[intruder.role] : intruder.id;
    return {
      rule: "bus-conflict",
      message: `${ctx.actual.bus.drivers.length} drivers on the bus at once (${ctx.actual.bus.drivers.join(", ")}). ${name}'s bus driver enable is ${feedOf(ctx, intruder.id, 1)}${intruder.role && intruder.role in OUT_LINE ? `; it belongs on ${OUT_LINE[intruder.role as BusDriver]}` : ""}.`,
      part: intruder.id,
    };
  },
  (ctx) => {
    if (!ctx.wrong.includes("bus") || ctx.actual.bus.value !== "Z") return;
    const role = ctx.expected.bus.drivers[0] as BusDriver | undefined;
    if (!role) return;
    const line = OUT_LINE[role];
    const driver = ctx.found.drivers.find((d) => d.role === role);
    if (!driver)
      return {
        rule: "bus-no-driver",
        message: `The bus is Z during ${line}: ${PART_NAME[role]} has no bus driver. Wire its outputs through a merger into a bus driver on the bus, enabled by ${line}.`,
        part: ctx.found.parts[role]?.id,
      };
    return {
      rule: "bus-no-driver",
      message: `The bus is Z during ${line}: ${PART_NAME[role]}'s output enable isn't connected to ${line} (it is ${feedOf(ctx, driver.id, 1)}).`,
      part: driver.id,
    };
  },
  (ctx) => {
    if (!ctx.wrong.includes("bus") || ctx.actual.bus.drivers.length !== 1) return;
    const [actualRole] = ctx.actual.bus.drivers;
    const expected = ctx.expected.bus.drivers[0];
    if (actualRole === expected) return;
    const driver = ctx.found.drivers.find((d) => (d.role ?? d.part?.label ?? d.id) === actualRole)!;
    const name = driver.role ? PART_NAME[driver.role] : actualRole;
    return {
      rule: "bus-wrong-driver",
      message: expected
        ? `${name} drove the bus during ${OUT_LINE[expected as BusDriver]}, not ${PART_NAME[expected as BusDriver]}: ${name}'s bus driver enable is ${feedOf(ctx, driver.id, 1)}.`
        : `${name} drove the bus on a tick with no *_OUT line: its bus driver enable is ${feedOf(ctx, driver.id, 1)}.`,
      part: driver.id,
    };
  },
  (ctx) => {
    if (!ctx.wrong.includes("bus")) return;
    const role = ctx.expected.bus.drivers[0] as BusDriver | undefined;
    return {
      rule: "bus-wrong-value",
      message: `The bus held ${value(ctx.actual.bus.value)} instead of ${value(ctx.expected.bus.value)}${role ? ` while ${PART_NAME[role]} drove it: check that its outputs reach the merger lane for lane (Q0 to lane 0, …)` : ""}.`,
      part: role && ctx.found.drivers.find((d) => d.role === role)?.id,
    };
  },

  // ------------------------------------------------ counters
  (ctx) => {
    const pc = ctx.found.parts.PC;
    if (!pc || !ctx.wrong.includes("PC") || !ctx.expected.control.includes("PC_INC")) return;
    if (ctx.actual.probes.PC !== ctx.before.PC) return;
    if (!isLine(ctx, pc.id, 8, "PC_INC"))
      return {
        rule: "pc-no-increment",
        message: `PC stayed ${value(ctx.before.PC)} during PC_INC: its INC input is ${feedOf(ctx, pc.id, 8)}; wire it to PC_INC.`,
        part: pc.id,
      };
    if (!isClock(ctx, pc.id, 10))
      return {
        rule: "register-not-clocked",
        message: `PC stayed ${value(ctx.before.PC)} during PC_INC: its CLK input is ${feedOf(ctx, pc.id, 10)}; wire it to the control unit's clock output.`,
        part: pc.id,
      };
  },
  (ctx) => {
    const sp = ctx.found.parts.SP;
    const moves = ctx.expected.control.find((s) => s === "SP_INC" || s === "SP_DEC");
    if (!sp || !moves || !ctx.wrong.includes("SP")) return;
    return {
      rule: "sp-no-move",
      message: `SP is ${value(ctx.actual.probes.SP)} after ${moves}, expected ${value(ctx.expected.probes.SP)}: check that SP's LOAD sees SP_INC or SP_DEC, its inputs come from the SP ± 1 adder, and the adder's SUB input is SP_DEC.`,
      part: sp.id,
    };
  },

  // ------------------------------------------------ registers loading from the bus
  (ctx) => {
    for (const [role, load] of Object.entries(LOAD) as [Role, { line: Signal; port: number }][]) {
      const probe = PROBE_OF[role]!;
      const part = ctx.found.parts[role];
      if (!part || !ctx.wrong.includes(probe) || !ctx.expected.control.includes(load.line))
        continue;
      if (ctx.actual.probes[probe] !== ctx.before[probe]) continue;
      if (!isLine(ctx, part.id, load.port, load.line))
        return {
          rule: "register-not-loaded",
          message: `${load.line} was active and the bus held ${value(ctx.actual.bus.value)}, but ${probe} stayed ${value(ctx.before[probe])}: ${probe}'s load input isn't on ${load.line} (it is ${feedOf(ctx, part.id, load.port)}).`,
          part: part.id,
        };
      const clockPort = CLOCK_PORT[kindOf(part)!];
      if (clockPort !== undefined && !isClock(ctx, part.id, clockPort))
        return {
          rule: "register-not-clocked",
          message: `${load.line} was active but ${probe} stayed ${value(ctx.before[probe])}: its CLK input is ${feedOf(ctx, part.id, clockPort)}; wire it to the control unit's clock output.`,
          part: part.id,
        };
    }
  },
  (ctx) => {
    for (const [role, load] of Object.entries(LOAD) as [Role, { line: Signal; port: number }][]) {
      const probe = PROBE_OF[role]!;
      const part = ctx.found.parts[role];
      if (!part || !ctx.wrong.includes(probe) || ctx.expected.control.includes(load.line)) continue;
      if (ctx.actual.probes[probe] === ctx.before[probe]) continue;
      if (role === "PC" && ctx.expected.control.includes("PC_INC")) continue;
      return {
        rule: "register-loaded-wrongly",
        message: `${probe} changed to ${value(ctx.actual.probes[probe])} though ${load.line} was off: its load input is ${feedOf(ctx, part.id, load.port)}; it belongs on ${load.line}.`,
        part: part.id,
      };
    }
  },
  (ctx) => {
    for (const [role, load] of Object.entries(LOAD) as [Role, { line: Signal; port: number }][]) {
      const probe = PROBE_OF[role]!;
      const part = ctx.found.parts[role];
      if (!part || !ctx.wrong.includes(probe) || !ctx.expected.control.includes(load.line))
        continue;
      return {
        rule: "register-wrong-value",
        message: `${probe} loaded ${value(ctx.actual.probes[probe])} while the bus held ${value(ctx.actual.bus.value)}: its D inputs aren't wired lane for lane to the bus.`,
        part: part.id,
      };
    }
  },

  // ------------------------------------------------ flags and memory
  (ctx) => {
    if (!ctx.wrong.includes("FLAGS")) return;
    const flags = ctx.found.parts.FLAGS;
    const latched = ctx.expected.control.includes("FLAGS_IN");
    return {
      rule: "flags-wrong",
      message: latched
        ? `FLAGS is ${value(ctx.actual.probes.FLAGS)} after FLAGS_IN, expected ${value(ctx.expected.probes.FLAGS)}: the carry flag should take the ALU's CARRY on FLAGS_IN (its load input is ${flags ? feedOf(ctx, flags.id, 8) : "missing"}), and bit 1 of the probe is ACC = 0.`
        : `FLAGS changed to ${value(ctx.actual.probes.FLAGS)} without FLAGS_IN: bit 1 should be ACC = 0, bit 0 the carry flag, loaded only on FLAGS_IN.`,
      part: flags?.id,
    };
  },
  (ctx) => {
    const memory = (["RAM", "SCREEN", "STACK"] as const).find((m) => ctx.wrong.includes(m));
    if (!memory) return;
    const ram = ctx.found.parts[memory];
    const line: Signal = memory === "STACK" ? "STACK_IN" : "RAM_IN";
    // WE follows the address inputs (4 for RAM, 3 for the screen) and 8 data inputs.
    const we = (memory === "SCREEN" ? 3 : 4) + 8;
    const source = ram && ctx.wiring.source(ram.id, we);
    // A WE fed through gates (the RAM/screen decode) is not judged here.
    const direct = !source || source.from === ctx.found.control?.id;
    if (ram && direct && ctx.expected.control.includes(line) && !isLine(ctx, ram.id, we, line))
      return {
        rule: "ram-not-written",
        message: `${line} was active and the bus held ${value(ctx.actual.bus.value)}, but ${PART_NAME[memory]} didn't store it: its WE input is ${feedOf(ctx, ram.id, we)}; wire it to ${line}.`,
        part: ram.id,
      };
    return {
      rule: "memory-wrong",
      message: `${PART_NAME[memory]} doesn't hold what it should after this tick: check its address inputs (${memory === "STACK" ? "SP" : "DMAR"}), its D inputs from the bus and its WE line.`,
      part: ram?.id,
    };
  },
];

export function likelyCause(ctx: CauseContext): LikelyCause {
  for (const rule of RULES) {
    const cause = rule(ctx);
    if (cause) return cause;
  }
  const [first] = ctx.wrong;
  return {
    rule: "unknown",
    message: `${first} is ${value(ctx.actual.probes[first as GradedProbe])}, expected ${value(ctx.expected.probes[first as GradedProbe])}.`,
  };
}
