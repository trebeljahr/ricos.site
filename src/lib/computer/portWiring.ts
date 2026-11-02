import {
  inputCount,
  inputLabel,
  inputWidth,
  LABELS,
  type Node,
  outputCount,
  outputLabel,
  outputWidth,
  type Wire,
} from "./logic";

export type PortKind = "input" | "output";
export type PortRef = { nodeId: string; kind: PortKind; index: number };
export type PortPoint = { x: number; y: number };
/** A port's place in a numbered run, e.g. A3 among A0–A7. `name` is what a reader calls it. */
export type PortSeries = { key: string; number: number; name: string };
/** `width` is 8 for a bus port, which only joins other bus ports. */
export type WiringPort = PortRef &
  PortPoint & { bank: string; label: string; width: 1 | 8; series?: PortSeries };
export type PortConnection = Pick<Wire, "from" | "to" | "input"> & { output: number };
export type PortPlan = {
  connections: PortConnection[];
  additions: PortConnection[];
  error?: string;
};
export const portKey = (port: PortRef) => JSON.stringify([port.nodeId, port.kind, port.index]);

/** Numbered operands stay separate; adjacent unnumbered ports form a general-purpose bank. */
export const portLabelBank = (label: string) => label.match(/^(.*?)[ _]?(\d+)$/)?.[1] ?? "";

/**
 * A part's own numbered ports run together, and so does a row of one-port parts labelled in order,
 * like switches A0–A7. "Input 2" on a gate only says which pin it is, so it runs with nothing.
 */
function portSeries(node: Node, kind: PortKind, label: string, count: number) {
  const [name, owner] =
    count === 1 && node.label ? [node.label, `row:${node.type}`] : [label, node.id];
  const number = name.match(/\d+$/)?.[0];
  if (number === undefined || /^(Input|Output) \d+$/.test(name)) return undefined;
  return { key: JSON.stringify([owner, kind, portLabelBank(name)]), number: Number(number), name };
}

export function wiringPorts<T extends Node>(
  nodes: T[],
  point: (node: T, index: number, kind: PortKind) => PortPoint,
): WiringPort[] {
  return nodes.flatMap((node) =>
    (["input", "output"] as const).flatMap((kind) => {
      let previous = "";
      let bankStart = 0;
      const count = kind === "input" ? inputCount(node) : outputCount(node);
      return Array.from({ length: count }, (_, index) => {
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
          width: kind === "input" ? inputWidth(node, index) : outputWidth(node, index),
          label: `${node.label || node.module?.name || LABELS[node.type]} ${label}`,
          series: portSeries(node, kind, label, count),
        };
      });
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
  const width = (nodeId: string, kind: PortKind, index: number) =>
    ports.find((port) => port.nodeId === nodeId && port.kind === kind && port.index === index)
      ?.width ?? 1;
  if (
    connections.some(
      (wire) => width(wire.from, "output", wire.output) !== width(wire.to, "input", wire.input),
    )
  )
    return fail("Bus ports carry 8 lanes and connect only to other bus ports.", connections);
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

/**
 * The wires that carry on from one finished wire along its numbered series: with A0 → OUT0 wired,
 * A1 → OUT1 and so on. An input something else already drives keeps its wire and is left out.
 */
export function planSeriesRest(
  wire: PortConnection,
  ports: WiringPort[],
  wires: Wire[],
): { connections: PortConnection[]; names: string } | null {
  const from = ports.find(
    (port) => port.kind === "output" && port.nodeId === wire.from && port.index === wire.output,
  )?.series;
  const to = ports.find(
    (port) => port.kind === "input" && port.nodeId === wire.to && port.index === wire.input,
  )?.series;
  const wired = wires.some(
    (item) =>
      item.from === wire.from &&
      (item.output ?? 0) === wire.output &&
      item.to === wire.to &&
      item.input === wire.input,
  );
  if (!from || !to || !wired) return null;
  const run = (kind: PortKind, key: string) => {
    const found = new Map<number, WiringPort | null>();
    for (const port of ports)
      if (port.kind === kind && port.series?.key === key)
        // Two parts with one number leave it unclear which the reader means.
        found.set(port.series.number, found.has(port.series.number) ? null : port);
    return [...found].sort(([a], [b]) => a - b).map(([, port]) => port);
  };
  const place = (run: (WiringPort | null)[], series: PortSeries) =>
    run.findIndex((port) => port?.series?.number === series.number);
  const sources = run("output", from.key);
  const inputs = run("input", to.key);
  // Places in a run line up, not numbers: bit 2 belongs with WEIGHT 4.
  const offset = place(inputs, to) - place(sources, from);
  if (place(inputs, to) < 0 || place(sources, from) < 0) return null;
  const rest = sources.flatMap((source, index) => {
    const target = inputs[index + offset];
    if (!source || !target) return [];
    return planPortConnections([source], target, ports, wires).additions.map((connection) => ({
      connection,
      name: target.series?.name,
    }));
  });
  if (!rest.length || wires.length + rest.length > 800) return null;
  const first = rest[0].name;
  const last = rest[rest.length - 1].name;
  return {
    connections: rest.map((item) => item.connection),
    names: first === last ? `${first}` : `${first}–${last}`,
  };
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
