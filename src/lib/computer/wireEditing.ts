import {
  type Circuit,
  inputWidth,
  type Node,
  outputWidth,
  validateCircuit,
  type Wire,
} from "./logic";
import { closestPathPoint } from "./wireGeometry";
import { type Point, wirePath } from "./wireRouting";

export type WireAnchor = { wire: string; point: Point; path: string };
export type PortAnchor = { node: string; port: number; kind: "input" | "output" };
export type WireEnd = WireAnchor | PortAnchor;
const isWire = (end: WireEnd): end is WireAnchor => "wire" in end;

type Driver = { from: string; output: number };
function drivers(circuit: Circuit, from: string, output = 0, seen = new Set<string>()): Driver[] {
  if (seen.has(from)) return [];
  const node = circuit.nodes.find((node) => node.id === from);
  if (!node?.splice) return [{ from, output }];
  seen.add(from);
  return circuit.wires
    .filter((wire) => wire.to === from)
    .flatMap((wire) => drivers(circuit, wire.from, wire.output, seen));
}
const key = (driver: Driver) => `${driver.from}:${driver.output}`;
function transistorBranch(circuit: Circuit, id: string, seen = new Set<string>()): boolean {
  if (seen.has(id)) return false;
  const node = circuit.nodes.find((node) => node.id === id);
  if (!node) return false;
  if (node.type === "nmos" || node.type === "pmos") return true;
  if (node.type !== "junction" || node.splice) return false;
  const branches = circuit.wires.filter((wire) => wire.to === id);
  return (
    branches.length === 2 &&
    branches.every((wire) => transistorBranch(circuit, wire.from, new Set(seen).add(id)))
  );
}
const isTransistorJoin = (circuit: Circuit, roots: Driver[]) =>
  roots.length === 2 && roots.every((root) => transistorBranch(circuit, root.from));

/** Validate a wire drop without splitting routes or allocating new circuit IDs. */
export function wireJoinError(
  circuit: Circuit,
  first: WireEnd,
  second: WireAnchor,
): string | undefined {
  const sourceWire = isWire(first)
    ? circuit.wires.find((wire) => wire.id === first.wire)
    : undefined;
  const targetWire = circuit.wires.find((wire) => wire.id === second.wire);
  if (!isWire(first) && first.kind === "input") {
    const source = circuit.nodes.find((node) => node.id === targetWire?.from);
    const target = circuit.nodes.find((node) => node.id === first.node);
    if (!source || !target || !targetWire) return "Wire is no longer available.";
    if (outputWidth(source, targetWire.output) !== inputWidth(target, first.port))
      return "Cannot join a single bit and an 8-lane bus.";
    if (circuit.wires.some((wire) => wire.to === first.node && wire.input === first.port))
      return "This input already has a driver. Remove its wire before connecting another.";
    return;
  }
  const source = circuit.nodes.find(
    (node) => node.id === (isWire(first) ? sourceWire?.from : first.node),
  );
  const target = circuit.nodes.find((node) => node.id === targetWire?.to);
  if (!source || !target || !targetWire) return "Wire is no longer available.";
  const output = isWire(first) ? (sourceWire?.output ?? 0) : first.port;
  if (outputWidth(source, output) !== inputWidth(target, targetWire.input))
    return "Cannot join a single bit and an 8-lane bus.";
  if (isWire(first) && first.wire === second.wire) return "Choose another wire or an input.";
  const roots = [
    ...new Map(
      [
        ...drivers(circuit, source.id, output),
        ...drivers(circuit, targetWire.from, targetWire.output),
      ].map((driver) => [key(driver), driver]),
    ).values(),
  ];
  const width = outputWidth(source, output);
  if (width === 1 && isTransistorJoin(circuit, roots)) return;
  if (!roots.length || roots.length > (width === 8 ? 8 : 1))
    return width === 8
      ? "This bus would exceed eight drivers. Use another bus part."
      : "Cannot join separate one-bit drivers. Use a gate to combine signals.";
}

/** Merge complete splice nets, so every fan-out consumer reads the resolved value. */
function joinNets(
  circuit: Circuit,
  first: WireEnd,
  second: WireAnchor,
  roots: Driver[],
  width: 1 | 8,
): Circuit | null {
  const rootKeys = new Set(roots.map(key));
  const splices = new Set(
    circuit.nodes
      .filter(
        (node) =>
          node.splice && drivers(circuit, node.id).some((driver) => rootKeys.has(key(driver))),
      )
      .map((node) => node.id),
  );
  const affected = (wire: Wire) =>
    splices.has(wire.from) ||
    splices.has(wire.to) ||
    rootKeys.has(key({ from: wire.from, output: wire.output ?? 0 }));
  const leaves = circuit.wires.filter((wire) => affected(wire) && !splices.has(wire.to));
  const targetHit = closestPathPoint(second.path, second.point);
  const sourceHit = isWire(first) ? closestPathPoint(first.path, first.point) : null;
  const newNode = (point: Point, splice = true): Node => ({
    id: crypto.randomUUID(),
    type: width === 8 ? "bus" : "junction",
    splice: splice ? true : undefined,
    x: point.x - 5,
    y: point.y - 5,
  });
  // Transistor branches use the existing directed two-input
  // electrical junction. It remains distinct from a one-driver wire splice.
  const join = newNode(targetHit.point, !(width === 1 && isTransistorJoin(circuit, roots))),
    start = sourceHit ? newNode(sourceHit.point) : null;
  const wires = circuit.wires.filter((wire) => !affected(wire));
  roots.forEach((driver, index) => {
    wires.push({
      id: crypto.randomUUID(),
      ...driver,
      to: index === 0 && start ? start.id : join.id,
      input: index === 0 && start ? 0 : index,
    });
  });
  if (start)
    wires.push({
      id: crypto.randomUUID(),
      from: start.id,
      to: join.id,
      input: 0,
      points: closestPathPoint(wirePath(sourceHit!.point, targetHit.point), sourceHit!.point)
        .points,
    });
  leaves.forEach((wire) => {
    wires.push({ ...wire, from: join.id, output: 0 });
  });
  const next: Circuit = {
    ...circuit,
    nodes: [
      ...circuit.nodes.filter((node) => !splices.has(node.id)),
      ...(start ? [start] : []),
      join,
    ],
    wires,
    groups: circuit.groups
      ?.map((group) => ({
        ...group,
        nodeIds: group.nodeIds.filter((id) => !splices.has(id)),
        activeWhen:
          group.activeWhen && splices.has(group.activeWhen) ? undefined : group.activeWhen,
      }))
      .filter((group) => group.nodeIds.length),
  };
  return validateCircuit(next) ? next : null;
}

/** Split exactly the route under the pointer; no topology change until a drop succeeds. */
export function splitWire(circuit: Circuit, anchor: WireAnchor, id = () => crypto.randomUUID()) {
  const wire = circuit.wires.find((wire) => wire.id === anchor.wire);
  if (!wire) return null;
  const hit = closestPathPoint(anchor.path, anchor.point);
  if (!hit.points.length) return null;
  for (const endpoint of [wire.from, wire.to]) {
    const node = circuit.nodes.find((node) => node.id === endpoint);
    if (node?.splice && Math.hypot(node.x + 5 - hit.point.x, node.y + 5 - hit.point.y) < 8)
      return { circuit, node };
  }
  const source = circuit.nodes.find((node) => node.id === wire.from)!;
  const node: Node = {
    id: id(),
    type: outputWidth(source, wire.output) === 8 ? "bus" : "junction",
    splice: true,
    x: hit.point.x - 5,
    y: hit.point.y - 5,
  };
  const before = [...hit.points.slice(0, hit.index), hit.point];
  const after = [hit.point, ...hit.points.slice(hit.index)];
  const tail: Wire = { ...wire, id: id(), from: node.id, output: 0, points: after };
  return {
    node,
    circuit: {
      ...circuit,
      nodes: [...circuit.nodes, node],
      wires: [
        ...circuit.wires.filter((item) => item.id !== wire.id),
        { ...wire, to: node.id, input: 0, points: before },
        tail,
      ],
    },
  };
}

export function connectWireEnds(
  circuit: Circuit,
  sourceEnd: WireEnd,
  targetEnd: WireEnd,
): { circuit?: Circuit; error?: string } {
  let first = sourceEnd,
    second = targetEnd;
  if (!isWire(first) && !isWire(second)) return { error: "Choose a wire to branch or join." };
  if (!isWire(first) && first.kind === "input") [first, second] = [second, first];
  if (isWire(first) && !isWire(second) && second.kind === "output")
    [first, second] = [second, first];
  const sourceWire = isWire(first)
    ? circuit.wires.find((wire) => wire.id === first.wire)
    : undefined;
  const targetWire = isWire(second)
    ? circuit.wires.find((wire) => wire.id === second.wire)
    : undefined;
  const from = isWire(first) ? sourceWire?.from : first.node;
  const output = isWire(first) ? (sourceWire?.output ?? 0) : first.port;
  const to = isWire(second) ? targetWire?.to : second.node;
  const input = isWire(second) ? (targetWire?.input ?? 0) : second.port;
  const source = circuit.nodes.find((node) => node.id === from),
    target = circuit.nodes.find((node) => node.id === to);
  if (!source || !target) return { error: "Wire is no longer available." };
  if (outputWidth(source, output) !== inputWidth(target, input))
    return { error: "Cannot join a single bit and an 8-lane bus." };
  if (isWire(second)) {
    const error = wireJoinError(circuit, first, second);
    if (error) return { error };
    const roots = [
      ...new Map(
        [
          ...drivers(circuit, source.id, output),
          ...drivers(circuit, targetWire!.from, targetWire!.output),
        ].map((driver) => [key(driver), driver]),
      ).values(),
    ];
    const width = outputWidth(source, output);
    const next = joinNets(circuit, first, second, roots, width);
    return next ? { circuit: next } : { error: "Circuit size or parser limit reached." };
  }
  const occupied = circuit.wires.find((wire) => wire.to === to && wire.input === input);
  if (occupied)
    return { error: "This input already has a driver. Remove its wire before connecting another." };
  if (!isWire(first)) return { error: "Choose a wire to branch." };
  const split = splitWire(circuit, first);
  if (!split) return { error: "Could not find the wire under the pointer." };
  const next = {
    ...split.circuit,
    wires: [
      ...split.circuit.wires,
      {
        id: crypto.randomUUID(),
        from: split.node.id,
        output: 0,
        to: target.id,
        input,
        color: sourceWire?.color,
      },
    ],
  };
  return validateCircuit(next)
    ? { circuit: next }
    : { error: "Circuit size or parser limit reached." };
}
