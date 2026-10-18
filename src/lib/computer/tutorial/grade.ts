// Checks a reader's circuit against a level's spec: every row of a truth table,
// or a sequence of ticks for circuits that store bits. A check first looks for
// wiring that cannot be graded yet and names it, with the part or port to
// point at.
import {
  type Circuit,
  type GateType,
  initialSnapshot,
  inputCount,
  outputCount,
  LABELS,
  type Node,
  type Snapshot,
  step,
} from "../logic";
import { withoutWireSplices } from "../wireTopology";
import { allRows } from "./kit";
import type {
  CustomGrade,
  HintAnchor,
  Level,
  LevelPort,
  PartId,
  SequenceSpec,
  TruthSpec,
} from "./types";

/** What a level lets on the board besides its locked parts. */
export type Allowed = {
  gates: ReadonlySet<GateType>;
  parts: ReadonlySet<PartId>;
  verifyPart?: (node: Node) => boolean;
};

/** A problem in plain words, and where to point at it. */
export type Problem = { text: string; anchor?: HintAnchor };

export type RowResult = {
  inputs: boolean[];
  expected: boolean[];
  actual: boolean[];
  pass: boolean;
  /** The circuit kept changing instead of settling for this row. */
  unstable: boolean;
};

export type TickResult = {
  index: number;
  note: string;
  inputs: Record<string, boolean>;
  clock: boolean;
  expected: Record<string, boolean>;
  actual: Record<string, boolean>;
  pass: boolean;
};

export type Grade =
  | { kind: "structure"; problems: Problem[] }
  | { kind: "truth"; pass: boolean; rows: RowResult[]; first: number }
  | { kind: "sequence"; pass: boolean; ticks: TickResult[]; first: number }
  | { kind: "custom"; pass: boolean; result: CustomGrade };

export const partName = (node: Node) =>
  node.type === "module" ? node.label || node.module?.name || "part" : LABELS[node.type];

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Ids of the nodes whose outputs reach one of `targets`, the targets included. */
export function feeding(circuit: Circuit, targets: readonly string[]): Set<string> {
  const into = new Map<string, string[]>();
  for (const wire of circuit.wires) into.set(wire.to, [...(into.get(wire.to) ?? []), wire.from]);
  const reached = new Set<string>();
  const queue = [...targets];
  while (queue.length) {
    const id = queue.pop()!;
    if (reached.has(id)) continue;
    reached.add(id);
    queue.push(...(into.get(id) ?? []));
  }
  return reached;
}

/** A node on a wire loop among `parts`, or undefined when there is none. */
export function loopNode(circuit: Circuit, parts: ReadonlySet<string>): string | undefined {
  const next = new Map<string, string[]>();
  for (const wire of circuit.wires)
    if (parts.has(wire.from) && parts.has(wire.to))
      next.set(wire.from, [...(next.get(wire.from) ?? []), wire.to]);
  const state = new Map<string, 1 | 2>();
  let found: string | undefined;
  const visit = (id: string): boolean => {
    if (state.get(id) === 1) {
      found = id;
      return true;
    }
    if (state.get(id) === 2) return false;
    state.set(id, 1);
    for (const to of next.get(id) ?? []) if (visit(to)) return true;
    state.set(id, 2);
    return false;
  };
  for (const id of parts) if (visit(id)) return found;
  return undefined;
}

const isAllowed = (node: Node, allowed: Allowed) =>
  node.type === "module"
    ? Boolean(
        node.part &&
          node.module &&
          allowed.parts.has(node.part) &&
          (!allowed.verifyPart || allowed.verifyPart(node)),
      )
    : allowed.gates.has(node.type);

/** Why the circuit cannot be checked yet, with anchors; empty when it can. */
export function structureProblems(
  source: Circuit,
  level: Level,
  locked: readonly string[],
  allowed: Allowed,
): Problem[] {
  const circuit = withoutWireSplices(source);
  const spec = level.spec;
  const problems: Problem[] = [];
  const byId = new Map(circuit.nodes.map((node) => [node.id, node]));
  const lockedIds = new Set(locked);
  const banned = circuit.nodes.filter(
    (node) => !node.splice && !lockedIds.has(node.id) && !isAllowed(node, allowed),
  );
  if (banned.length) {
    const names = [...new Set(banned.map(partName))].join(", ");
    problems.push({
      text: `This level does not use ${names}. Take ${banned.length === 1 ? "it" : "them"} off the board.`,
      anchor: { kind: "node", id: banned[0].id },
    });
  }
  for (const wire of circuit.wires) {
    const from = byId.get(wire.from),
      to = byId.get(wire.to);
    if (
      !from ||
      !to ||
      wire.input < 0 ||
      wire.input >= inputCount(to) ||
      (wire.output ?? 0) < 0 ||
      (wire.output ?? 0) >= outputCount(from)
    )
      problems.push({ text: "A wire refers to a missing part or an invalid port." });
  }
  const targets = new Set<string>();
  for (const wire of circuit.wires) {
    const key = `${wire.to}:${wire.input}`;
    if (targets.has(key))
      problems.push({
        text: "An input has multiple drivers. Use a junction where the model supports combined paths.",
      });
    targets.add(key);
  }
  if (spec.kind === "custom")
    return [...problems, ...(level.rules?.(circuit) ?? []).map((text) => ({ text }))];
  for (const port of [...spec.inputs, ...spec.outputs]) {
    const node = byId.get(port.id);
    if (
      !node ||
      (spec.outputs.includes(port)
        ? node.type !== "lamp"
        : !["switch", "clock", "pulse"].includes(node.type))
    )
      problems.push({ text: `The designated ${port.label} port is missing or changed.` });
  }
  for (const port of spec.outputs) {
    if (!circuit.wires.some((wire) => wire.to === port.id))
      problems.push({
        text: `Nothing drives ${port.label} yet. Which signal should determine this output?`,
        anchor: { kind: "input", node: port.id, index: 0 },
      });
  }
  const used = feeding(
    circuit,
    spec.outputs.map((port) => port.id),
  );
  for (const id of used) {
    const node = byId.get(id);
    if (!node || lockedIds.has(id)) continue;
    const wired = new Set(circuit.wires.filter((wire) => wire.to === id).map((wire) => wire.input));
    if (node.splice && node.type === "bus" && wired.size) continue;
    for (let input = 0; input < inputCount(node); input++) {
      if (wired.has(input)) continue;
      const empty = Array.from({ length: inputCount(node) }, (_, index) => index).filter(
        (index) => !wired.has(index),
      ).length;
      problems.push({
        text: `This ${partName(node)} has ${plural(empty, "empty input")}. Every part that feeds a lamp needs a wire in each input.`,
        anchor: { kind: "input", node: id, index: input },
      });
      break;
    }
  }
  if (spec.kind === "truth") {
    const loop = loopNode(circuit, used);
    if (loop)
      problems.push({
        text: "A wire runs from a part's output back into its own inputs. This truth-table exercise requires a settling combinational circuit.",
        anchor: { kind: "node", id: loop },
      });
  }
  for (const text of level.rules?.(circuit) ?? []) problems.push({ text });
  return problems;
}

const lampValue = (snapshot: Snapshot, id: string) => Boolean(snapshot.values[id]);

/** Runs one input row through the circuit and reads the lamps. */
export function runRow(
  circuit: Circuit,
  spec: Pick<TruthSpec, "inputs" | "outputs">,
  inputs: readonly boolean[],
): { actual: boolean[]; snapshot: Snapshot } {
  const overrides = Object.fromEntries(spec.inputs.map((port, index) => [port.id, inputs[index]]));
  const snapshot = step(circuit, initialSnapshot(), false, {}, overrides);
  return { actual: spec.outputs.map((port) => lampValue(snapshot, port.id)), snapshot };
}

/** The rows a truth level checks. */
export const truthRows = (spec: TruthSpec) => spec.rows ?? allRows(spec.inputs.length);

export function gradeTruth(circuit: Circuit, spec: TruthSpec): Extract<Grade, { kind: "truth" }> {
  const rows = truthRows(spec).map((inputs): RowResult => {
    const expected = spec.fn(inputs);
    const { actual, snapshot } = runRow(circuit, spec, inputs);
    return {
      inputs,
      expected,
      actual,
      unstable: snapshot.unstable,
      pass: !snapshot.unstable && actual.every((bit, index) => bit === expected[index]),
    };
  });
  const first = rows.findIndex((row) => !row.pass);
  return { kind: "truth", pass: first < 0, rows, first };
}

/** Runs a sequence of ticks: set inputs and the clock, settle, read the lamps. */
export function runSequence(
  circuit: Circuit,
  spec: SequenceSpec,
): { ticks: TickResult[]; snapshots: Snapshot[] } {
  const inputs: Record<string, boolean> = Object.fromEntries(
    spec.inputs.filter((port) => !port.clock).map((port) => [port.id, false]),
  );
  const clockIds = spec.inputs.filter((port) => port.clock).map((port) => port.id);
  let clock = false;
  let snapshot = initialSnapshot();
  const ticks: TickResult[] = [];
  const snapshots: Snapshot[] = [];
  spec.ticks.forEach((tick, index) => {
    Object.assign(inputs, tick.set);
    if (tick.clock !== undefined) clock = tick.clock;
    const overrides = { ...inputs, ...Object.fromEntries(clockIds.map((id) => [id, clock])) };
    snapshot = step(circuit, snapshot, clock, {}, overrides);
    snapshots.push(snapshot);
    const expected = tick.expect ?? {};
    const actual = Object.fromEntries(
      spec.outputs.map((port) => [port.id, lampValue(snapshot, port.id)]),
    );
    ticks.push({
      index,
      note: tick.note,
      inputs: { ...inputs },
      clock,
      expected,
      actual,
      pass:
        !snapshot.unstable && Object.entries(expected).every(([id, value]) => actual[id] === value),
    });
  });
  return { ticks, snapshots };
}

export function gradeSequence(
  circuit: Circuit,
  spec: SequenceSpec,
): Extract<Grade, { kind: "sequence" }> {
  const { ticks } = runSequence(circuit, spec);
  const first = ticks.findIndex((tick) => !tick.pass);
  return { kind: "sequence", pass: first < 0, ticks, first };
}

/** Checks the circuit: structure first, then every row or tick. */
export function gradeLevel(
  circuit: Circuit,
  level: Level,
  locked: readonly string[],
  allowed: Allowed,
): Grade {
  const problems = structureProblems(circuit, level, locked, allowed);
  if (problems.length) return { kind: "structure", problems };
  const spec = level.spec;
  if (spec.kind === "truth") return gradeTruth(circuit, spec);
  if (spec.kind === "sequence") return gradeSequence(circuit, spec);
  const result = spec.grade(circuit);
  return { kind: "custom", pass: result.pass, result };
}

export const gradePassed = (grade: Grade) => grade.kind !== "structure" && grade.pass;

const bit = (value: boolean) => (value ? "1" : "0");

/** "A=1, B=0": the inputs of a row. */
export const describeInputs = (ports: readonly LevelPort[], inputs: readonly boolean[]) =>
  ports.map((port, index) => `${port.short ?? port.label}=${bit(inputs[index])}`).join(", ");

/** One sentence per wrong output of a row: what it should be and what it is. */
export function describeMiss(ports: readonly LevelPort[], row: RowResult): string {
  if (row.unstable) return "The circuit keeps changing and never settles for this row.";
  return ports
    .flatMap((port, index) =>
      row.actual[index] === row.expected[index]
        ? []
        : [
            `${port.label} should be ${bit(row.expected[index])}, yours is ${bit(row.actual[index])}.`,
          ],
    )
    .join(" ");
}

/** One sentence for a failed tick. */
export function describeTick(ports: readonly LevelPort[], tick: TickResult): string {
  const wrong = ports.filter(
    (port) => port.id in tick.expected && tick.expected[port.id] !== tick.actual[port.id],
  );
  if (!wrong.length) return "The circuit keeps changing and never settles on this tick.";
  return wrong
    .map(
      (port) =>
        `${port.label} should be ${bit(tick.expected[port.id])}, yours is ${bit(tick.actual[port.id])}.`,
    )
    .join(" ");
}

/** Node types and wires without positions or switch settings: what a check depends on. */
export function wiringKey(circuit: Circuit): string {
  const nodes = circuit.nodes
    .map(
      (node) =>
        `${node.id}:${node.type}:${node.resettable ? "reset" : ""}:${node.splice ? "splice" : ""}:${node.part ?? ""}:${node.module ? wiringKey(node.module) : ""}`,
    )
    .sort();
  const wires = circuit.wires
    .map((wire) => `${wire.from}:${wire.output ?? 0}>${wire.to}:${wire.input}`)
    .sort();
  return `${nodes.join(",")}|${wires.join(",")}`;
}
