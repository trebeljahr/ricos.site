import {
  type Circuit,
  type Node,
  type Wire,
  inputWidth,
  outputWidth,
  validateCircuit,
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
  const newNode = (point: Point): Node => ({
    id: crypto.randomUUID(),
    type: width === 8 ? "bus" : "junction",
    splice: true,
    x: point.x - 5,
    y: point.y - 5,
  });
  const join = newNode(targetHit.point),
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
    if (isWire(first) && first.wire === second.wire)
      return { error: "Choose another wire or an input." };
    const roots = [
      ...new Map(
        [
          ...drivers(circuit, source.id, output),
          ...drivers(circuit, targetWire!.from, targetWire!.output),
        ].map((driver) => [key(driver), driver]),
      ).values(),
    ];
    const width = outputWidth(source, output);
    if (!roots.length || roots.length > (width === 8 ? 8 : 1))
      return {
        error:
          width === 8
            ? "This bus would exceed eight drivers. Use another bus part."
            : "Cannot join separate one-bit drivers. Use a gate to combine signals.",
      };
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
