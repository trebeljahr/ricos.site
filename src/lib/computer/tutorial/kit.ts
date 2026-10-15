// Building blocks for level circuits: the locked ports a level starts with,
// reference solutions written as a short list of gates, and the lock rule that
// keeps pre-placed parts in place while the reader edits.
import {
  type Circuit,
  type GateType,
  inputCount,
  type Node,
  outputCount,
  type Wire,
} from "../logic";
import { nodeHeight, nodeWidth } from "../nodeGeometry";
import type { Level, LevelPort, PartId } from "./types";

/** A signal source: a node id, or a node id and its output port. */
export type Source = string | readonly [string, number];

const sourceOf = (source: Source): [string, number] =>
  typeof source === "string" ? [source, 0] : [source[0], source[1]];

export const wireId = (from: string, output: number, to: string, input: number) =>
  `${from}:${output}>${to}:${input}`;

const INPUT_X = 40;
const COLUMN_GAP = 90;
const ROW_GAP = 34;
/** Sort key for a part with no placed source yet: after the others. */
const UNPLACED = 1e9;

/** The spec's ports as nodes: switches or clocks, then lamps, in port order. */
export function portNodes(inputs: LevelPort[], outputs: LevelPort[]): Node[] {
  return [
    ...inputs.map(
      (port): Node => ({
        id: port.id,
        type: port.clock ? "clock" : "switch",
        x: 0,
        y: 0,
        label: port.label,
        value: false,
      }),
    ),
    ...outputs.map(
      (port): Node => ({ id: port.id, type: "lamp", x: 0, y: 0, label: port.label, value: false }),
    ),
  ];
}

/**
 * Lays a circuit out in columns: inputs on the left, each part one column
 * right of the parts that feed it, lamps on the right. Feedback wires (a
 * latch's loop) do not push a part further right. Returns new nodes; the
 * node order, which defines a boxed part's ports, stays the same.
 */
export function layoutColumns(circuit: Circuit, minOutputX = 0): Circuit {
  const byId = new Map(circuit.nodes.map((node) => [node.id, node]));
  const sources = new Map<string, string[]>();
  for (const wire of circuit.wires)
    sources.set(wire.to, [...(sources.get(wire.to) ?? []), wire.from]);
  const isInput = (node: Node) =>
    ["switch", "clock", "pulse", "input4", "input8"].includes(node.type);
  const column = new Map<string, number>();
  const visiting = new Set<string>();
  const depth = (id: string): number => {
    const known = column.get(id);
    if (known !== undefined) return known;
    const node = byId.get(id);
    if (!node || isInput(node) || node.type === "high" || node.type === "ground") {
      column.set(id, 0);
      return 0;
    }
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const value = 1 + Math.max(0, ...(sources.get(id) ?? []).map(depth));
    visiting.delete(id);
    column.set(id, value);
    return value;
  };
  for (const node of circuit.nodes) depth(node.id);
  const lampColumn = Math.max(
    1,
    ...circuit.nodes.filter((node) => node.type !== "lamp").map((node) => column.get(node.id)! + 1),
  );
  for (const node of circuit.nodes) if (node.type === "lamp") column.set(node.id, lampColumn);
  const columns: Node[][] = [];
  for (const node of circuit.nodes) {
    const index = column.get(node.id)!;
    columns[index] = [...(columns[index] ?? []), node];
  }
  const placed = new Map<string, { x: number; y: number }>();
  let x = INPUT_X;
  columns.forEach((members = [], index) => {
    if (index === lampColumn) x = Math.max(x, minOutputX);
    // Order each column by where its sources sit, so wires cross less.
    const centre = (node: Node) => {
      const ys = (sources.get(node.id) ?? [])
        .map((id) => placed.get(id))
        .filter(Boolean)
        .map((point) => point!.y);
      return ys.length ? ys.reduce((sum, y) => sum + y, 0) / ys.length : UNPLACED;
    };
    const ordered =
      index === 0 || index === lampColumn
        ? members
        : [...members].sort((a, b) => centre(a) - centre(b));
    let y = 40;
    for (const node of ordered) {
      const middle = index === 0 || index === lampColumn ? UNPLACED : centre(node);
      const top = middle >= UNPLACED ? y : Math.max(y, middle - 20);
      placed.set(node.id, { x, y: top });
      y = top + nodeHeight(node) + ROW_GAP;
    }
    if (members.length) x += Math.max(...members.map((node) => nodeWidth(node))) + COLUMN_GAP;
  });
  return {
    ...circuit,
    nodes: circuit.nodes.map((node) => ({ ...node, ...placed.get(node.id) })),
  };
}

/**
 * Writes a reference solution as a list of parts. Ids are short and stable
 * ("n1", "n2", …) so steps and hints can name them.
 */
export class CircuitKit {
  private nodes: Node[];
  private wires: Wire[] = [];
  private count = 0;

  constructor(
    private name: string,
    inputs: LevelPort[],
    outputs: LevelPort[],
  ) {
    this.nodes = portNodes(inputs, outputs);
  }

  private connect(source: Source, to: string, input: number) {
    const [from, output] = sourceOf(source);
    this.wires = this.wires.filter((wire) => !(wire.to === to && wire.input === input));
    this.wires.push({ id: wireId(from, output, to, input), from, to, input, output });
  }

  /** Adds a built-in part with its inputs wired in order; returns its id. */
  gate(type: GateType, inputs: Source[], options: { id?: string; label?: string } = {}) {
    const id = options.id ?? `n${++this.count}`;
    this.nodes.push({ id, type, x: 0, y: 0, value: false, label: options.label });
    inputs.forEach((source, input) => {
      this.connect(source, id, input);
    });
    return id;
  }

  /** Adds a boxed part made by an earlier level; returns its id. */
  part(
    part: PartId,
    module: Circuit,
    inputs: (Source | null)[],
    options: { id?: string; label?: string } = {},
  ) {
    const id = options.id ?? `n${++this.count}`;
    this.nodes.push({ id, type: "module", module, part, x: 0, y: 0, label: options.label });
    inputs.forEach((source, input) => {
      if (source) this.connect(source, id, input);
    });
    return id;
  }

  /** Wires a source into an input of an existing part, e.g. to close a latch's loop. */
  wire(source: Source, to: string, input = 0) {
    this.connect(source, to, input);
    return this;
  }

  /** Wires a source into an output lamp. */
  out(lamp: string, source: Source) {
    this.connect(source, lamp, 0);
    return this;
  }

  build(minOutputX = 0): Circuit {
    return layoutColumns({ name: this.name, nodes: this.nodes, wires: this.wires }, minOutputX);
  }
}

const spaceForParts = 560;

/** Ports of a level, from its spec; custom levels define their own start circuit. */
export function levelPorts(level: Level): { inputs: LevelPort[]; outputs: LevelPort[] } {
  return level.spec.kind === "custom"
    ? { inputs: [], outputs: [] }
    : { inputs: level.spec.inputs, outputs: level.spec.outputs };
}

/**
 * The start circuit: the locked ports where the reference solution has them,
 * or in two columns with room between them.
 */
export function defaultStart(level: Level): { circuit: Circuit; locked: string[] } {
  const { inputs, outputs } = levelPorts(level);
  const ports = portNodes(inputs, outputs);
  const reference = level.reference?.();
  const placed = new Map(reference?.nodes.map((node) => [node.id, node]));
  const outputX = Math.max(
    INPUT_X + 132 + spaceForParts,
    ...ports.filter((node) => node.type === "lamp").map((node) => placed.get(node.id)?.x ?? 0),
  );
  let inputY = 40;
  let outputY = 40;
  const nodes = ports.map((node) => {
    const at = placed.get(node.id);
    if (node.type === "lamp") {
      const y = at?.y ?? outputY;
      outputY = y + nodeHeight(node) + ROW_GAP;
      return { ...node, x: outputX, y };
    }
    const y = at?.y ?? inputY;
    inputY = y + nodeHeight(node) + ROW_GAP;
    return { ...node, x: INPUT_X, y };
  });
  return {
    circuit: { name: level.title, nodes, wires: [] },
    locked: nodes.map((node) => node.id),
  };
}

export type LevelStart = {
  circuit: Circuit;
  locked: string[];
  enforce: (circuit: Circuit) => Circuit;
};

/** The level's start circuit, locked ids and lock rule. */
export function levelStart(level: Level): LevelStart {
  const start: { circuit: Circuit; locked: string[]; enforce?: (circuit: Circuit) => Circuit } =
    level.start?.() ?? defaultStart(level);
  return {
    circuit: start.circuit,
    locked: start.locked,
    enforce:
      start.enforce ?? ((circuit: Circuit) => enforceStart(circuit, start.circuit, start.locked)),
  };
}

/**
 * Puts locked parts and the wires between them back as the start circuit has
 * them. Locked parts may move and turn, and switches may flip. Returns the
 * same object when nothing had to change.
 */
export function enforceStart(circuit: Circuit, start: Circuit, locked: readonly string[]): Circuit {
  const lockedIds = new Set(locked);
  const current = new Map(circuit.nodes.map((node) => [node.id, node]));
  let changed = false;
  const kept = start.nodes
    .filter((node) => lockedIds.has(node.id))
    .map((base) => {
      const node = current.get(base.id);
      if (!node) {
        changed = true;
        return base;
      }
      if (
        node.type !== base.type ||
        node.label !== base.label ||
        node.module !== base.module ||
        node.behaviour !== base.behaviour
      ) {
        changed = true;
        return {
          ...base,
          x: node.x,
          y: node.y,
          inputSide: node.inputSide,
          outputSide: node.outputSide,
          value: base.type === "switch" ? Boolean(node.value) : base.value,
        };
      }
      return node;
    });
  const lockedWires = start.wires.filter(
    (wire) => lockedIds.has(wire.from) && lockedIds.has(wire.to),
  );
  const haveWire = new Set(
    circuit.wires.map((wire) => wireId(wire.from, wire.output ?? 0, wire.to, wire.input)),
  );
  const missing = lockedWires.filter(
    (wire) => !haveWire.has(wireId(wire.from, wire.output ?? 0, wire.to, wire.input)),
  );
  // The locked parts lead the node list: a boxed part's ports follow node order.
  const inOrder =
    circuit.nodes.length >= kept.length &&
    kept.every((node, index) => circuit.nodes[index]?.id === node.id);
  if (!changed && !missing.length && inOrder) return circuit;
  const taken = new Set(missing.map((wire) => `${wire.to}:${wire.input}`));
  return {
    ...circuit,
    nodes: [...kept, ...circuit.nodes.filter((node) => !lockedIds.has(node.id))],
    wires: [...circuit.wires.filter((wire) => !taken.has(`${wire.to}:${wire.input}`)), ...missing],
  };
}

/** Every input row, counting up in binary with the first input as the high bit. */
export function allRows(count: number): boolean[][] {
  return Array.from({ length: 2 ** count }, (_, row) =>
    Array.from({ length: count }, (_, index) => Boolean((row >> (count - 1 - index)) & 1)),
  );
}

/** Bits of a number, least significant first. */
export const bitsOf = (value: number, width: number) =>
  Array.from({ length: width }, (_, bit) => Boolean((value >> bit) & 1));

/** The number from bits, least significant first. */
export const numberOf = (bits: readonly boolean[]) =>
  bits.reduce((sum, bit, index) => sum + (bit ? 2 ** index : 0), 0);

/** Ports named PREFIX0, PREFIX1, …, e.g. A0–A3. */
export const busPorts = (id: string, label: string, width: number, short = label): LevelPort[] =>
  Array.from({ length: width }, (_, bit) => ({
    id: `${id}${bit}`,
    label: `${label}${bit}`,
    short: `${short}${bit}`,
  }));

/** Whether a node has a wire in every input. */
export const fullyWired = (circuit: Circuit, node: Node) => {
  const wired = new Set(
    circuit.wires.filter((wire) => wire.to === node.id).map((wire) => wire.input),
  );
  return wired.size >= inputCount(node);
};

/** Output count of a node, including boxed parts. */
export const outputsOf = (node: Node) => outputCount(node);
