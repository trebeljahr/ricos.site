import {
  type Circuit,
  type Wire,
  activeBlock,
  validateCircuit,
  moduleInputs,
  moduleOutputs,
} from "./logic";
import { nodeHeight, nodeWidth } from "./nodeGeometry";

export const CIRCUIT_CLIPBOARD_LIMIT = 2_000_000;
export type CircuitClip = {
  kind: "ricos-circuit";
  version: 1;
  circuit: Circuit;
  unfolded: string[];
};

/** Explicitly selected wires include both endpoints. Boundary wires are omitted. */
export function copyCircuit(
  circuit: Circuit,
  nodes: string[],
  wires: string[],
  unfolded: readonly string[] = [],
): CircuitClip {
  const ids = new Set(nodes);
  for (const wire of circuit.wires)
    if (wires.includes(wire.id)) {
      ids.add(wire.from);
      ids.add(wire.to);
    }
  if (!ids.size && !wires.length)
    circuit.nodes.forEach((node) => {
      ids.add(node.id);
    });
  // Include transparent splice paths between selected parts without pulling in outside drivers.
  const splices = new Set(circuit.nodes.filter((node) => node.splice).map((node) => node.id));
  const reachable = (reverse: boolean) => {
    const found = new Set(ids),
      queue = [...ids];
    while (queue.length) {
      const id = queue.shift()!;
      for (const wire of circuit.wires) {
        if ((reverse ? wire.to : wire.from) !== id) continue;
        const next = reverse ? wire.from : wire.to;
        if (splices.has(next) && !found.has(next)) {
          found.add(next);
          queue.push(next);
        }
      }
    }
    return found;
  };
  const forward = reachable(false),
    backward = reachable(true);
  for (const id of splices) if (forward.has(id) && backward.has(id)) ids.add(id);
  return {
    kind: "ricos-circuit",
    version: 1,
    circuit: structuredClone({
      ...circuit,
      ...(circuit.ports ? { ports: { inputs: circuit.ports.inputs.filter((id) => ids.has(id)), outputs: circuit.ports.outputs.filter((id) => ids.has(id)) } } : {}),
      nodes: circuit.nodes.filter((node) => ids.has(node.id)),
      wires: circuit.wires.filter((wire) => ids.has(wire.from) && ids.has(wire.to)),
      groups: circuit.groups
        ?.map((group) => ({
          ...group,
          nodeIds: group.nodeIds.filter((id) => ids.has(id)),
          activeWhen: group.activeWhen && ids.has(group.activeWhen) ? group.activeWhen : undefined,
        }))
        .filter((group) => group.nodeIds.length),
    }),
    unfolded: unfolded.filter((path) => ids.has(path.split("/")[0])),
  };
}

export function parseCircuitClip(text: string): CircuitClip | null {
  if (text.length > CIRCUIT_CLIPBOARD_LIMIT) return null;
  try {
    const value = JSON.parse(text);
    const wrapped = value?.kind === "ricos-circuit" && value.version === 1;
    const circuit = validateCircuit(wrapped ? value.circuit : value);
    if (!circuit) return null;
    return {
      kind: "ricos-circuit",
      version: 1,
      circuit,
      unfolded:
        wrapped && Array.isArray(value.unfolded)
          ? value.unfolded
              .filter((path: unknown) => typeof path === "string" && path.length < 800)
              .slice(0, 5000)
          : [],
    };
  } catch {
    return null;
  }
}

/** Remap scoped IDs and group references; registered blocks keep their internal hardware names. */
export function cloneCircuit(
  source: Circuit,
  dx: number,
  dy: number,
  id = () => crypto.randomUUID(),
) {
  const paths = new Map<string, string>();
  const clone = (
    circuit: Circuit,
    prefix = "",
    nextPrefix = "",
    hardwareNames = false,
  ): Circuit => {
    const ids = new Map(circuit.nodes.map((node) => [node.id, hardwareNames ? node.id : id()]));
    return {
      ...circuit,
      ...(circuit.ports ? { ports: { inputs: circuit.ports.inputs.map((id) => ids.get(id)!),
        outputs: circuit.ports.outputs.map((id) => ids.get(id)!) } } : {}),
      nodes: circuit.nodes.map((node) => {
        const nextId = ids.get(node.id)!;
        paths.set(prefix + node.id, nextPrefix + nextId);
        return {
          ...node,
          id: nextId,
          x: node.x + (prefix ? 0 : dx),
          y: node.y + (prefix ? 0 : dy),
          module: node.module
            ? clone(
                node.module,
                `${prefix}${node.id}/`,
                `${nextPrefix}${nextId}/`,
                hardwareNames || Boolean(activeBlock(node)),
              )
            : undefined,
        };
      }),
      wires: circuit.wires.map(
        (wire): Wire => ({
          ...wire,
          id: id(),
          from: ids.get(wire.from)!,
          to: ids.get(wire.to)!,
          points: wire.points?.map((point) => ({
            x: point.x + (prefix ? 0 : dx),
            y: point.y + (prefix ? 0 : dy),
          })),
        }),
      ),
      groups: circuit.groups?.map((group) => ({
        ...group,
        id: id(),
        nodeIds: group.nodeIds.map((node) => ids.get(node)!),
        activeWhen: group.activeWhen ? ids.get(group.activeWhen) : undefined,
      })),
    };
  };
  return { circuit: clone(source), paths };
}

export function insertCircuitCopy(
  target: Circuit,
  source: Circuit,
  position: { x: number; y: number },
  nested = false,
) {
  if (!source.nodes.length) return null;
  if (
    nested &&
    (moduleInputs(target).length + moduleInputs(source).length > 24 ||
      moduleOutputs(target).length + moduleOutputs(source).length > 24)
  )
    return null;
  const minX = Math.min(...source.nodes.map((node) => node.x));
  const minY = Math.min(...source.nodes.map((node) => node.y));
  const width = Math.max(...source.nodes.map((node) => node.x + nodeWidth(node))) - minX;
  const height = Math.max(...source.nodes.map((node) => node.y + nodeHeight(node))) - minY;
  const copy = cloneCircuit(source, position.x - width / 2 - minX, position.y - height / 2 - minY);
  const next = {
    ...target,
    nodes: [...target.nodes, ...copy.circuit.nodes],
    wires: [...target.wires, ...copy.circuit.wires],
    groups: [...(target.groups ?? []), ...(copy.circuit.groups ?? [])],
  };
  return validateCircuit(next)
    ? { ...copy, circuit: next, selected: copy.circuit.nodes.map((node) => node.id) }
    : null;
}

/** Intrinsic gate diagrams keep stable internal IDs; remap their nearest cloned ancestor. */
export function remapCircuitPath(paths: ReadonlyMap<string, string>, path: string) {
  let prefix = path,
    suffix = "";
  while (!paths.has(prefix) && prefix.includes("/")) {
    const split = prefix.lastIndexOf("/");
    suffix = prefix.slice(split) + suffix;
    prefix = prefix.slice(0, split);
  }
  const mapped = paths.get(prefix);
  return mapped ? mapped + suffix : undefined;
}
