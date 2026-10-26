import { type Circuit, type Snapshot, type WireColor, outputWidth } from "./logic";
import { wireNetKeys } from "./wireTopology";

export const SIGNAL_COLORS = {
  high: "#ffe078",
  low: "#bc6464",
  floating: "#7d8a92",
  conflict: "#ff5a52",
} as const;

export function wireSignal(
  snapshot: Snapshot,
  from: string,
  output = 0,
  width: 1 | 8 = 1,
): keyof typeof SIGNAL_COLORS {
  if (width === 8) {
    const value = snapshot.buses?.[from] ?? "Z";
    return value === "Z" ? "floating" : value === "X" ? "conflict" : value > 0 ? "high" : "low";
  }
  return (snapshot.outputs[from]?.[output] ?? snapshot.values[from]) ? "high" : "low";
}

/** One palette color for every segment of an electrical net, including junctions. */
export function wireNetColors(
  circuit: Circuit,
  nets: Record<string, string>,
  fallback: (from: string, output: number) => WireColor,
): Record<string, WireColor> {
  const nodes = new Map(circuit.nodes.map((node, index) => [node.id, { node, index }]));
  const isJoin = (id: string) =>
    nodes.get(id)?.node.type === "junction" || Boolean(nodes.get(id)?.node.splice);
  const ordered = [...circuit.wires].sort(
    (a, b) =>
      Number(!a.color) - Number(!b.color) ||
      Number(isJoin(a.from)) - Number(isJoin(b.from)) ||
      (nodes.get(a.from)?.index ?? 0) - (nodes.get(b.from)?.index ?? 0) ||
      (a.output ?? 0) - (b.output ?? 0) ||
      a.id.localeCompare(b.id),
  );
  const colors = new Map<string, WireColor>();
  const buses = new Set<string>();
  for (const wire of ordered) {
    const net = nets[wire.id],
      source = nodes.get(wire.from)?.node;
    if (!colors.has(net)) colors.set(net, wire.color ?? fallback(wire.from, wire.output ?? 0));
    if (source && outputWidth(source, wire.output) === 8) buses.add(net);
  }
  return Object.fromEntries(
    circuit.wires.map((wire) => {
      const color = colors.get(nets[wire.id])!;
      // Red is reserved for bus contention; apply that convention to the entire net.
      return [wire.id, color === "coral" && buses.has(nets[wire.id]) ? "blue" : color];
    }),
  );
}

export function recolorWireNets(
  circuit: Circuit,
  ids: readonly string[],
  color: WireColor,
): Circuit {
  const nets = wireNetKeys(circuit),
    selected = new Set(ids.map((id) => nets[id]));
  return {
    ...circuit,
    wires: circuit.wires.map((wire) => (selected.has(nets[wire.id]) ? { ...wire, color } : wire)),
  };
}
