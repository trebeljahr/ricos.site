import type { Circuit, Wire } from "./logic";

/** A read-only tutorial view: one-driver splices are wires, never reader-placed parts. */
export function withoutWireSplices(circuit: Circuit): Circuit {
  const inputs = new Map<string, Wire[]>();
  for (const wire of circuit.wires) inputs.set(wire.to, [...(inputs.get(wire.to) ?? []), wire]);
  const candidates = new Set(
    circuit.nodes
      .filter((node) => node.splice && inputs.get(node.id)?.length === 1)
      .map((node) => node.id),
  );
  const aliases = new Map<string, { from: string; output: number }>();
  const source = (
    from: string,
    output = 0,
    seen = new Set<string>(),
  ): { from: string; output: number } | null => {
    if (!candidates.has(from)) return { from, output };
    if (seen.has(from)) return null;
    seen.add(from);
    const wire = inputs.get(from)![0];
    return source(wire.from, wire.output, seen);
  };
  for (const id of candidates) {
    const driver = source(id);
    if (driver) aliases.set(id, driver);
  }
  let changed = aliases.size > 0;
  const nodes = circuit.nodes
    .filter((node) => !aliases.has(node.id))
    .map((node) => {
      if (!node.module) return node;
      const module = withoutWireSplices(node.module);
      if (module === node.module) return node;
      changed = true;
      return { ...node, module };
    });
  if (!changed) return circuit;
  return {
    ...circuit,
    nodes,
    wires: circuit.wires
      .filter((wire) => !aliases.has(wire.to))
      .map((wire) => {
        const driver = aliases.get(wire.from);
        return driver ? { ...wire, ...driver, points: undefined } : wire;
      }),
    groups: circuit.groups
      ?.map((group) => ({
        ...group,
        nodeIds: group.nodeIds.filter((id) => !aliases.has(id)),
        activeWhen: group.activeWhen
          ? (aliases.get(group.activeWhen)?.from ?? group.activeWhen)
          : undefined,
      }))
      .filter((group) => group.nodeIds.length),
  };
}
