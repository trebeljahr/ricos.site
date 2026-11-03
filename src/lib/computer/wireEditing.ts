import {
  type Circuit,
  inputWidth,
  type Node,
  outputWidth,
  validateCircuit,
  type Wire,
} from "./logic";
import { nodeHeight, nodeWidth } from "./nodeGeometry";
import { closestPathPoint, pathPoints } from "./wireGeometry";
import { orientedWirePath, type Point, type PortSide } from "./wireRouting";

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

type PathHit = ReturnType<typeof closestPathPoint>;
const nodeCentre = (node: Node): Point => ({
  x: node.x + nodeWidth(node) / 2,
  y: node.y + nodeHeight(node) / 2,
});
/** The drawn route on either side of a hit, so a split never redraws what the reader sees. */
const splitRoute = ({ points, index, point }: PathHit) => ({
  before: [...points.slice(0, index), point],
  after: [point, ...points.slice(index)],
});
/** Leave a route square across it, toward the other end, instead of running along it. */
function sideToward({ points, index, point }: PathHit, toward: Point): PortSide {
  const a = points[index - 1],
    b = points[index];
  return Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)
    ? toward.y < point.y
      ? "top"
      : "bottom"
    : toward.x < point.x
      ? "left"
      : "right";
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
  const targetWire = circuit.wires.find((wire) => wire.id === second.wire);
  const sourceWire = isWire(first) ? circuit.wires.find((wire) => wire.id === first.wire) : null;
  const targetRoute = splitRoute(targetHit);
  const sourceRoute = sourceHit && splitRoute(sourceHit);
  const drives = (wire: Wire | null | undefined, driver: Driver) =>
    wire?.from === driver.from && (wire.output ?? 0) === driver.output;
  const link =
    sourceHit &&
    pathPoints(
      orientedWirePath(
        sourceHit.point,
        targetHit.point,
        sideToward(sourceHit, targetHit.point),
        sideToward(targetHit, sourceHit.point),
      ),
    )[0];
  const portSource = isWire(first) ? undefined : circuit.nodes.find((n) => n.id === first.node);
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
  // Only the wire dropped from a port is routed; it arrives across the wire it joins.
  if (portSource) join.inputSide = sideToward(targetHit, nodeCentre(portSource));
  const wires = circuit.wires.filter((wire) => !affected(wire));
  roots.forEach((driver, index) => {
    const toStart = index === 0 && start;
    const points = toStart
      ? drives(sourceWire, driver) && sourceRoute?.before
      : drives(targetWire, driver) && targetRoute.before;
    wires.push({
      id: crypto.randomUUID(),
      ...driver,
      to: toStart ? start.id : join.id,
      input: toStart ? 0 : index,
      ...(points ? { points } : {}),
    });
  });
  if (start)
    wires.push({
      id: crypto.randomUUID(),
      from: start.id,
      to: join.id,
      input: 0,
      points: link!,
    });
  leaves.forEach(({ points: _moved, ...wire }) => {
    // Every consumer now reads the join. Its old route began somewhere else,
    // except the two wires under the drop, which keep their drawn tails.
    const points =
      wire.id === targetWire?.id
        ? targetRoute.after
        : wire.id === sourceWire?.id && link && sourceRoute
          ? [...[...link].reverse(), ...sourceRoute.after.slice(1)]
          : undefined;
    wires.push({ ...wire, from: join.id, output: 0, ...(points ? { points } : {}) });
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
export function splitWire(
  circuit: Circuit,
  anchor: WireAnchor,
  id = () => crypto.randomUUID(),
  branchToward?: Point,
) {
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
    ...(branchToward ? { outputSide: sideToward(hit, branchToward) } : {}),
  };
  const { before, after } = splitRoute(hit);
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
  const split = splitWire(circuit, first, undefined, nodeCentre(target));
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
