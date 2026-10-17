// Feedback on a working circuit: how big and how deep it is next to the
// reference solution, which parts do nothing, and which groups of gates
// compute something a part from an earlier level already does.
import { withoutWireSplices } from "../wireTopology";
import {
  type Circuit,
  type GateType,
  INPUTS,
  moduleInputs,
  moduleOutputs,
  type Node,
} from "../logic";
import { feeding, partName, runRow, truthRows } from "./grade";
import type { HintAnchor, Level, PartId, TruthSpec } from "./types";

/** Cost of each built-in part in two-input NAND gates, as NandGame counts them. */
export const NAND_COST: Partial<Record<GateType, number>> = {
  nand: 1,
  not: 1,
  and: 2,
  or: 3,
  nor: 4,
  xor: 4,
  xnor: 5,
  srlatch: 4,
  dlatch: 5,
  dff: 9,
};

const PASSIVE = new Set<GateType>([
  "switch",
  "clock",
  "pulse",
  "lamp",
  "high",
  "ground",
  "junction",
  "input4",
  "input8",
  "display4",
  "display8",
  "splitter",
  "merger",
]);

type FlatGate = { id: string; type: GateType; inputs: (string | undefined)[]; outputs: string[] };

const net = (path: string, output: number) => `${path}#${output}`;

/**
 * Every built-in part inside the circuit, modules opened all the way down,
 * with its input and output nets. Module ports and lamps become aliases of
 * the net that drives them.
 */
export function flatten(source: Circuit) {
  const circuit = withoutWireSplices(source);
  const gates: FlatGate[] = [];
  const alias = new Map<string, string | undefined>();
  const inputNets: string[] = [];
  const outputNets: (string | undefined)[] = [];
  const visit = (
    current: Circuit,
    prefix: string,
    depth: number,
    portNets?: (string | undefined)[],
  ) => {
    const driver = new Map<string, string>();
    for (const wire of current.wires)
      driver.set(`${wire.to}:${wire.input}`, net(prefix + wire.from, wire.output ?? 0));
    const inputsOf = (node: Node, count: number) =>
      Array.from({ length: count }, (_, input) => driver.get(`${node.id}:${input}`));
    const ports = moduleInputs(current);
    for (const node of current.nodes) {
      const path = prefix + node.id;
      if (["switch", "clock", "pulse"].includes(node.type)) {
        if (portNets) alias.set(net(path, 0), portNets[ports.indexOf(node)]);
        else inputNets.push(net(path, 0));
      } else if (node.type === "lamp") {
        if (!portNets) outputNets.push(driver.get(`${node.id}:0`));
      } else if (node.type === "module" && node.module && depth < 8) {
        const inner = node.module;
        visit(inner, `${path}/`, depth + 1, inputsOf(node, moduleInputs(inner).length));
        moduleOutputs(inner).forEach((lamp, output) => {
          const innerDriver = inner.wires.find((wire) => wire.to === lamp.id && wire.input === 0);
          alias.set(
            net(path, output),
            innerDriver ? net(`${path}/${innerDriver.from}`, innerDriver.output ?? 0) : undefined,
          );
        });
      } else if (node.type !== "high" && node.type !== "ground") {
        const count = INPUTS[node.type];
        gates.push({
          id: path,
          type: node.type,
          inputs: inputsOf(node, count),
          outputs: [net(path, 0)],
        });
      } else inputNets.push(net(path, 0));
    }
  };
  visit(circuit, "", 0);
  const resolve = (id: string | undefined): string | undefined => {
    let current = id;
    for (let hops = 0; current && alias.has(current) && hops < 64; hops++)
      current = alias.get(current);
    return current;
  };
  return {
    gates: gates.map((gate) => ({ ...gate, inputs: gate.inputs.map(resolve) })),
    inputs: inputNets,
    outputs: outputNets.map(resolve),
  };
}

export type Stats = {
  /** Parts the reader placed, boxed parts counting as one. */
  parts: number;
  /** Built-in gates inside, boxed parts opened all the way down. */
  gates: number;
  transistors: number;
  /** The gates as two-input NAND gates. */
  nands: number;
  /** The most gates a signal passes on its way from an input to an output. */
  depth: number;
  /** Boxed parts used, by part id. */
  usedParts: Record<PartId, number>;
};

export function circuitStats(source: Circuit, locked: readonly string[]): Stats {
  const circuit = withoutWireSplices(source);
  const lockedIds = new Set(locked);
  const placed = circuit.nodes.filter((node) => !node.splice && !lockedIds.has(node.id));
  const usedParts: Record<PartId, number> = {};
  for (const node of placed) if (node.part) usedParts[node.part] = (usedParts[node.part] ?? 0) + 1;
  const flat = flatten(circuit);
  const logic = flat.gates.filter((gate) => !PASSIVE.has(gate.type));
  const transistors = logic.filter((gate) => gate.type === "nmos" || gate.type === "pmos").length;
  const byOutput = new Map(
    flat.gates.flatMap((gate) => gate.outputs.map((id) => [id, gate] as const)),
  );
  const memo = new Map<string, number>();
  const visiting = new Set<string>();
  const depthOf = (id: string | undefined): number => {
    if (!id) return 0;
    const known = memo.get(id);
    if (known !== undefined) return known;
    const gate = byOutput.get(id);
    if (!gate || visiting.has(id)) return 0;
    visiting.add(id);
    const delay = PASSIVE.has(gate.type) ? 0 : 1;
    const value = delay + Math.max(0, ...gate.inputs.map(depthOf));
    visiting.delete(id);
    memo.set(id, value);
    return value;
  };
  return {
    parts: placed.length,
    gates: logic.length - transistors,
    transistors,
    nands: logic.reduce((sum, gate) => sum + (NAND_COST[gate.type] ?? 0), 0),
    depth: Math.max(0, ...flat.outputs.map(depthOf)),
    usedParts,
  };
}

export type Note = {
  tone: "good" | "tip" | "warn";
  text: string;
  anchor?: HintAnchor;
  /** Parts to ring on the board while the note shows. */
  nodes?: string[];
};

/** A part the reader may use instead of gates: its function, for spotting it. */
export type KnownPart = {
  part: PartId;
  label: string;
  inputs: number;
  outputs: number;
  fn: (inputs: boolean[]) => boolean[];
};

/** Bit vectors: one bit per checked row, packed into 32-bit words. */
type Vector = Uint32Array;

const vectorKey = (vector: Vector) => vector.join(",");

function vectorsFor(circuit: Circuit, spec: TruthSpec) {
  const rows = truthRows(spec);
  const words = Math.ceil(rows.length / 32);
  const vectors = new Map<string, Vector>();
  const set = (key: string, row: number, value: boolean) => {
    let vector = vectors.get(key);
    if (!vector) {
      vector = new Uint32Array(words);
      vectors.set(key, vector);
    }
    if (value) vector[row >> 5] |= 1 << (row & 31);
  };
  rows.forEach((inputs, row) => {
    const { snapshot } = runRow(circuit, spec, inputs);
    for (const node of circuit.nodes) {
      if (node.type === "lamp") continue;
      const outputs = snapshot.outputs[node.id];
      if (node.type === "module" && outputs)
        outputs.forEach((value, output) => {
          set(`${node.id}:${output}`, row, value);
        });
      else set(`${node.id}:0`, row, Boolean(snapshot.values[node.id]));
    }
  });
  return { vectors, rows: rows.length, words };
}

const sameVector = (a: Vector | undefined, b: Vector | undefined) =>
  Boolean(a && b && a.length === b.length && a.every((word, index) => word === b[index]));

function constantOf(vector: Vector, rows: number): boolean | undefined {
  let ones = 0;
  for (let row = 0; row < rows; row++) if ((vector[row >> 5] >>> (row & 31)) & 1) ones++;
  return ones === 0 ? false : ones === rows ? true : undefined;
}

const sourceKey = (circuit: Circuit, node: string, input: number) => {
  const wire = circuit.wires.find((item) => item.to === node && item.input === input);
  return wire ? `${wire.from}:${wire.output ?? 0}` : undefined;
};

/** Top-level nodes between `targets` and `sources`, or undefined if the cone reaches other inputs. */
function closedCone(
  circuit: Circuit,
  targets: string[],
  sources: Set<string>,
  locked: Set<string>,
) {
  const into = new Map<string, string[]>();
  for (const wire of circuit.wires)
    into.set(wire.to, [...(into.get(wire.to) ?? []), `${wire.from}:${wire.output ?? 0}`]);
  const cone = new Set<string>();
  const queue = [...targets];
  while (queue.length) {
    const key = queue.pop()!;
    if (sources.has(key)) continue;
    const [id] = key.split(":");
    if (locked.has(id)) return undefined;
    const node = circuit.nodes.find((item) => item.id === id);
    if (!node || node.type === "high" || node.type === "ground") continue;
    if (cone.has(id)) continue;
    cone.add(id);
    queue.push(...(into.get(id) ?? []));
  }
  return cone;
}

function* tuples(items: string[], size: number, ordered: boolean): Generator<string[]> {
  if (size === 0) {
    yield [];
    return;
  }
  for (let index = 0; index < items.length; index++) {
    const rest = ordered ? items.filter((_, other) => other !== index) : items.slice(index + 1);
    for (const tail of tuples(rest, size - 1, ordered)) yield [items[index], ...tail];
  }
}

/**
 * Groups of two or more placed parts whose outputs equal a known part's
 * outputs on the same inputs, e.g. four NAND gates that form an XOR.
 */
function findReplaceable(
  circuit: Circuit,
  spec: TruthSpec,
  locked: Set<string>,
  known: KnownPart[],
  vectors: Map<string, Vector>,
  rows: number,
  words: number,
): Note[] {
  const notes: Note[] = [];
  const claimed = new Set<string>();
  const used = feeding(
    circuit,
    spec.outputs.map((port) => port.id),
  );
  const nets = [...vectors.keys()].filter((key) => used.has(key.split(":")[0]));
  if (nets.length > 24) return notes;
  const byVector = new Map<string, string[]>();
  for (const key of nets) {
    const id = key.split(":")[0];
    if (locked.has(id)) continue;
    const k = vectorKey(vectors.get(key)!);
    byVector.set(k, [...(byVector.get(k) ?? []), key]);
  }
  const labelOf = (key: string) => {
    const node = circuit.nodes.find((item) => item.id === key.split(":")[0]);
    if (!node) return "a wire";
    return locked.has(node.id) ? (node.label ?? partName(node)) : `the ${partName(node)} output`;
  };
  for (const part of known) {
    if (part.inputs > 3 || part.outputs > 2) continue;
    const table = Array.from({ length: 2 ** part.inputs }, (_, row) =>
      part.fn(Array.from({ length: part.inputs }, (_, index) => Boolean((row >> index) & 1))),
    );
    const symmetric = table.every((outputs, row) => {
      if (part.inputs !== 2) return false;
      const swapped = ((row & 1) << 1) | ((row >> 1) & 1);
      return outputs.every((bit, index) => bit === table[swapped][index]);
    });
    for (const sources of tuples(nets, part.inputs, !symmetric)) {
      const outputs = Array.from({ length: part.outputs }, () => new Uint32Array(words));
      for (let row = 0; row < rows; row++) {
        let index = 0;
        sources.forEach((key, position) => {
          if ((vectors.get(key)![row >> 5] >>> (row & 31)) & 1) index |= 1 << position;
        });
        table[index].forEach((bit, output) => {
          if (bit) outputs[output][row >> 5] |= 1 << (row & 31);
        });
      }
      const targets = outputs.map((vector) => byVector.get(vectorKey(vector))?.[0]);
      if (targets.some((target) => !target)) continue;
      const targetIds = targets.map((target) => target!.split(":")[0]);
      if (targetIds.some((id) => circuit.nodes.find((node) => node.id === id)?.part === part.part))
        continue;
      const cone = closedCone(circuit, targets as string[], new Set(sources), locked);
      if (!cone || cone.size < 2 || [...cone].some((id) => claimed.has(id))) continue;
      for (const id of cone) claimed.add(id);
      const names = [...cone].map((id) => partName(circuit.nodes.find((node) => node.id === id)!));
      notes.push({
        tone: "tip",
        text: `These ${cone.size} parts (${summarise(names)}) compute ${part.label} of ${sources.map(labelOf).join(" and ")}. Your ${part.label} part does the same in one box.`,
        anchor: { kind: "node", id: targetIds[0] },
        nodes: [...cone],
      });
      if (notes.length >= 3) return notes;
    }
  }
  return notes;
}

const summarise = (names: string[]) => {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts].map(([name, count]) => `${count} ${name}`).join(", ");
};

/** Parts that do nothing: outputs no lamp sees, wires passed through, constants. */
function idleParts(
  circuit: Circuit,
  spec: TruthSpec | undefined,
  locked: Set<string>,
  outputs: string[],
  vectors: Map<string, Vector> | undefined,
  rows: number,
): Note[] {
  const notes: Note[] = [];
  const used = feeding(circuit, outputs);
  for (const node of circuit.nodes) {
    if (locked.has(node.id) || used.has(node.id)) continue;
    notes.push({
      tone: "warn",
      text: `This ${partName(node)} does nothing: its output reaches no lamp. Wire it in or take it off.`,
      anchor: { kind: "node", id: node.id },
      nodes: [node.id],
    });
  }
  if (!spec || !vectors) return notes;
  for (const node of circuit.nodes) {
    if (locked.has(node.id) || !used.has(node.id) || node.type === "module") continue;
    if (["high", "ground", "junction", "nmos", "pmos"].includes(node.type)) continue;
    const vector = vectors.get(`${node.id}:0`);
    if (!vector) continue;
    const constant = constantOf(vector, rows);
    if (constant !== undefined) {
      notes.push({
        tone: "tip",
        text: `This ${partName(node)} is ${constant ? "1" : "0"} in every row. ${constant ? "A HIGH" : "A GROUND"} source, or a different wiring, does the same.`,
        anchor: { kind: "node", id: node.id },
        nodes: [node.id],
      });
      continue;
    }
    const inputs = [0, 1]
      .map((input) => sourceKey(circuit, node.id, input))
      .filter(Boolean) as string[];
    const passed = inputs.find((key) => sameVector(vectors.get(key), vector));
    if (passed) {
      notes.push({
        tone: "tip",
        text: `This ${partName(node)} passes its input through unchanged. A plain wire does the same.`,
        anchor: { kind: "node", id: node.id },
        nodes: [node.id],
      });
    }
  }
  const seen = new Map<string, string>();
  for (const node of circuit.nodes) {
    if (locked.has(node.id) || !used.has(node.id) || node.type === "module") continue;
    const inputs = Array.from({ length: 2 }, (_, input) => sourceKey(circuit, node.id, input))
      .filter(Boolean)
      .sort()
      .join("|");
    const key = `${node.type}|${inputs}`;
    const twin = seen.get(key);
    if (twin && inputs) {
      notes.push({
        tone: "tip",
        text: `Two ${partName(node)} parts get the same inputs, so they give the same output. One is enough: wire its output to both places.`,
        anchor: { kind: "node", id: node.id },
        nodes: [twin, node.id],
      });
    } else seen.set(key, node.id);
  }
  return notes;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Notes for a circuit that passes: size and depth against the reference, and simpler wiring. */
export function feedback(
  source: Circuit,
  level: Level,
  locked: readonly string[],
  options: { reference?: Circuit; known?: KnownPart[] } = {},
): { stats: Stats; reference?: Stats; notes: Note[] } {
  const circuit = withoutWireSplices(source);
  const lockedIds = new Set(locked);
  const stats = circuitStats(circuit, locked);
  const reference = options.reference ? circuitStats(options.reference, locked) : undefined;
  const notes: Note[] = [];
  const spec = level.spec.kind === "truth" ? level.spec : undefined;
  const outputs = level.spec.kind === "custom" ? [] : level.spec.outputs.map((port) => port.id);
  const truth = spec && truthRows(spec).length <= 1024 ? vectorsFor(circuit, spec) : undefined;
  if (reference) {
    const transistorLevel = reference.transistors > 0;
    const mine = transistorLevel ? stats.transistors : stats.nands;
    const theirs = transistorLevel ? reference.transistors : reference.nands;
    const unit = transistorLevel ? "transistor" : "NAND gate";
    if (mine < theirs)
      notes.push({
        tone: "good",
        text: `Smaller than the reference: ${plural(mine, unit)} against ${theirs}.`,
      });
    else if (mine === theirs)
      notes.push({ tone: "good", text: `Same size as the reference: ${plural(mine, unit)}.` });
    else
      notes.push({
        tone: "tip",
        text: `The reference needs ${plural(theirs, unit)}; yours needs ${mine}. It can be built smaller.`,
      });
    if (stats.depth > reference.depth)
      notes.push({
        tone: "tip",
        text: `On its longest path a signal passes ${plural(stats.depth, "gate")}; in the reference, ${reference.depth}. Every gate in a row adds a delay.`,
      });
    for (const [part, count] of Object.entries(reference.usedParts)) {
      if (stats.usedParts[part]) continue;
      const known = options.known?.find((item) => item.part === part);
      notes.push({
        tone: "tip",
        text: `The reference uses ${count} ${known?.label ?? part} part${count === 1 ? "" : "s"}. Try yours here: one box per job keeps the wiring readable.`,
        anchor: { kind: "palette", part: `part:${part}` },
      });
    }
  }
  notes.push(...idleParts(circuit, spec, lockedIds, outputs, truth?.vectors, truth?.rows ?? 0));
  if (spec && truth && options.known?.length)
    notes.push(
      ...findReplaceable(
        circuit,
        spec,
        lockedIds,
        options.known,
        truth.vectors,
        truth.rows,
        truth.words,
      ),
    );
  return { stats, reference, notes };
}
