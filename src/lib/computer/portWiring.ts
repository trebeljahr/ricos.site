import {
  inputCount,
  inputLabel,
  LABELS,
  type Node,
  outputCount,
  outputLabel,
  type Wire,
} from "./logic";

export type PortKind = "input" | "output";
export type PortRef = { nodeId: string; kind: PortKind; index: number };
export type PortPoint = { x: number; y: number };
export type WiringPort = PortRef & PortPoint & { bank: string; label: string };
export type PortConnection = Pick<Wire, "from" | "to" | "input"> & { output: number };
export type PortPlan = {
  connections: PortConnection[];
  additions: PortConnection[];
  error?: string;
};
export const portKey = (port: PortRef) => JSON.stringify([port.nodeId, port.kind, port.index]);

/** Numbered operands stay separate; adjacent unnumbered ports form a general-purpose bank. */
export const portLabelBank = (label: string) => label.match(/^(.*?)[ _]?(\d+)$/)?.[1] ?? "";

export function wiringPorts<T extends Node>(
  nodes: T[],
  point: (node: T, index: number, kind: PortKind) => PortPoint,
): WiringPort[] {
  return nodes.flatMap((node) =>
    (["input", "output"] as const).flatMap((kind) => {
      let previous = "";
      let bankStart = 0;
      return Array.from(
        { length: kind === "input" ? inputCount(node) : outputCount(node) },
        (_, index) => {
          const label = kind === "input" ? inputLabel(node, index) : outputLabel(node, index);
          const group = portLabelBank(label);
          if (group !== previous) bankStart = index;
          previous = group;
          return {
            nodeId: node.id,
            kind,
            index,
            ...point(node, index, kind),
            bank: JSON.stringify([node.id, kind, bankStart]),
            label: `${node.label || node.module?.name || LABELS[node.type]} ${label}`,
          };
        },
      );
    }),
  );
}

export function planPortConnections(
  selection: PortRef[],
  target: WiringPort,
  ports: WiringPort[],
  wires: Wire[],
): PortPlan {
  const wanted = new Set(selection.map(portKey));
  // Descriptor order is logical port order; screen position and selection order never change it.
  const selected = ports.filter((port) => wanted.has(portKey(port)));
  const fail = (error: string, connections: PortConnection[] = []): PortPlan => ({
    connections,
    additions: [],
    error,
  });
  if (!selected.length || selected.length !== wanted.size)
    return fail("Some selected ports no longer exist.");
  const kind = selected[0].kind;
  if (selected.some((port) => port.kind !== kind) || target.kind === kind)
    return fail("Connect outputs to inputs.");
  const bank = ports.filter((port) => port.kind === target.kind && port.bank === target.bank);
  const targetIndex = bank.findIndex((port) => portKey(port) === portKey(target));
  if (targetIndex < 0) return fail("Choose a destination port.");
  const fanOut = kind === "input" && bank.length === 1;
  if (!fanOut && bank.length < selected.length)
    return fail(
      `${selected.length} selected ports need ${selected.length} destination ports; this bank has ${bank.length}.`,
    );
  const start = Math.min(targetIndex, bank.length - selected.length);
  const connections = selected.map((port, index) => {
    const other = fanOut ? target : bank[start + index];
    const from = kind === "output" ? port : other;
    const to = kind === "input" ? port : other;
    return { from: from.nodeId, output: from.index, to: to.nodeId, input: to.index };
  });
  if (connections.some((wire) => wire.from === wire.to))
    return fail("A part cannot wire to itself.", connections);
  if (
    connections.some((connection) =>
      wires.some(
        (wire) =>
          wire.to === connection.to &&
          wire.input === connection.input &&
          (wire.from !== connection.from || (wire.output ?? 0) !== connection.output),
      ),
    )
  )
    return fail(
      "An input is already wired. Choose a free range; existing wires stay connected.",
      connections,
    );
  const additions = connections.filter(
    (connection) =>
      !wires.some(
        (wire) =>
          wire.from === connection.from &&
          (wire.output ?? 0) === connection.output &&
          wire.to === connection.to &&
          wire.input === connection.input,
      ),
  );
  if (wires.length + additions.length > 800)
    return fail("This circuit can hold up to 800 wires.", connections);
  return { connections, additions };
}

export function distanceToSegment(point: PortPoint, start: PortPoint, end: PortPoint) {
  const dx = end.x - start.x,
    dy = end.y - start.y;
  const length = dx * dx + dy * dy;
  const t = length
    ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / length))
    : 0;
  return Math.hypot(point.x - start.x - t * dx, point.y - start.y - t * dy);
}
