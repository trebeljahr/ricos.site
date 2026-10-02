export type GateType =
  | "switch"
  | "clock"
  | "pulse"
  | "lamp"
  | "not"
  | "and"
  | "or"
  | "xor"
  | "nand"
  | "nor"
  | "dff";
export type Node = {
  id: string;
  type: GateType;
  x: number;
  y: number;
  label?: string;
  value?: boolean;
};
export type Wire = { id: string; from: string; to: string; input: number };
export type Circuit = { name: string; nodes: Node[]; wires: Wire[] };
export type Snapshot = {
  values: Record<string, boolean>;
  memory: Record<string, boolean>;
  lastClock: Record<string, boolean>;
  unstable: boolean;
};

export const INPUTS: Record<GateType, number> = {
  switch: 0,
  clock: 0,
  pulse: 0,
  lamp: 1,
  not: 1,
  and: 2,
  or: 2,
  xor: 2,
  nand: 2,
  nor: 2,
  dff: 2,
};
export const LABELS: Record<GateType, string> = {
  switch: "SWITCH",
  clock: "CLOCK",
  pulse: "PULSE",
  lamp: "LAMP",
  not: "NOT",
  and: "AND",
  or: "OR",
  xor: "XOR",
  nand: "NAND",
  nor: "NOR",
  dff: "D FLIP-FLOP",
};
export const initialSnapshot = (): Snapshot => ({
  values: {},
  memory: {},
  lastClock: {},
  unstable: false,
});

export function step(
  circuit: Circuit,
  previous: Snapshot,
  clockHigh: boolean,
  pulses: Record<string, boolean> = {},
): Snapshot {
  const nodes = new Map(circuit.nodes.map((node) => [node.id, node]));
  const wires = circuit.wires.filter(
    (wire) =>
      nodes.has(wire.from) && nodes.has(wire.to) && wire.input < INPUTS[nodes.get(wire.to)!.type],
  );
  const values: Record<string, boolean> = { ...previous.values };
  for (const node of circuit.nodes) {
    if (node.type === "switch") values[node.id] = Boolean(node.value);
    if (node.type === "clock") values[node.id] = clockHigh;
    if (node.type === "pulse") values[node.id] = Boolean(pulses[node.id]);
    if (node.type === "dff") values[node.id] = Boolean(previous.memory[node.id]);
  }
  let unstable = false;
  const inputs = (id: string) =>
    [0, 1].map((port) => {
      const wire = wires.find((candidate) => candidate.to === id && candidate.input === port);
      return wire ? Boolean(values[wire.from]) : false;
    });
  // Combinational gates settle within one tick. A feedback loop that does not settle is flagged.
  const settle = () => {
    for (let pass = 0; pass <= circuit.nodes.length; pass++) {
      let changed = false;
      for (const node of circuit.nodes) {
        const [a, b] = inputs(node.id);
        let next: boolean;
        switch (node.type) {
          case "lamp":
            next = a;
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
    const [data, clock] = inputs(node.id);
    if (clock && !previous.lastClock[node.id]) memory[node.id] = data;
    lastClock[node.id] = clock;
  }
  for (const node of circuit.nodes)
    if (node.type === "dff") values[node.id] = Boolean(memory[node.id]);
  settle();
  return { values, memory, lastClock, unstable };
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
  "NAND from switches": {
    name: "NAND from switches",
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
};

export function validateCircuit(value: unknown): Circuit | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<Circuit>;
  if (
    typeof item.name !== "string" ||
    !Array.isArray(item.nodes) ||
    !Array.isArray(item.wires) ||
    item.nodes.length > 300 ||
    item.wires.length > 800
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
    !item.wires.every(
      (w) =>
        w &&
        typeof w.id === "string" &&
        ids.has(w.from) &&
        ids.has(w.to) &&
        Number.isInteger(w.input) &&
        w.input >= 0 &&
        w.input < INPUTS[item.nodes!.find((n) => n.id === w.to)!.type],
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
    })),
    wires: item.wires.map((w) => ({ id: w.id, from: w.from, to: w.to, input: w.input })),
  };
}
