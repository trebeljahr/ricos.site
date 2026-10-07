import { MEMORY_PRESETS } from "./memoryCircuits";

export type GateType =
  | "switch"
  | "clock"
  | "pulse"
  | "lamp"
  | "input4"
  | "input8"
  | "display4"
  | "display8"
  | "high"
  | "ground"
  | "nmos"
  | "pmos"
  | "junction"
  | "not"
  | "and"
  | "or"
  | "xor"
  | "xnor"
  | "nand"
  | "nor"
  | "dff"
  | "srlatch"
  | "dlatch"
  | "dramcell"
  | "module";
export type Node = {
  id: string;
  type: GateType;
  x: number;
  y: number;
  inputSide?: "left" | "top" | "right" | "bottom";
  outputSide?: "left" | "top" | "right" | "bottom";
  label?: string;
  value?: boolean;
  numberValue?: number;
  /** Probe name on a display4/display8, read by `readProbes` (e.g. ACC, PC). */
  probe?: string;
  module?: Circuit;
};
export const WIRE_COLORS = {
  cyan: "#69e2e0",
  amber: "#ffc76a",
  coral: "#ff8f87",
  violet: "#b7a1ff",
  blue: "#7cb8ff",
  lime: "#b9e976",
} as const;
export type WireColor = keyof typeof WIRE_COLORS;
export type Wire = {
  id: string;
  from: string;
  to: string;
  input: number;
  output?: number;
  color?: WireColor;
};
export type CircuitGroup = { id: string; label: string; nodeIds: string[] };
export type Circuit = { name: string; nodes: Node[]; wires: Wire[]; groups?: CircuitGroup[] };
export type Snapshot = {
  values: Record<string, boolean>;
  memory: Record<string, boolean>;
  age?: Record<string, number>;
  lastClock: Record<string, boolean>;
  outputs: Record<string, boolean[]>;
  modules: Record<string, Snapshot>;
  unstable: boolean;
};

export const INPUTS: Record<GateType, number> = {
  switch: 0,
  clock: 0,
  pulse: 0,
  lamp: 1,
  input4: 0,
  input8: 0,
  display4: 4,
  display8: 8,
  high: 0,
  ground: 0,
  nmos: 2,
  pmos: 2,
  junction: 2,
  not: 1,
  and: 2,
  or: 2,
  xor: 2,
  xnor: 2,
  nand: 2,
  nor: 2,
  dff: 2,
  srlatch: 2,
  dlatch: 2,
  dramcell: 2,
  module: 0,
};
export const LABELS: Record<GateType, string> = {
  switch: "SWITCH",
  clock: "CLOCK",
  pulse: "PULSE",
  lamp: "LAMP",
  input4: "4-BIT INPUT",
  input8: "8-BIT INPUT",
  display4: "4-BIT DISPLAY",
  display8: "8-BIT DISPLAY",
  high: "HIGH (1)",
  ground: "GROUND (0)",
  nmos: "NMOS",
  pmos: "PMOS",
  junction: "JUNCTION",
  not: "NOT",
  and: "AND",
  or: "OR",
  xor: "XOR",
  xnor: "XNOR",
  nand: "NAND",
  nor: "NOR",
  dff: "D FLIP-FLOP",
  srlatch: "SR LATCH",
  dlatch: "D LATCH",
  dramcell: "DRAM CAPACITOR",
  module: "CIRCUIT",
};
export const PROBE_NAMES = ["ACC", "PC", "IR", "OPERAND", "SP", "FLAGS", "BUS"] as const;
export const isProbeDisplay = (type: GateType) => type === "display4" || type === "display8";
/** Upper-case letters, digits and underscores, starting with a letter, at most 12 long. */
export const normalizeProbeName = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "")
    .replace(/^[^A-Z]+/, "")
    .slice(0, 12);
const validProbe = (n: Partial<Node>) =>
  n.probe === undefined ||
  (typeof n.probe === "string" &&
    isProbeDisplay(n.type as GateType) &&
    (n.probe === "" || normalizeProbeName(n.probe) === n.probe));
export const moduleInputs = (circuit: Circuit) =>
  circuit.nodes.filter((node) => ["switch", "clock", "pulse"].includes(node.type));
export const moduleOutputs = (circuit: Circuit) =>
  circuit.nodes.filter((node) => node.type === "lamp");
export const inputCount = (node: Node) =>
  node.type === "module" ? moduleInputs(node.module!).length : INPUTS[node.type];
export const outputCount = (node: Node) =>
  node.type === "module"
    ? moduleOutputs(node.module!).length
    : node.type === "lamp" || node.type === "display4" || node.type === "display8"
      ? 0
      : node.type === "input4"
        ? 4
        : node.type === "input8"
          ? 8
          : 1;
export const inputLabel = (node: Node, index: number) =>
  node.type === "module"
    ? moduleInputs(node.module!)[index]?.label || `Input ${index + 1}`
    : node.type === "display4" || node.type === "display8"
      ? `Bit ${index}`
      : `Input ${index + 1}`;
export const outputLabel = (node: Node, index: number) =>
  node.type === "module"
    ? moduleOutputs(node.module!)[index]?.label || `Output ${index + 1}`
    : node.type === "input4" || node.type === "input8"
      ? `Bit ${index}`
      : "Output";
export const initialSnapshot = (): Snapshot => ({
  values: {},
  memory: {},
  age: {},
  lastClock: {},
  outputs: {},
  modules: {},
  unstable: false,
});

export function step(
  circuit: Circuit,
  previous: Snapshot,
  clockHigh: boolean,
  pulses: Record<string, boolean> = {},
  overrides: Record<string, boolean> = {},
  depth = 0,
): Snapshot {
  const nodes = new Map(circuit.nodes.map((node) => [node.id, node]));
  const wires = circuit.wires.filter(
    (wire) =>
      nodes.has(wire.from) &&
      nodes.has(wire.to) &&
      wire.input < inputCount(nodes.get(wire.to)!) &&
      (wire.output ?? 0) < outputCount(nodes.get(wire.from)!),
  );
  const values: Record<string, boolean> = { ...previous.values };
  const outputs: Record<string, boolean[]> = { ...previous.outputs };
  const modules: Record<string, Snapshot> = { ...previous.modules };
  for (const node of circuit.nodes) {
    if (node.type === "switch") values[node.id] = overrides[node.id] ?? Boolean(node.value);
    if (node.type === "clock") values[node.id] = overrides[node.id] ?? clockHigh;
    if (node.type === "pulse") values[node.id] = overrides[node.id] ?? Boolean(pulses[node.id]);
    if (node.type === "high") values[node.id] = true;
    if (node.type === "ground") values[node.id] = false;
    if (node.type === "input4" || node.type === "input8") {
      const bits = node.type === "input4" ? 4 : 8;
      outputs[node.id] = Array.from({ length: bits }, (_, bit) =>
        Boolean(((node.numberValue ?? 0) >> bit) & 1),
      );
    }
    if (["dff", "srlatch", "dlatch", "dramcell"].includes(node.type))
      values[node.id] = Boolean(previous.memory[node.id]);
  }
  let unstable = false;
  const inputs = (node: Node) =>
    Array.from({ length: inputCount(node) }, (_, port) => {
      const wire = wires.find((candidate) => candidate.to === node.id && candidate.input === port);
      return wire ? Boolean(outputs[wire.from]?.[wire.output ?? 0] ?? values[wire.from]) : false;
    });
  // Combinational gates settle within one tick. A feedback loop that does not settle is flagged.
  const settle = () => {
    for (let pass = 0; pass <= circuit.nodes.length; pass++) {
      let changed = false;
      for (const node of circuit.nodes) {
        const signals = inputs(node);
        const [a, b] = signals;
        let next: boolean;
        switch (node.type) {
          case "module": {
            if (depth >= 6 || !node.module) continue;
            const innerInputs = moduleInputs(node.module);
            const inner = step(
              node.module,
              previous.modules[node.id] ?? initialSnapshot(),
              clockHigh,
              {},
              Object.fromEntries(innerInputs.map((port, index) => [port.id, signals[index]])),
              depth + 1,
            );
            modules[node.id] = inner;
            const bits = moduleOutputs(node.module).map((port) => Boolean(inner.values[port.id]));
            if (bits.some((bit, index) => bit !== outputs[node.id]?.[index])) changed = true;
            outputs[node.id] = bits;
            next = bits[0] ?? false;
            if (inner.unstable) unstable = true;
            break;
          }
          case "lamp":
            next = a;
            break;
          case "display4":
          case "display8":
            outputs[node.id] = signals;
            next = signals.some(Boolean);
            break;
          case "nmos":
            next = a && b;
            break;
          case "pmos":
            next = !a && b;
            break;
          case "junction":
            next = a || b;
            break;
          case "not":
            next = !a;
            break;
          case "and":
            next = a && b;
            break;
          case "or":
            next = a || b;
            break;
          case "xor":
            next = a !== b;
            break;
          case "xnor":
            next = a === b;
            break;
          case "nand":
            next = !(a && b);
            break;
          case "nor":
            next = !(a || b);
            break;
          default:
            continue;
        }
        if (values[node.id] !== next) {
          values[node.id] = next;
          changed = true;
        }
      }
      if (!changed) break;
      if (pass === circuit.nodes.length) unstable = true;
    }
  };
  settle();
  const memory = { ...previous.memory };
  const age = { ...previous.age };
  const lastClock = { ...previous.lastClock };
  for (const node of circuit.nodes) {
    if (node.type !== "dff" && node.type !== "dramcell") continue;
    const [data, clock] = inputs(node);
    if (clock && !previous.lastClock[node.id]) {
      memory[node.id] = data;
      if (node.type === "dramcell") age[node.id] = 0;
    } else if (node.type === "dramcell" && clockHigh && !previous.lastClock.__dramTick) {
      age[node.id] = (previous.age?.[node.id] ?? 0) + 1;
      if (age[node.id] >= 4) memory[node.id] = false;
    }
    lastClock[node.id] = clock;
  }
  for (const node of circuit.nodes) {
    if (node.type !== "srlatch") continue;
    const [set, reset] = inputs(node);
    if (set && reset) unstable = true;
    else if (set) memory[node.id] = true;
    else if (reset) memory[node.id] = false;
  }
  for (const node of circuit.nodes) {
    if (node.type !== "dlatch") continue;
    const [data, enable] = inputs(node);
    if (enable) memory[node.id] = data;
  }
  lastClock.__dramTick = clockHigh;
  for (const node of circuit.nodes)
    if (["dff", "srlatch", "dlatch", "dramcell"].includes(node.type))
      values[node.id] = Boolean(memory[node.id]);
  settle();
  return { values, memory, age, lastClock, outputs, modules, unstable };
}

const node = (
  id: string,
  type: GateType,
  x: number,
  y: number,
  label?: string,
  value = false,
): Node => ({ id, type, x, y, label, value });
const wire = (from: string, to: string, input = 0): Wire => ({
  id: `${from}-${to}-${input}`,
  from,
  to,
  input,
});

function multiplexerCircuit(): Circuit {
  const circuit: Circuit = { name: "8-bit 2:1 multiplexer", nodes: [], wires: [] };
  const add = (id: string, type: GateType, x: number, y: number, label?: string) => {
    circuit.nodes.push(node(id, type, x, y, label));
    return id;
  };
  const connect = (from: string, to: string, input = 0) => {
    circuit.wires.push(wire(from, to, input));
  };
  const gate = (id: string, type: GateType, x: number, y: number, a: string, b: string) => {
    add(id, type, x, y);
    connect(a, id);
    connect(b, id, 1);
    return id;
  };
  const mux = (
    id: string,
    x: number,
    y: number,
    a: string,
    b: string,
    select: string,
    inverse: string,
  ) => {
    const low = gate(`${id}-low`, "and", x, y, a, inverse);
    const high = gate(`${id}-high`, "and", x, y + 65, b, select);
    return gate(id, "or", x + 170, y + 30, low, high);
  };
  add("select", "switch", 40, 30, "SELECT");
  add("not-select", "not", 330, 30, "NOT SELECT");
  connect("select", "not-select");
  for (let bit = 0; bit < 8; bit++) {
    const y = 240 + bit * 190;
    const a = add(`a${bit}`, "switch", 40, y, `A${bit}`);
    const b = add(`b${bit}`, "switch", 40, y + 75, `B${bit}`);
    const result = mux(`mux${bit}`, 480, y, a, b, "select", "not-select");
    const output = add(`out${bit}`, "lamp", 850, y, `OUT${bit}`);
    connect(result, output);
  }
  return circuit;
}

function halfAdderBlock(): Circuit {
  return {
    name: "1-bit half adder",
    nodes: [
      node("a", "switch", 40, 80, "A"),
      node("b", "switch", 40, 200, "B"),
      node("xor", "xor", 260, 70, "SUM XOR"),
      node("and", "and", 260, 220, "CARRY AND"),
      node("sum", "lamp", 500, 70, "SUM"),
      node("carry", "lamp", 500, 220, "CARRY"),
    ],
    wires: [
      wire("a", "xor"),
      wire("b", "xor", 1),
      wire("a", "and"),
      wire("b", "and", 1),
      wire("xor", "sum"),
      wire("and", "carry"),
    ],
  };
}

function fullAdderBlock(): Circuit {
  const half = halfAdderBlock();
  const nodes: Node[] = [
    node("a", "switch", 40, 70, "A"),
    node("b", "switch", 40, 170, "B"),
    node("cin", "switch", 40, 300, "CARRY IN"),
    { id: "half1", type: "module", module: half, x: 250, y: 90, label: "HALF ADDER 1" },
    { id: "half2", type: "module", module: half, x: 470, y: 90, label: "HALF ADDER 2" },
    node("carry-or", "or", 690, 260, "CARRY OR"),
    node("sum", "lamp", 900, 90, "SUM"),
    node("carry", "lamp", 900, 260, "CARRY"),
  ];
  const wires: Wire[] = [];
  const link = (from: string, to: string, input = 0, output = 0) =>
    wires.push({ id: `${from}-${to}-${input}`, from, to, input, output });
  link("a", "half1");
  link("b", "half1", 1);
  link("half1", "half2");
  link("cin", "half2", 1);
  link("half1", "carry-or", 0, 1);
  link("half2", "carry-or", 1, 1);
  link("half2", "sum");
  link("carry-or", "carry");
  return { name: "1-bit full adder", nodes, wires };
}

function aluSliceBlock(): Circuit {
  const full = fullAdderBlock();
  const circuit: Circuit = {
    name: "1-bit ALU slice",
    nodes: [
      node("a", "switch", 40, 70, "A"),
      node("b", "switch", 40, 160, "B"),
      node("cin", "switch", 40, 250, "CARRY IN"),
      node("op0", "switch", 40, 340, "OP0"),
      node("op1", "switch", 40, 430, "OP1"),
      { id: "adder", type: "module", module: full, x: 260, y: 100, label: "FULL ADDER" },
    ],
    wires: [],
  };
  const add = (id: string, type: GateType, x: number, y: number, label?: string) => {
    circuit.nodes.push(node(id, type, x, y, label));
    return id;
  };
  const link = (from: string, to: string, input = 0, output = 0) =>
    circuit.wires.push({ id: `${from}-${to}-${input}`, from, to, input, output });
  link("a", "adder");
  link("b", "adder", 1);
  link("cin", "adder", 2);
  const gate = (
    id: string,
    type: GateType,
    x: number,
    y: number,
    a: string,
    b: string,
    bOutput = 0,
  ) => {
    add(id, type, x, y);
    link(a, id);
    link(b, id, 1, bOutput);
    return id;
  };
  const not0 = add("not-op0", "not", 260, 390);
  link("op0", not0);
  const not1 = add("not-op1", "not", 260, 480);
  link("op1", not1);
  const and = gate("and", "and", 470, 300, "a", "b");
  const or = gate("or", "or", 470, 390, "a", "b");
  const xor = gate("xor", "xor", 470, 480, "a", "b");
  const lo0 = gate("lo0", "and", 690, 300, and, not0);
  const lo1 = gate("lo1", "and", 690, 390, or, "op0");
  const low = gate("low", "or", 890, 340, lo0, lo1);
  const hi0 = gate("hi0", "and", 690, 500, xor, not0);
  add("hi1", "and", 690, 590);
  link("adder", "hi1", 0, 0);
  link("op0", "hi1", 1);
  const high = gate("high", "or", 890, 540, hi0, "hi1");
  const result0 = gate("result0", "and", 1090, 340, low, not1);
  const result1 = gate("result1", "and", 1090, 540, high, "op1");
  const result = gate("result", "or", 1280, 440, result0, result1);
  add("out", "lamp", 1470, 440, "RESULT");
  link(result, "out");
  add("cout", "lamp", 1470, 140, "CARRY OUT");
  link("adder", "cout", 0, 1);
  return circuit;
}

function modularBusCircuit(kind: "half" | "full" | "alu"): Circuit {
  const block =
    kind === "half" ? halfAdderBlock() : kind === "full" ? fullAdderBlock() : aluSliceBlock();
  const name =
    kind === "half" ? "8-bit half adder" : kind === "full" ? "8-bit full adder" : "8-bit ALU";
  const circuit: Circuit = { name, nodes: [], wires: [] };
  const add = (id: string, type: GateType, x: number, y: number, label?: string) => {
    circuit.nodes.push(node(id, type, x, y, label));
    return id;
  };
  const link = (from: string, to: string, input = 0, output = 0) =>
    circuit.wires.push({ id: `${from}-${to}-${input}`, from, to, input, output });
  if (kind !== "half") add("cin", "switch", 40, 30, "CARRY IN");
  if (kind === "alu") {
    add("op0", "switch", 230, 30, "OP0");
    add("op1", "switch", 420, 30, "OP1");
  }
  let carry = "cin";
  let carryOutput = 0;
  for (let bit = 0; bit < 8; bit++) {
    const y = 220 + bit * 190;
    const a = add(`a${bit}`, "switch", 40, y, `A${bit}`);
    const b = add(`b${bit}`, "switch", 40, y + 80, `B${bit}`);
    const box = `bit${bit}`;
    circuit.nodes.push({
      id: box,
      type: "module",
      module: block,
      x: 330,
      y,
      label: kind === "alu" ? `ALU SLICE ${bit}` : `${kind.toUpperCase()} ADDER ${bit}`,
    });
    link(a, box);
    link(b, box, 1);
    if (kind !== "half") {
      link(carry, box, 2, carryOutput);
      carry = box;
      carryOutput = 1;
    }
    if (kind === "alu") {
      link("op0", box, 3);
      link("op1", box, 4);
    }
    add(`out${bit}`, "lamp", 850, y, `OUT${bit}`);
    link(box, `out${bit}`);
    if (kind === "half") {
      add(`carry${bit}`, "lamp", 850, y + 80, `CARRY${bit}`);
      link(box, `carry${bit}`, 0, 1);
    }
  }
  // Module ports follow node order. Keep each operand's bits together.
  const inputs = circuit.nodes.filter((item) => item.type === "switch");
  const otherNodes = circuit.nodes.filter((item) => item.type !== "switch");
  circuit.nodes = [
    ...Array.from({ length: 8 }, (_, bit) => inputs.find((item) => item.id === `a${bit}`)!),
    ...Array.from({ length: 8 }, (_, bit) => inputs.find((item) => item.id === `b${bit}`)!),
    ...inputs.filter((item) => !/^([ab][0-7])$/.test(item.id)),
    ...otherNodes,
  ];
  if (kind !== "half") {
    add("cout", "lamp", 850, 30, "CARRY OUT");
    link(carry, "cout", 0, 1);
  }
  return circuit;
}

function comparisonCircuit(): Circuit {
  const circuit: Circuit = { name: "8-bit magnitude comparator", nodes: [], wires: [] };
  const add = (id: string, type: GateType, x: number, y: number, label?: string) => {
    circuit.nodes.push(node(id, type, x, y, label));
    return id;
  };
  const gate = (id: string, type: GateType, x: number, y: number, a: string, b: string) => {
    add(id, type, x, y);
    circuit.wires.push(wire(a, id), wire(b, id, 1));
    return id;
  };
  let greater = add("zero-gt", "ground", 40, 30, "FALSE");
  let less = greater;
  let equal = add("one-eq", "high", 40, 120, "TRUE");
  for (let bit = 0; bit < 8; bit++) {
    const y = 250 + bit * 260;
    const a = add(`a${bit}`, "switch", 40, y, `A${bit}`);
    const b = add(`b${bit}`, "switch", 40, y + 80, `B${bit}`);
    const notA = add(`not-a${bit}`, "not", 240, y + 80);
    const notB = add(`not-b${bit}`, "not", 240, y);
    circuit.wires.push(wire(a, notA), wire(b, notB));
    const bitGreater = gate(`bit-gt${bit}`, "and", 440, y, a, notB);
    const bitLess = gate(`bit-lt${bit}`, "and", 440, y + 90, notA, b);
    const same = gate(`same${bit}`, "xnor", 440, y + 180, a, b);
    greater = gate(
      `gt${bit}`,
      "or",
      800,
      y,
      bitGreater,
      gate(`prior-gt${bit}`, "and", 620, y, same, greater),
    );
    less = gate(
      `lt${bit}`,
      "or",
      800,
      y + 90,
      bitLess,
      gate(`prior-lt${bit}`, "and", 620, y + 90, same, less),
    );
    equal = gate(`eq${bit}`, "and", 620, y + 180, same, equal);
  }
  for (const [id, source, y] of [
    ["greater", greater, 250],
    ["equal", equal, 350],
    ["less", less, 450],
  ] as const) {
    add(id, "lamp", 1040, y, id.toUpperCase());
    circuit.wires.push(wire(source, id));
  }
  return circuit;
}

function registerCircuit(kind: "shift" | "counter"): Circuit {
  const circuit: Circuit = {
    name: kind === "shift" ? "8-bit shift register" : "8-bit binary counter",
    nodes: [node("clock", "clock", 40, 30, "CLOCK")],
    wires: [],
  };
  let previous = kind === "shift" ? "data" : "one";
  if (kind === "shift") circuit.nodes.push(node("data", "switch", 40, 130, "SERIAL IN"));
  else circuit.nodes.push(node("one", "high", 40, 130, "TRUE"));
  for (let bit = 0; bit < 8; bit++) {
    const y = 260 + bit * 160;
    const flip = `bit${bit}`;
    circuit.nodes.push(node(flip, "dff", 530, y, `BIT${bit}`));
    circuit.wires.push(wire("clock", flip, 1));
    if (kind === "shift") circuit.wires.push(wire(previous, flip));
    else {
      const xor = `xor${bit}`;
      circuit.nodes.push(node(xor, "xor", 310, y, "TOGGLE"));
      circuit.wires.push(wire(flip, xor), wire(previous, xor, 1), wire(xor, flip));
      if (bit < 7) {
        const carry = `carry${bit}`;
        circuit.nodes.push(node(carry, "and", 760, y + 70, "CARRY"));
        circuit.wires.push(wire(flip, carry), wire(previous, carry, 1));
        previous = carry;
      }
    }
    const output = `out${bit}`;
    circuit.nodes.push(node(output, "lamp", 1000, y, `Q${bit}`));
    circuit.wires.push(wire(flip, output));
    if (kind === "shift") previous = flip;
  }
  return circuit;
}

type StorageKind = "sr-latch" | "gated-sr-latch" | "d-latch" | "jk-latch" | "t-latch" | "d-flip-flop" | "sr-flip-flop" | "jk-flip-flop" | "t-flip-flop";

function storageCircuit(kind: StorageKind): Circuit {
  const names: Record<StorageKind, string> = {
    "sr-latch": "SR latch",
    "gated-sr-latch": "Gated SR latch",
    "d-latch": "D latch",
    "jk-latch": "JK latch",
    "t-latch": "T latch",
    "d-flip-flop": "D flip-flop",
    "sr-flip-flop": "SR flip-flop",
    "jk-flip-flop": "JK flip-flop",
    "t-flip-flop": "T flip-flop",
  };
  const circuit: Circuit = { name: names[kind], nodes: [], wires: [] };
  const add = (id: string, type: GateType, x: number, y: number, label: string) => {
    circuit.nodes.push(node(id, type, x, y, label));
    return id;
  };
  const connect = (from: string, to: string, input = 0) => circuit.wires.push(wire(from, to, input));
  const isLatch = kind.endsWith("latch");
  const clockName = isLatch ? "ENABLE" : "CLOCK";
  const core = kind === "sr-latch" || kind === "gated-sr-latch" || kind === "d-latch" ? "srlatch" : kind === "jk-latch" || kind === "t-latch" ? "dlatch" : "dff";
  add("core", core, 570, 195, core === "srlatch" ? "SET / RESET" : core === "dlatch" ? "LEVEL STORAGE" : "EDGE STORAGE");
  add("q", "lamp", 810, 170, "Q");
  add("notQ", "not", 770, 310, "INVERT Q");
  add("qbar", "lamp", 960, 310, "Q̅");
  connect("core", "q");
  connect("core", "notQ");
  connect("notQ", "qbar");

  if (kind === "sr-latch" || kind === "gated-sr-latch" || kind === "sr-flip-flop") {
    add("s", "switch", 40, 80, "SET");
    add("r", "switch", 40, 300, "RESET");
    if (kind === "sr-latch") {
      connect("s", "core");
      connect("r", "core", 1);
    } else {
      add("control", isLatch ? "switch" : "clock", 40, 440, clockName);
      if (kind === "gated-sr-latch") {
        add("setGate", "and", 300, 90, "SET WHEN ENABLED");
        add("resetGate", "and", 300, 310, "RESET WHEN ENABLED");
        connect("s", "setGate");
        connect("control", "setGate", 1);
        connect("r", "resetGate");
        connect("control", "resetGate", 1);
        connect("setGate", "core");
        connect("resetGate", "core", 1);
      } else {
        add("notR", "not", 245, 310, "NOT RESET");
        add("hold", "and", 385, 310, "KEEP Q");
        add("next", "or", 440, 120, "NEXT STATE");
        connect("r", "notR");
        connect("core", "hold");
        connect("notR", "hold", 1);
        connect("s", "next");
        connect("hold", "next", 1);
        connect("next", "core");
        connect("control", "core", 1);
      }
    }
  } else {
    add("control", isLatch ? "switch" : "clock", 40, 430, clockName);
    if (kind !== "d-latch") connect("control", "core", 1);
    if (kind === "d-latch") {
      add("d", "switch", 40, 100, "DATA");
      add("notD", "not", 210, 280, "NOT DATA");
      add("setGate", "and", 365, 100, "SET WHEN ENABLED");
      add("resetGate", "and", 365, 300, "RESET WHEN ENABLED");
      connect("d", "notD");
      connect("d", "setGate");
      connect("control", "setGate", 1);
      connect("notD", "resetGate");
      connect("control", "resetGate", 1);
      connect("setGate", "core");
      connect("resetGate", "core", 1);
    } else if (kind === "d-flip-flop") {
      add("d", "switch", 40, 100, "DATA");
      connect("d", "core");
    } else if (kind === "t-latch" || kind === "t-flip-flop") {
      add("t", "switch", 40, 100, "TOGGLE");
      add("next", "xor", 320, 150, "Q XOR T");
      connect("core", "next");
      connect("t", "next", 1);
      connect("next", "core");
    } else {
      add("j", "switch", 40, 80, "J");
      add("k", "switch", 40, 280, "K");
      add("notK", "not", 205, 280, "NOT K");
      add("set", "and", 330, 80, "J AND NOT Q");
      add("hold", "and", 330, 290, "Q AND NOT K");
      add("next", "or", 465, 175, "NEXT STATE");
      connect("k", "notK");
      connect("j", "set");
      connect("notQ", "set", 1);
      connect("core", "hold");
      connect("notK", "hold", 1);
      connect("set", "next");
      connect("hold", "next", 1);
      connect("next", "core");
    }
  }
  return circuit;
}

export const PRESETS: Record<string, Circuit> = {
  "Half adder": {
    name: "Half adder",
    nodes: [
      node("a", "switch", 80, 130, "A"),
      node("b", "switch", 80, 310, "B"),
      node("xor", "xor", 370, 110, "SUM"),
      node("and", "and", 370, 320, "CARRY"),
      node("sum", "lamp", 680, 110, "SUM"),
      node("carry", "lamp", 680, 320, "CARRY"),
    ],
    wires: [
      wire("a", "xor"),
      wire("b", "xor", 1),
      wire("a", "and"),
      wire("b", "and", 1),
      wire("xor", "sum"),
      wire("and", "carry"),
    ],
  },
  "Full adder": {
    name: "Full adder",
    nodes: [
      node("a", "switch", 35, 60, "A"),
      node("b", "switch", 35, 220, "B"),
      node("cin", "switch", 35, 390, "CARRY IN"),
      node("xor1", "xor", 230, 95, "A XOR B"),
      node("and1", "and", 230, 245, "A AND B"),
      node("xor2", "xor", 435, 80, "SUM"),
      node("and2", "and", 435, 295, "CARRY 2"),
      node("or", "or", 625, 275, "CARRY OUT"),
      node("sum", "lamp", 690, 65, "SUM"),
      node("carry", "lamp", 760, 365, "CARRY"),
    ],
    wires: [
      wire("a", "xor1"),
      wire("b", "xor1", 1),
      wire("a", "and1"),
      wire("b", "and1", 1),
      wire("xor1", "xor2"),
      wire("cin", "xor2", 1),
      wire("xor1", "and2"),
      wire("cin", "and2", 1),
      wire("and1", "or"),
      wire("and2", "or", 1),
      wire("xor2", "sum"),
      wire("or", "carry"),
    ],
  },
  "Clocked memory": {
    name: "Clocked memory",
    nodes: [
      node("data", "switch", 90, 110, "DATA"),
      node("clock", "clock", 90, 330, "CLOCK"),
      node("flip", "dff", 390, 190, "REGISTER"),
      node("out", "lamp", 700, 190, "Q"),
    ],
    wires: [wire("data", "flip"), wire("clock", "flip", 1), wire("flip", "out")],
  },
  "NAND gate demo": {
    name: "NAND gate demo",
    nodes: [
      node("a", "switch", 90, 120, "A"),
      node("b", "switch", 90, 330, "B"),
      node("gate", "nand", 390, 220, "NAND"),
      node("out", "lamp", 700, 220, "OUTPUT"),
    ],
    wires: [wire("a", "gate"), wire("b", "gate", 1), wire("gate", "out")],
  },
  "Pulse path": {
    name: "Pulse path",
    nodes: [
      node("pulse", "pulse", 90, 210, "TRIGGER"),
      node("invert", "not", 390, 210, "INVERT"),
      node("out", "lamp", 700, 210, "OUTPUT"),
    ],
    wires: [wire("pulse", "invert"), wire("invert", "out")],
  },
  "8-bit half adder": modularBusCircuit("half"),
  "8-bit full adder": modularBusCircuit("full"),
  "8-bit 2:1 multiplexer": multiplexerCircuit(),
  "8-bit ALU": modularBusCircuit("alu"),
  "8-bit magnitude comparator": comparisonCircuit(),
  "8-bit shift register": registerCircuit("shift"),
  "8-bit binary counter": registerCircuit("counter"),
  ...Object.fromEntries(
    (["sr-latch", "gated-sr-latch", "d-latch", "jk-latch", "t-latch", "d-flip-flop", "sr-flip-flop", "jk-flip-flop", "t-flip-flop"] as StorageKind[])
      .map((kind) => {
        const circuit = storageCircuit(kind);
        return [circuit.name, circuit];
      }),
  ),
  ...MEMORY_PRESETS,
};

export const GATE_NAMES = ["not", "and", "or", "nand", "nor", "xor", "xnor"] as const;
export type LogicGate = (typeof GATE_NAMES)[number];
export type BlueprintFamily = "transistor" | "nand" | "nor" | "mixed";
export const BLUEPRINT_FAMILIES: Record<
  BlueprintFamily,
  { label: string; suffix: string; note: string }
> = {
  transistor: {
    label: "CMOS transistors",
    suffix: "CMOS transistors",
    note: "PMOS pull-up paths connect VDD to output; NMOS pull-down paths connect output to ground. NAND uses parallel PMOS and series NMOS; NOR reverses them.",
  },
  nand: {
    label: "NAND only",
    suffix: "NAND gates",
    note: "NAND is universal: every gate here uses NAND gates alone.",
  },
  nor: {
    label: "NOR only",
    suffix: "NOR gates",
    note: "NOR is also universal: every gate here uses NOR gates alone.",
  },
  mixed: {
    label: "Mixed gates",
    suffix: "mixed gates",
    note: "These constructions combine familiar gates and show De Morgan's laws and sum of products.",
  },
};
export const BLUEPRINT_RECIPES: Record<BlueprintFamily, Record<LogicGate, string>> = {
  transistor: {
    not: "Two-transistor CMOS inverter",
    and: "CMOS NAND plus inverter",
    or: "CMOS NOR plus inverter",
    nand: "Parallel PMOS, series NMOS",
    nor: "Series PMOS, parallel NMOS",
    xor: "Four CMOS NAND stages",
    xnor: "CMOS XOR plus inverter",
  },
  nand: {
    not: "A NAND A",
    and: "Invert A NAND B",
    or: "De Morgan: invert both inputs",
    nand: "One NAND",
    nor: "Invert NAND-built OR",
    xor: "Four NAND gates",
    xnor: "Invert four-NAND XOR",
  },
  nor: {
    not: "A NOR A",
    and: "De Morgan: invert both inputs",
    or: "Invert A NOR B",
    nand: "Invert NOR-built AND",
    nor: "One NOR",
    xor: "Five NOR gates",
    xnor: "Four NOR gates",
  },
  mixed: {
    not: "A XOR 1",
    and: "NOT(A NAND B)",
    or: "NOT(A NOR B)",
    nand: "NOT(A AND B)",
    nor: "NOT(A OR B)",
    xor: "(A AND NOT B) OR (NOT A AND B)",
    xnor: "NOT(A XOR B)",
  },
};

export function gateBlueprint(gate: LogicGate, family: BlueprintFamily): Circuit {
  const nodes: Node[] = [node("a", "switch", 40, 105, "A")];
  if (gate !== "not") nodes.push(node("b", "switch", 40, 335, "B"));
  const wires: Wire[] = [];
  const depth: Record<string, number> = { a: 0, b: 0 };
  const layers: Record<number, number> = {};
  const add = (type: GateType, inputs: string[], label = LABELS[type]) => {
    const level = Math.max(...inputs.map((id) => depth[id] ?? 0)) + 1;
    const row = layers[level] ?? 0;
    layers[level] = row + 1;
    const id = `part-${nodes.length}`;
    nodes.push(node(id, type, Math.min(610, 205 + (level - 1) * 145), 65 + row * 105, label));
    inputs.forEach((from, input) => {
      wires.push(wire(from, id, input));
    });
    depth[id] = level;
    return id;
  };
  let output: string;
  if (family === "transistor") {
    nodes.push(node("vcc", "high", 40, 215, "VDD"));
    nodes.push(node("gnd", "ground", 40, 445, "GND"));
    depth.vcc = depth.gnd = 0;
    const p = (control: string, source: string) => add("pmos", [control, source], "PMOS");
    const n = (control: string, source: string) => add("nmos", [control, source], "NMOS");
    const join = (left: string, right: string) => add("junction", [left, right], "OUTPUT NODE");
    // Each stage has complementary paths from VDD and GND to the shared output.
    const inverter = (input: string) => join(p(input, "vcc"), n(input, "gnd"));
    const cmosNand = (left: string, right: string) =>
      join(join(p(left, "vcc"), p(right, "vcc")), n(left, n(right, "gnd")));
    const cmosNor = (left: string, right: string) =>
      join(p(left, p(right, "vcc")), join(n(left, "gnd"), n(right, "gnd")));
    const cmosXor = () => {
      const ab = cmosNand("a", "b");
      return cmosNand(cmosNand("a", ab), cmosNand("b", ab));
    };
    switch (gate) {
      case "not":
        output = inverter("a");
        break;
      case "nand":
        output = cmosNand("a", "b");
        break;
      case "nor":
        output = cmosNor("a", "b");
        break;
      case "and":
        output = inverter(cmosNand("a", "b"));
        break;
      case "or":
        output = inverter(cmosNor("a", "b"));
        break;
      case "xor":
        output = cmosXor();
        break;
      case "xnor":
        output = inverter(cmosXor());
        break;
    }
  } else if (family === "nand") {
    const nand = (a: string, b: string) => add("nand", [a, b]);
    switch (gate) {
      case "not":
        output = nand("a", "a");
        break;
      case "nand":
        output = nand("a", "b");
        break;
      case "and": {
        const ab = nand("a", "b");
        output = nand(ab, ab);
        break;
      }
      case "or":
        output = nand(nand("a", "a"), nand("b", "b"));
        break;
      case "nor": {
        const or = nand(nand("a", "a"), nand("b", "b"));
        output = nand(or, or);
        break;
      }
      case "xor": {
        const ab = nand("a", "b");
        output = nand(nand("a", ab), nand("b", ab));
        break;
      }
      case "xnor": {
        const ab = nand("a", "b");
        const xor = nand(nand("a", ab), nand("b", ab));
        output = nand(xor, xor);
        break;
      }
    }
  } else if (family === "nor") {
    const nor = (a: string, b: string) => add("nor", [a, b]);
    switch (gate) {
      case "not":
        output = nor("a", "a");
        break;
      case "nor":
        output = nor("a", "b");
        break;
      case "or": {
        const ab = nor("a", "b");
        output = nor(ab, ab);
        break;
      }
      case "and":
        output = nor(nor("a", "a"), nor("b", "b"));
        break;
      case "nand": {
        const and = nor(nor("a", "a"), nor("b", "b"));
        output = nor(and, and);
        break;
      }
      case "xor": {
        const ab = nor("a", "b");
        output = nor(ab, nor(nor("a", ab), nor("b", ab)));
        break;
      }
      case "xnor": {
        const ab = nor("a", "b");
        output = nor(nor("a", ab), nor("b", ab));
        break;
      }
    }
  } else {
    const addNot = (a: string) => add("not", [a]);
    switch (gate) {
      case "not": {
        nodes.push(node("vcc", "high", 40, 225, "HIGH"));
        output = add("xor", ["a", "vcc"]);
        break;
      }
      case "and":
        output = addNot(add("nand", ["a", "b"]));
        break;
      case "or":
        output = addNot(add("nor", ["a", "b"]));
        break;
      case "nand":
        output = addNot(add("and", ["a", "b"]));
        break;
      case "nor":
        output = addNot(add("or", ["a", "b"]));
        break;
      case "xor": {
        const notA = addNot("a");
        const notB = addNot("b");
        output = add("or", [add("and", ["a", notB]), add("and", [notA, "b"])]);
        break;
      }
      case "xnor":
        output = addNot(add("xor", ["a", "b"]));
        break;
    }
  }
  if (family === "transistor") {
    const rows: Record<number, number> = {};
    for (const item of nodes) {
      if (item.type === "switch" || item.type === "high" || item.type === "ground") continue;
      const level = depth[item.id];
      const row = rows[level] ?? 0;
      rows[level] = row + 1;
      item.x = 210 + (level - 1) * 180;
      item.y = 35 + row * 105;
    }
  }
  const final = nodes.find((item) => item.id === output)!;
  nodes.push(
    node(
      "out",
      "lamp",
      family === "transistor" ? final.x + 180 : 755,
      family === "transistor" ? final.y : 220,
      `${LABELS[gate]} OUTPUT`,
    ),
  );
  wires.push(wire(output, "out"));
  const name = `${LABELS[gate]} from ${BLUEPRINT_FAMILIES[family].suffix}`;
  return {
    name,
    nodes,
    wires,
    groups: [
      {
        id: "construction",
        label: name,
        nodeIds: nodes
          .filter((item) => !["switch", "lamp"].includes(item.type))
          .map((item) => item.id),
      },
    ],
  };
}

export function blueprintGate(circuit: Circuit): LogicGate | null {
  const [name, separator] = circuit.name.split(" ");
  const gate = name.toLowerCase() as LogicGate;
  return separator === "from" && GATE_NAMES.includes(gate) ? gate : null;
}

export const BLUEPRINTS: Record<string, Circuit> = Object.fromEntries(
  (Object.keys(BLUEPRINT_FAMILIES) as BlueprintFamily[]).flatMap((family) =>
    GATE_NAMES.filter((gate) => BLUEPRINT_RECIPES[family][gate]).map((gate) => {
      const circuit = gateBlueprint(gate, family);
      return [circuit.name, circuit] as const;
    }),
  ),
);

export function validateCircuit(
  value: unknown,
  depth = 0,
  budget = { remaining: 3000 },
): Circuit | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<Circuit>;
  if (
    typeof item.name !== "string" ||
    !Array.isArray(item.nodes) ||
    !Array.isArray(item.wires) ||
    item.nodes.length > 300 ||
    item.wires.length > 800 ||
    depth > 5 ||
    budget.remaining < item.nodes.length
  )
    return null;
  budget.remaining -= item.nodes.length;
  const types = Object.keys(INPUTS);
  if (
    !item.nodes.every(
      (n) =>
        n &&
        typeof n.id === "string" &&
        n.id.length < 100 &&
        types.includes(n.type) &&
        Number.isFinite(n.x) &&
        Number.isFinite(n.y) &&
        (n.inputSide === undefined || ["left", "top", "right", "bottom"].includes(n.inputSide)) &&
        (n.outputSide === undefined || ["left", "top", "right", "bottom"].includes(n.outputSide)) &&
        validProbe(n),
    )
  )
    return null;
  const ids = new Set(item.nodes.map((n) => n.id));
  if (ids.size !== item.nodes.length) return null;
  if (
    item.groups !== undefined &&
    (!Array.isArray(item.groups) ||
      item.groups.length > 100 ||
      !item.groups.every(
        (group) =>
          group &&
          typeof group.id === "string" &&
          group.id.length < 100 &&
          typeof group.label === "string" &&
          group.label.length <= 80 &&
          Array.isArray(group.nodeIds) &&
          group.nodeIds.length <= 300 &&
          group.nodeIds.every((id) => typeof id === "string" && ids.has(id)),
      ) ||
      new Set(item.groups.map((group) => group.id)).size !== item.groups.length)
  )
    return null;
  const validatedModules = new Map<string, Circuit>();
  if (
    !item.nodes.every(
      (n) =>
        n.numberValue === undefined ||
        (Number.isInteger(n.numberValue) &&
          n.numberValue >= 0 &&
          n.numberValue < (n.type === "input4" ? 16 : n.type === "input8" ? 256 : 1)),
    )
  )
    return null;
  for (const n of item.nodes) {
    if (n.type !== "module") continue;
    const inner = validateCircuit(n.module, depth + 1, budget);
    if (
      !inner ||
      moduleInputs(inner).length > 24 ||
      moduleOutputs(inner).length < 1 ||
      moduleOutputs(inner).length > 24
    )
      return null;
    validatedModules.set(n.id, inner);
  }
  if (
    !item.wires.every(
      (w) =>
        w &&
        typeof w.id === "string" &&
        ids.has(w.from) &&
        ids.has(w.to) &&
        Number.isInteger(w.input) &&
        w.input >= 0 &&
        w.input <
          inputCount({
            ...item.nodes!.find((n) => n.id === w.to)!,
            module: validatedModules.get(w.to),
          }) &&
        (w.output === undefined || (Number.isInteger(w.output) && w.output >= 0)) &&
        (w.output ?? 0) <
          outputCount({
            ...item.nodes!.find((n) => n.id === w.from)!,
            module: validatedModules.get(w.from),
          }),
    )
  )
    return null;
  return {
    name: item.name.slice(0, 80),
    nodes: item.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      x: n.x,
      y: n.y,
      inputSide: n.inputSide,
      outputSide: n.outputSide,
      label: typeof n.label === "string" ? n.label.slice(0, 30) : undefined,
      value: Boolean(n.value),
      numberValue: n.numberValue,
      ...(n.probe ? { probe: n.probe } : {}),
      module: validatedModules.get(n.id),
    })),
    wires: item.wires.map((w) => ({
      id: w.id,
      from: w.from,
      to: w.to,
      input: w.input,
      output: w.output,
      color:
        typeof w.color === "string" && Object.hasOwn(WIRE_COLORS, w.color)
          ? (w.color as WireColor)
          : undefined,
    })),
    groups: item.groups?.map((group) => ({
      id: group.id,
      label: group.label,
      nodeIds: [...group.nodeIds],
    })),
  };
}
