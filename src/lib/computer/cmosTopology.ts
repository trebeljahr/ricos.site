import type { Circuit, Node } from "./logic";
import { isMosfet } from "./transistorGeometry";

/** Find presentation stages, stopping at an earlier stage's output or an input.
 * A pass-transistor source can be a signal; it need not lead to a fixed rail.
 */
export function cmosTopology(circuit: Circuit) {
  const byId = new Map(circuit.nodes.map((node) => [node.id, node]));
  const incoming = (id: string) => circuit.wires.filter((wire) => wire.to === id);
  const kinds = (id: string, seen = new Set<string>()): Set<string> => {
    if (seen.has(id)) return new Set();
    const next = new Set(seen).add(id);
    const node = byId.get(id);
    if (!node) return new Set();
    if (isMosfet(node)) return new Set([node.type]);
    if (node.type !== "junction") return new Set();
    return new Set(incoming(id).flatMap((wire) => [...kinds(wire.from, next)]));
  };
  const stages = circuit.nodes.filter(
    (node) => node.type === "junction" && kinds(node.id).size === 2,
  );
  const branch = (id: string, seen = new Set<string>()): Node[] => {
    if (seen.has(id)) return [];
    seen.add(id);
    const node = byId.get(id)!;
    if (!isMosfet(node) && node.type !== "junction") return [];
    return [
      node,
      ...incoming(id)
        .filter(
          (wire) =>
            node.type === "junction" ||
            (wire.input === 1 && kinds(wire.from).size === 1 && kinds(wire.from).has(node.type)),
        )
        .flatMap((wire) => branch(wire.from, seen)),
    ];
  };
  return { byId, incoming, kinds, stages, branch };
}
