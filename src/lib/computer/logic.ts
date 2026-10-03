export type GateType =
  | "switch"
  | "clock"
  | "pulse"
  | "lamp"
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
  | "module";
export type Node = {
  id: string;
  type: GateType;
  x: number;
  y: number;
  label?: string;
  value?: boolean;
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
  module: 0,
};
export const LABELS: Record<GateType, string> = {
  switch: "SWITCH",
  clock: "CLOCK",
  pulse: "PULSE",
  lamp: "LAMP",
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
  module: "CIRCUIT",
};
export const moduleInputs = (circuit: Circuit) =>
  circuit.nodes.filter((node) => ["switch", "clock", "pulse"].includes(node.type));
export const moduleOutputs = (circuit: Circuit) =>
  circuit.nodes.filter((node) => node.type === "lamp");
export const inputCount = (node: Node) =>
  node.type === "module" ? moduleInputs(node.module!).length : INPUTS[node.type];
export const outputCount = (node: Node) =>
  node.type === "module" ? moduleOutputs(node.module!).length : node.type === "lamp" ? 0 : 1;
export const inputLabel = (node: Node, index: number) =>
  node.type === "module"
    ? moduleInputs(node.module!)[index]?.label || `Input ${index + 1}`
    : `Input ${index + 1}`;
export const outputLabel = (node: Node, index: number) =>
  node.type === "module"
    ? moduleOutputs(node.module!)[index]?.label || `Output ${index + 1}`
    : "Output";
export const initialSnapshot = (): Snapshot => ({
  values: {},
  memory: {},
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
    if (node.type === "dff") values[node.id] = Boolean(previous.memory[node.id]);
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
            if (depth >= 4 || !node.module) continue;
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
  const lastClock = { ...previous.lastClock };
  for (const node of circuit.nodes) {
    if (node.type !== "dff") continue;
    const [data, clock] = inputs(node);
    if (clock && !previous.lastClock[node.id]) memory[node.id] = data;
    lastClock[node.id] = clock;
  }
  for (const node of circuit.nodes)
    if (node.type === "dff") values[node.id] = Boolean(memory[node.id]);
  settle();
  return { values, memory, lastClock, outputs, modules, unstable };
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

function busCircuit(kind: "half" | "full" | "mux" | "alu"): Circuit {
  const names = {
    half: "8-bit half adder",
    full: "8-bit full adder",
    mux: "8-bit 2:1 multiplexer",
    alu: "8-bit ALU",
  };
  const circuit: Circuit = { name: names[kind], nodes: [], wires: [] };
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
  const mux = (id: string, x: number, y: number, a: string, b: string, select: string, inverse: string) => {
    const low = gate(`${id}-low`, "and", x, y, a, inverse);
    const high = gate(`${id}-high`, "and", x, y + 65, b, select);
    return gate(id, "or", x + 170, y + 30, low, high);
  };
  if (kind === "mux" || kind === "alu") {
    const selects = kind === "mux" ? ["select"] : ["op0", "op1"];
    selects.forEach((id, index) => add(id, "switch", 40 + index * 150, 30, id.toUpperCase()));
    selects.forEach((id, index) => {
      const inverse = add(`not-${id}`, "not", 330 + index * 150, 30, `NOT ${id.toUpperCase()}`);
      connect(id, inverse);
    });
  }
  if (kind === "full" || kind === "alu") add("cin", "switch", 40, kind === "alu" ? 120 : 30, "CARRY IN");
  let carry = "cin";
  for (let bit = 0; bit < 8; bit++) {
    const y = 240 + bit * (kind === "alu" ? 310 : 190);
    const a = add(`a${bit}`, "switch", 40, y, `A${bit}`);
    const b = add(`b${bit}`, "switch", 40, y + 75, `B${bit}`);
    let result: string;
    if (kind === "mux") {
      result = mux(`mux${bit}`, 480, y, a, b, "select", "not-select");
    } else {
      const xor = gate(`xor${bit}`, "xor", 290, y, a, b);
      const and = gate(`and${bit}`, "and", 290, y + 80, a, b);
      if (kind === "half") {
        result = xor;
        const lamp = add(`carry${bit}`, "lamp", 850, y + 80, `CARRY${bit}`);
        connect(and, lamp);
      } else {
        result = gate(`sum${bit}`, "xor", 510, y, xor, carry);
        const carryPart = gate(`carry-part${bit}`, "and", 510, y + 80, xor, carry);
        carry = gate(`carry-out${bit}`, "or", 730, y + 80, and, carryPart);
      }
      if (kind === "alu") {
        const or = gate(`or${bit}`, "or", 290, y + 160, a, b);
        const first = mux(`select-low${bit}`, 960, y, and, or, "op0", "not-op0");
        const second = mux(`select-high${bit}`, 960, y + 155, xor, result, "op0", "not-op0");
        result = mux(`result${bit}`, 1320, y + 60, first, second, "op1", "not-op1");
      }
    }
    const output = add(`out${bit}`, "lamp", kind === "alu" ? 1700 : 850, y, `OUT${bit}`);
    connect(result, output);
  }
  if (kind === "full" || kind === "alu") {
    const output = add("cout", "lamp", kind === "alu" ? 1700 : 1030, 120, "CARRY OUT");
    connect(carry, output);
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
  "8-bit half adder": busCircuit("half"),
  "8-bit full adder": busCircuit("full"),
  "8-bit 2:1 multiplexer": busCircuit("mux"),
  "8-bit ALU": busCircuit("alu"),
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

export function validateCircuit(value: unknown, depth = 0): Circuit | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<Circuit>;
  if (
    typeof item.name !== "string" ||
    !Array.isArray(item.nodes) ||
    !Array.isArray(item.wires) ||
    item.nodes.length > 300 ||
    item.wires.length > 800 ||
    depth > 3
  )
    return null;
  const types = Object.keys(INPUTS);
  if (
    !item.nodes.every(
      (n) =>
        n &&
        typeof n.id === "string" &&
        n.id.length < 100 &&
        types.includes(n.type) &&
        Number.isFinite(n.x) &&
        Number.isFinite(n.y),
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
  for (const n of item.nodes) {
    if (n.type !== "module") continue;
    const inner = validateCircuit(n.module, depth + 1);
    if (
      !inner ||
      moduleInputs(inner).length > 8 ||
      moduleOutputs(inner).length < 1 ||
      moduleOutputs(inner).length > 8
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
      label: typeof n.label === "string" ? n.label.slice(0, 30) : undefined,
      value: Boolean(n.value),
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
