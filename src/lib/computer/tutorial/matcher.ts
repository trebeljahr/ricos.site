// Lines the reader's circuit up with the level's reference solution: which of
// the reader's parts plays which reference part. Steps use the match to know
// when they are done, and "Show me" uses it to place the next part or wire.
import { type Circuit, type GateType, LABELS, type Node, type Wire } from "../logic";
import type { Source } from "./kit";
import type { HintAnchor, PaletteRef, PartId, TutorialContext, TutorialStep } from "./types";

const COMMUTATIVE = new Set<GateType>(["and", "or", "xor", "xnor", "nand", "nor", "junction"]);

/** What kind of part a node is, so a built-in NOT and a reader-built NOT count as the same. */
export function kindOf(node: Node, gateParts: ReadonlyMap<GateType, PartId>): string {
  if (node.type === "module")
    return node.part ? `part:${node.part}` : `module:${node.module?.name}`;
  const part = gateParts.get(node.type);
  return part ? `part:${part}` : node.type;
}

/** Reference node ids in the order a reader would build them: sources before their targets. */
export function buildOrder(reference: Circuit): Node[] {
  const sources = new Map<string, string[]>();
  for (const wire of reference.wires)
    sources.set(wire.to, [...(sources.get(wire.to) ?? []), wire.from]);
  const byId = new Map(reference.nodes.map((node) => [node.id, node]));
  const order: Node[] = [];
  const state = new Map<string, 1 | 2>();
  const visit = (id: string) => {
    if (state.has(id)) return;
    state.set(id, 1);
    for (const from of sources.get(id) ?? []) visit(from);
    state.set(id, 2);
    const node = byId.get(id);
    if (node) order.push(node);
  };
  // Lamps last, in port order, so the build follows the outputs.
  for (const node of reference.nodes) if (node.type !== "lamp") visit(node.id);
  for (const node of reference.nodes) if (node.type === "lamp") visit(node.id);
  return order;
}

const wiresInto = (circuit: Circuit, id: string) => circuit.wires.filter((wire) => wire.to === id);

/**
 * Maps reference node ids to reader node ids. Locked parts match by id. Each
 * other reference part takes the unmatched reader part of the same kind whose
 * input wires agree best with the reference; ties go to the part placed first.
 */
export function matchReference(
  reader: Circuit,
  reference: Circuit,
  locked: readonly string[],
  gateParts: ReadonlyMap<GateType, PartId>,
): Map<string, string> {
  const match = new Map<string, string>();
  const taken = new Set<string>();
  const readerIds = new Set(reader.nodes.map((node) => node.id));
  for (const id of locked)
    if (readerIds.has(id)) {
      match.set(id, id);
      taken.add(id);
    }
  for (const ref of buildOrder(reference)) {
    if (match.has(ref.id)) continue;
    const kind = kindOf(ref, gateParts);
    const candidates = reader.nodes.filter(
      (node) => !taken.has(node.id) && kindOf(node, gateParts) === kind,
    );
    if (!candidates.length) continue;
    const refWires = wiresInto(reference, ref.id);
    const score = (node: Node) => {
      const mine = wiresInto(reader, node.id);
      return refWires.filter((wire) => {
        const from = match.get(wire.from);
        return (
          from !== undefined &&
          mine.some(
            (item) =>
              item.from === from &&
              (item.output ?? 0) === (wire.output ?? 0) &&
              (item.input === wire.input || COMMUTATIVE.has(node.type)),
          )
        );
      }).length;
    };
    let best = candidates[0];
    let bestScore = score(best);
    for (const node of candidates.slice(1)) {
      const value = score(node);
      if (value > bestScore) {
        best = node;
        bestScore = value;
      }
    }
    match.set(ref.id, best.id);
    taken.add(best.id);
  }
  return match;
}

export type ShowAction =
  | { kind: "place"; ref: Node }
  | { kind: "wire"; ref: Wire; from: string; output: number; to: string; input: number };

/**
 * Which reference inputs of a target the reader has wired. A symmetric gate
 * counts its inputs either way round, so "A into both inputs" needs two wires.
 */
function satisfiedInputs(
  reader: Circuit,
  reference: Circuit,
  refTarget: string,
  match: ReadonlyMap<string, string>,
  target: Node | undefined,
): { satisfied: Set<number>; usedInputs: Set<number> } {
  const satisfied = new Set<number>();
  const usedInputs = new Set<number>();
  const to = match.get(refTarget);
  if (!to) return { satisfied, usedInputs };
  const key = (from: string | undefined, output: number | undefined) => `${from}:${output ?? 0}`;
  const wanted = wiresInto(reference, refTarget).map((wire) => ({
    input: wire.input,
    source: key(match.get(wire.from), wire.output),
  }));
  const have = new Map(
    wiresInto(reader, to).map((wire) => [wire.input, key(wire.from, wire.output)] as const),
  );
  for (const item of wanted)
    if (have.get(item.input) === item.source) {
      satisfied.add(item.input);
      usedInputs.add(item.input);
    }
  if (target && COMMUTATIVE.has(target.type))
    for (const item of wanted) {
      if (satisfied.has(item.input)) continue;
      const free = [...have].find(
        ([input, source]) => source === item.source && !usedInputs.has(input),
      );
      if (free) {
        satisfied.add(item.input);
        usedInputs.add(free[0]);
      }
    }
  return { satisfied, usedInputs };
}

/**
 * The next step toward the reference: the first reference part the reader has
 * not placed, or the first reference wire they lack, in build order.
 */
export function nextAction(
  reader: Circuit,
  reference: Circuit,
  match: ReadonlyMap<string, string>,
): ShowAction | undefined {
  const readerNodes = new Map(reader.nodes.map((node) => [node.id, node]));
  const deferred: Wire[] = [];
  const wireAction = (wire: Wire): ShowAction | undefined => {
    const target = readerNodes.get(match.get(wire.to) ?? "");
    const { satisfied, usedInputs } = satisfiedInputs(reader, reference, wire.to, match, target);
    if (satisfied.has(wire.input)) return undefined;
    let input = wire.input;
    if (target && COMMUTATIVE.has(target.type) && usedInputs.has(input)) {
      // A symmetric gate: put the wire in an input no correct wire is using.
      const free = [0, 1].find((index) => !usedInputs.has(index));
      if (free !== undefined) input = free;
    }
    return {
      kind: "wire",
      ref: wire,
      from: match.get(wire.from)!,
      output: wire.output ?? 0,
      to: match.get(wire.to)!,
      input,
    };
  };
  for (const ref of buildOrder(reference)) {
    if (!match.has(ref.id)) return { kind: "place", ref };
    for (const wire of wiresInto(reference, ref.id)) {
      if (!match.has(wire.from)) {
        deferred.push(wire);
        continue;
      }
      const action = wireAction(wire);
      if (action) return action;
    }
  }
  for (const wire of deferred) {
    if (!match.has(wire.from) || !match.has(wire.to)) continue;
    const action = wireAction(wire);
    if (action) return action;
  }
  return undefined;
}

/** The circuit with the action done; `makeNode` builds the part to place, with a fresh id. */
export function applyAction(
  reader: Circuit,
  action: ShowAction,
  makeNode: (ref: Node) => Node,
): Circuit {
  if (action.kind === "place") return { ...reader, nodes: [...reader.nodes, makeNode(action.ref)] };
  return {
    ...reader,
    wires: [
      ...reader.wires.filter((wire) => !(wire.to === action.to && wire.input === action.input)),
      {
        id: `${action.from}:${action.output}>${action.to}:${action.input}`,
        from: action.from,
        to: action.to,
        input: action.input,
        output: action.output,
      },
    ],
  };
}

const nodeName = (node: Node | undefined) =>
  !node
    ? "a part"
    : node.type === "module"
      ? node.label || node.module?.name || "part"
      : node.label || LABELS[node.type];

/** "Place a NAND gate." or "Wire A into NAND input 2.", for the status line. */
export function describeAction(action: ShowAction, reader: Circuit): string {
  if (action.kind === "place") return `Placed ${nodeName(action.ref)}.`;
  const from = reader.nodes.find((node) => node.id === action.from);
  const to = reader.nodes.find((node) => node.id === action.to);
  return `Wired ${nodeName(from)} into ${nodeName(to)}${to?.type === "lamp" ? "" : ` input ${action.input + 1}`}.`;
}

// ---------------------------------------------------------------- step helpers

const sourceParts = (source: Source): [string, number] =>
  typeof source === "string" ? [source, 0] : [source[0], source[1]];

/**
 * Whether the reader wired each of `wanted` (reference sources and the inputs
 * of reference `to` they go into). A symmetric gate takes them in any order.
 */
export function hasWires(
  context: TutorialContext,
  to: string,
  wanted: { from: Source; input: number }[],
): boolean {
  const target = context.match.get(to);
  if (!target) return false;
  const node = context.circuit.nodes.find((item) => item.id === target);
  const have = new Map(
    context.circuit.wires
      .filter((wire) => wire.to === target)
      .map((wire) => [wire.input, `${wire.from}:${wire.output ?? 0}`] as const),
  );
  const sourceKey = (from: Source) => {
    const [ref, output] = sourceParts(from);
    const reader = context.match.get(ref);
    return reader ? (`${reader}:${output}` as string) : undefined;
  };
  if (!node || !COMMUTATIVE.has(node.type))
    return wanted.every((item) => {
      const key = sourceKey(item.from);
      return key !== undefined && have.get(item.input) === key;
    });
  const pool: string[] = [...have.values()];
  return wanted.every((item) => {
    const key = sourceKey(item.from);
    const index = key === undefined ? -1 : pool.indexOf(key);
    if (index < 0) return false;
    pool.splice(index, 1);
    return true;
  });
}

/** Whether the reader wired reference `from` into input `input` of reference `to`. */
export const hasWire = (context: TutorialContext, from: Source, to: string, input = 0) =>
  hasWires(context, to, [{ from, input }]);

/** A step: place the reference part `ref`; the callout points at its palette entry. */
export const placeStep = (ref: string, palette: PaletteRef, text: string): TutorialStep => ({
  text,
  anchor: { kind: "palette", part: palette },
  done: (context) => context.match.has(ref),
});

const isTuple = (value: unknown): value is readonly [string, number] =>
  Array.isArray(value) &&
  value.length === 2 &&
  typeof value[0] === "string" &&
  typeof value[1] === "number";

/** A step: wire `from` into input `input` of `to` (reference ids). */
export const wireStep = (
  from: Source | Source[],
  to: string,
  input: number | number[],
  text: string,
): TutorialStep => {
  const sources: Source[] = typeof from === "string" || isTuple(from) ? [from] : (from as Source[]);
  const inputs = Array.isArray(input) ? input : [input];
  const wanted = inputs.map((index, position) => ({
    from: sources[position] ?? sources[0],
    input: index,
  }));
  return {
    text,
    anchor: (context): HintAnchor | undefined => {
      const target = context.match.get(to);
      if (!target) return undefined;
      const open = wanted.find((item) => !hasWires(context, to, [item]));
      return { kind: "input", node: target, index: open?.input ?? inputs[0] };
    },
    done: (context) => hasWires(context, to, wanted),
  };
};

/** A step: press Check. Done once every row passes. */
export const checkStep = (text: string): TutorialStep => ({
  text,
  anchor: { kind: "check" },
  done: (context) => context.passing,
});
