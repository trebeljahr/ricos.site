// The build-your-own-CPU levels: each one starts from G's CPU preset with
// only the parts that level needs, earlier levels' wiring done and locked,
// and this level's bus and control-line wires taken out for the reader.
//
// A wire is "reader wiring" when it is a control line (control unit output →
// part), a bus driver's output onto the shared bus, the bus into its lane
// splitter, or a bus lane into a part. Such a wire belongs to the level of the
// part it serves; a level's start circuit leaves out its own reader wiring
// (and any later level's), so wiring it back the way the preset does solves
// the level. Everything else (clocks, probes, ALU inputs, helper gates) is
// pre-wired.
import { type CompiledProgram, compileProgram, SIGNALS } from "../computerStepper";
import { CPU_LEVELS, type CpuLevel } from "./cpuGrader";
import { CPU_PARTS, cpuCircuit } from "./cpuPreset";
import { datapathCircuit } from "./datapathBlocks";
import type { Circuit, GateType, Node, Wire } from "./logic";

export type CpuTestProgram = { name: string; source: string };

export type CpuLevelSpec = {
  grade: CpuLevel;
  title: string;
  /** What the reader wires, in one or two sentences. */
  goal: string;
  /** Hints shown under the goal: which lines and lanes to connect. */
  steps: string[];
  /** Preset nodes this level adds (earlier levels' nodes stay). */
  parts: string[];
  /** Wiring parts the palette offers. */
  palette: GateType[];
  tests: CpuTestProgram[];
};

const WIRING_PARTS: GateType[] = ["junction", "splitter", "merger", "busdriver"];

/** The data memory's decode, read-select and pixel port gates (ids "ram-…"). */
const ramHelpers = cpuCircuit([])
  .nodes.map((node) => node.id)
  .filter((id) => id.startsWith(`${CPU_PARTS.ram}-`));
/**
 * The pixel port, the blitter and the big screen come pre-wired: their bus lane inputs are
 * plumbing, not reader wiring.
 */
const screenPorts = [
  CPU_PARTS.pixelX,
  `${CPU_PARTS.pixelX}-display`,
  CPU_PARTS.pixelY,
  `${CPU_PARTS.pixelY}-display`,
  CPU_PARTS.plotter,
  CPU_PARTS.blitter,
  CPU_PARTS.blitterRom,
  "blitter-busy",
  CPU_PARTS.bigScreen,
];
const isPortPlumbing = (wire: Wire) =>
  screenPorts.includes(wire.to) || wire.to.startsWith(`${CPU_PARTS.ram}-row-d-direct`);

export const CPU_LEVEL_SPECS: CpuLevelSpec[] = [
  {
    grade: CPU_LEVELS[0],
    title: "Fetch",
    goal: "Fetch each instruction: copy PC into CMAR, read the opcode from the code ROM into IR, then the operand into OPERAND, counting PC up after each byte.",
    steps: [
      "Connect the PC and code ROM bus drivers to the shared bus, and the bus to its lane splitter.",
      "Wire bus lanes 0–7 into the data inputs of CMAR, IR and OPERAND.",
      "Wire the control lines PC_OUT, ROM_OUT (driver enables) and PC_INC, CMAR_IN, IR_IN, OPR_IN.",
    ],
    parts: [
      "clock",
      CPU_PARTS.pc,
      "pc-probe",
      CPU_PARTS.cmar,
      "cmar-probe",
      CPU_PARTS.rom,
      CPU_PARTS.control,
      "pc-lanes",
      "pc-drive",
      "rom-lanes",
      "rom-drive",
      CPU_PARTS.bus,
      "bus-lanes",
      "bus-probe",
      CPU_PARTS.ir,
      "ir-probe",
      CPU_PARTS.opr,
      "opr-probe",
      "halted",
    ],
    palette: WIRING_PARTS,
    tests: [
      { name: "print 7", source: "print(7);" },
      { name: "add to a variable", source: "let x = 2;\nx = x + 3;\nprint(x);" },
    ],
  },
  {
    grade: CPU_LEVELS[1],
    title: "LDI and OUT",
    goal: "Load a number into ACC and show it on OUT. LDI moves OPERAND over the bus into ACC; OUT moves ACC into the output register.",
    steps: [
      "Connect the OPERAND and ACC bus drivers to the bus; wire OPR_OUT and ACC_OUT to their enables.",
      "Wire bus lanes 0–7 into ACC and OUT, then ACC_IN and OUT_IN to their LOAD inputs.",
    ],
    parts: [
      CPU_PARTS.acc,
      "acc-probe",
      "acc-lanes",
      "acc-drive",
      CPU_PARTS.out,
      "out-probe",
      "opr-lanes",
      "opr-drive",
    ],
    palette: WIRING_PARTS,
    tests: [
      { name: "print 7", source: "print(7);" },
      { name: "print twice", source: "print(1);\nprint(2);" },
    ],
  },
  {
    grade: CPU_LEVELS[2],
    title: "ALU and flags",
    goal: "Add and subtract: the ALU already sees ACC and OPERAND. Put its result on the bus, switch it to subtract on ALU_SUB, and latch its carry into the flags register.",
    steps: [
      "Connect the ALU bus driver to the bus and ALU_OUT to its enable.",
      "Wire ALU_SUB into the ALU's SUB input and FLAGS_IN into the carry flag's LOAD.",
    ],
    parts: [CPU_PARTS.alu, "alu-lanes", "alu-drive", CPU_PARTS.flags, "flags-probe", "zero"],
    palette: WIRING_PARTS,
    tests: [
      { name: "5 + 3", source: "print(5 + 3);" },
      { name: "carry out", source: "print(200 + 100);" },
      { name: "borrow", source: "print(3 - 5);" },
      { name: "zero", source: "print(5 - 5);" },
    ],
  },
  {
    grade: CPU_LEVELS[3],
    title: "Data RAM",
    goal: "Keep variables in RAM: DMAR takes the address from the bus, RAM_IN stores the bus there, RAM_OUT reads it back. ADDM and SUBM read RAM into OPERAND first.",
    steps: [
      "Wire bus lanes 0–7 into DMAR and DMAR_IN into its LOAD.",
      "Wire bus lanes into the data inputs of the data RAM. The screen, its pixel port and the blitter take the bus through gates that are already wired.",
      "Wire RAM_IN into the write-enable gates, connect the RAM bus driver to the bus and RAM_OUT to its enable.",
    ],
    parts: [
      CPU_PARTS.dmar,
      "dmar-probe",
      CPU_PARTS.ram,
      CPU_PARTS.screen,
      ...ramHelpers,
      ...screenPorts,
      "ram-lanes",
      "ram-drive",
    ],
    palette: WIRING_PARTS,
    tests: [
      { name: "a variable", source: "let x = 2;\nx = x + 3;\nprint(x);" },
      { name: "add two variables", source: "let x = 2;\nlet y = 3;\nprint(x + y);" },
      { name: "subtract", source: "let x = 9;\nlet y = 4;\nprint(x - y);" },
      { name: "screen", source: "screen[2] = 24;\nprint(screen[2]);" },
    ],
  },
  {
    grade: CPU_LEVELS[4],
    title: "Jumps",
    goal: "Loop: JMP loads PC from the bus, and JNC does so only while the carry flag is clear. The control unit needs to see the carry flag to choose.",
    steps: [
      "Wire bus lanes 0–7 into PC's data inputs and PC_IN into its LOAD.",
      "Wire the carry flag's Q0 into the control unit's carry input.",
    ],
    parts: [],
    palette: WIRING_PARTS,
    tests: [
      {
        name: "count to 3",
        source: "let n = 0;\nfor (let i = 0; i < 3; i++) {\n  n = n + 2;\n}\nprint(n);",
      },
      {
        name: "sum a loop",
        source: "let sum = 0;\nfor (let i = 0; i < 4; i++) {\n  sum = sum + i;\n}\nprint(sum);",
      },
    ],
  },
  {
    grade: CPU_LEVELS[5],
    title: "CALL and RET",
    goal: "Call functions: CALL pushes the return address onto the stack at SP and moves SP up; RET moves SP down and reads it back into PC.",
    steps: [
      "Wire SP_INC and SP_DEC into the SP MOVES gate, and SP_DEC into the SP ± 1 ALU's SUB.",
      "Wire bus lanes into the stack RAM's data inputs and STACK_IN into its write enable.",
      "Connect the stack bus driver to the bus and STACK_OUT to its enable.",
    ],
    parts: [
      CPU_PARTS.sp,
      "sp-step",
      "one",
      "sp-move",
      "sp-probe",
      CPU_PARTS.stack,
      "stack-lanes",
      "stack-drive",
    ],
    palette: WIRING_PARTS,
    tests: [
      { name: "call once", source: "fn twice(n) {\n  return n + n;\n}\nprint(twice(4));" },
      {
        name: "call twice",
        source: "fn inc(n) {\n  return n + 1;\n}\nlet x = inc(1);\nx = inc(x);\nprint(x);",
      },
      {
        name: "call in a loop",
        source:
          "fn bump(n) {\n  return n + 1;\n}\nlet x = 2;\nfor (let i = 0; i < 3; i++) {\n  x = bump(x);\n}\nprint(x);",
      },
    ],
  },
  // TODO(level 7): a stretch level where the reader builds the control unit
  // itself (T-state counter + microcode ROM) instead of getting it folded.
];

// ---------------------------------------------------------------- wire ownership

const levelOfNode = new Map<string, number>();
CPU_LEVEL_SPECS.forEach((spec, index) => {
  for (const id of spec.parts) levelOfNode.set(id, index + 1);
});

/** Wires that a later level owns although both ends exist earlier. */
const JUMP_LEVEL = 5;
const ownedLater = (wire: Wire) =>
  (wire.to === CPU_PARTS.pc && wire.input <= 7 && wire.from === "bus-lanes") ||
  (wire.to === CPU_PARTS.pc && wire.input === 9) ||
  (wire.to === CPU_PARTS.control && wire.input === 8)
    ? JUMP_LEVEL
    : undefined;

const GCLK = SIGNALS.length;

/** The level whose reader wires this wire; undefined for pre-wired plumbing. */
export function readerLevel(wire: Wire): number | undefined {
  const later = ownedLater(wire);
  if (later) return later;
  const fromControl = wire.from === CPU_PARTS.control && (wire.output ?? 0) !== GCLK;
  if (fromControl && wire.to !== "halted") return levelOfNode.get(wire.to);
  if (wire.to === CPU_PARTS.bus) return levelOfNode.get(wire.from);
  if (wire.from === CPU_PARTS.bus) return 1;
  if (wire.from === "bus-lanes" && wire.to !== "bus-probe" && !isPortPlumbing(wire))
    return levelOfNode.get(wire.to);
  return undefined;
}

export const wireKey = (wire: Pick<Wire, "from" | "to" | "input" | "output">) =>
  `${wire.from}:${wire.output ?? 0}-${wire.to}:${wire.input}`;

// ---------------------------------------------------------------- level circuits

export type CpuLevelSetup = {
  level: number;
  /** Start circuit: parts placed, earlier wiring done, this level's wiring missing. */
  start: Circuit;
  /** Wires the reader has to add, as G's preset has them. */
  solution: Wire[];
  lockedNodes: ReadonlySet<string>;
  lockedWires: ReadonlySet<string>;
  programs: (CpuTestProgram & { compiled: CompiledProgram })[];
};

const setups = new Map<number, CpuLevelSetup>();

/** Level `level` (1-based), with the first test program in its code ROM. */
export function cpuLevelSetup(level: number): CpuLevelSetup {
  const cached = setups.get(level);
  if (cached) return cached;
  const spec = CPU_LEVEL_SPECS[level - 1];
  const programs = spec.tests.map((test) => ({ ...test, compiled: compileProgram(test.source) }));
  const full = cpuCircuit(programs[0].compiled.bytes, `Level ${level}: ${spec.title}`);
  const present = new Set(
    full.nodes
      .filter((node) => (levelOfNode.get(node.id) ?? Infinity) <= level)
      .map((node) => node.id),
  );
  const nodes = full.nodes.filter((node) => present.has(node.id));
  const wires: Wire[] = [];
  const solution: Wire[] = [];
  for (const wire of full.wires) {
    if (!present.has(wire.from) || !present.has(wire.to)) continue;
    const owner = readerLevel(wire);
    if (owner === undefined || owner < level) wires.push(wire);
    else if (owner === level) solution.push(wire);
  }
  const start: Circuit = {
    name: full.name,
    nodes,
    wires,
    groups: full.groups
      ?.map((group) => ({ ...group, nodeIds: group.nodeIds.filter((id) => present.has(id)) }))
      .filter((group) => group.nodeIds.length),
  };
  const setup: CpuLevelSetup = {
    level,
    start,
    solution,
    lockedNodes: new Set(nodes.map((node) => node.id)),
    lockedWires: new Set(wires.map(wireKey)),
    programs,
  };
  setups.set(level, setup);
  return setup;
}

/** The start circuit wired the way G's preset is: the level's answer. */
export const solvedLevel = (setup: CpuLevelSetup): Circuit => ({
  ...setup.start,
  wires: [...setup.start.wires, ...setup.solution],
});

const isRom = (node: Node) => node.behaviour === "rom256";

/** Module contents compared by value, each object serialised once. */
const serialised = new WeakMap<Circuit, string>();
const contents = (module: Circuit) => {
  let text = serialised.get(module);
  if (text === undefined) serialised.set(module, (text = JSON.stringify(module)));
  return text;
};
const same = (a: unknown, b: unknown) =>
  a === b ||
  (typeof a === "object" &&
    typeof b === "object" &&
    a !== null &&
    b !== null &&
    contents(a as Circuit) === contents(b as Circuit));

/** The circuit with `bytes` in every code ROM. */
export const withProgram = (circuit: Circuit, bytes: readonly number[]): Circuit => ({
  ...circuit,
  nodes: circuit.nodes.map((node) =>
    isRom(node) ? { ...node, module: datapathCircuit("rom256", bytes) } : node,
  ),
});

/**
 * Puts locked parts and wires back as the level placed them. A locked part may
 * move and turn; a code ROM keeps whatever program is loaded. Returns the same
 * object when nothing was changed.
 */
export function enforceLocks(circuit: Circuit, setup: CpuLevelSetup): Circuit {
  let changed = false;
  const byId = new Map(circuit.nodes.map((node) => [node.id, node]));
  const nodes = setup.start.nodes.map((base) => {
    const current = byId.get(base.id);
    if (!current) {
      changed = true;
      return base;
    }
    const kept = {
      ...base,
      x: current.x,
      y: current.y,
      inputSide: current.inputSide,
      outputSide: current.outputSide,
      ...(isRom(base) && { module: current.module }),
    };
    for (const key of new Set([...Object.keys(kept), ...Object.keys(current)]) as Set<keyof Node>)
      if (!same(kept[key], current[key])) {
        changed = true;
        return kept;
      }
    return current;
  });
  const extra = circuit.nodes.filter((node) => !setup.lockedNodes.has(node.id));
  const keys = new Set(circuit.wires.map(wireKey));
  const missing = setup.start.wires.filter((wire) => !keys.has(wireKey(wire)));
  const lockedInputs = new Set(setup.start.wires.map((wire) => `${wire.to}:${wire.input}`));
  // A reader wire into an input a locked wire feeds would replace it.
  const wires = circuit.wires.filter(
    (wire) => setup.lockedWires.has(wireKey(wire)) || !lockedInputs.has(`${wire.to}:${wire.input}`),
  );
  if (missing.length || wires.length !== circuit.wires.length) changed = true;
  if (!changed) return circuit;
  return { ...circuit, nodes: [...nodes, ...extra], wires: [...wires, ...missing] };
}

// ---------------------------------------------------------------- saving

/** What localStorage keeps of a level: only what the reader changed. */
export type SavedLevel = {
  added: Node[];
  wires: Wire[];
  moved: Record<string, [number, number]>;
};

export function saveLevel(circuit: Circuit, setup: CpuLevelSetup): SavedLevel {
  const base = new Map(setup.start.nodes.map((node) => [node.id, node]));
  const moved: SavedLevel["moved"] = {};
  for (const node of circuit.nodes) {
    const start = base.get(node.id);
    if (start && (start.x !== node.x || start.y !== node.y)) moved[node.id] = [node.x, node.y];
  }
  return {
    added: circuit.nodes.filter((node) => !base.has(node.id)),
    wires: circuit.wires.filter((wire) => !setup.lockedWires.has(wireKey(wire))),
    moved,
  };
}

export function restoreLevel(saved: unknown, setup: CpuLevelSetup): Circuit {
  const data = saved as Partial<SavedLevel> | null;
  if (!data || typeof data !== "object") return setup.start;
  const added = Array.isArray(data.added)
    ? data.added.filter(
        (node): node is Node =>
          Boolean(node) &&
          typeof node.id === "string" &&
          typeof node.type === "string" &&
          Number.isFinite(node.x) &&
          Number.isFinite(node.y) &&
          !setup.lockedNodes.has(node.id),
      )
    : [];
  const nodes = [
    ...setup.start.nodes.map((node) => {
      const at = data.moved?.[node.id];
      return Array.isArray(at) && at.every(Number.isFinite)
        ? { ...node, x: at[0], y: at[1] }
        : node;
    }),
    ...added,
  ];
  const ids = new Set(nodes.map((node) => node.id));
  const wires = Array.isArray(data.wires)
    ? data.wires.filter(
        (wire): wire is Wire =>
          Boolean(wire) &&
          typeof wire.id === "string" &&
          ids.has(wire.from) &&
          ids.has(wire.to) &&
          Number.isInteger(wire.input),
      )
    : [];
  return enforceLocks({ ...setup.start, nodes, wires: [...setup.start.wires, ...wires] }, setup);
}
