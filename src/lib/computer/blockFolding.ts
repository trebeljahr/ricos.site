// Moves a datapath block's stored value between its two forms. Folded, the
// engine keeps it in `snapshot.blocks[id]`; unfolded (in place, or entered as a
// level), the gate form keeps it in the flip-flops under `snapshot.modules[id]`.
// A snapshot holds exactly one of the two for each block, so whichever is there
// is current.
import { foldBlockState, isDatapathKind, unfoldBlockState } from "./datapathBlocks";
import type { Circuit, Node, Snapshot } from "./logic";

const simulated = new WeakMap<Circuit, Map<string, Circuit>>();

/**
 * The circuit the engine runs for a view: a behavioural block unfolded in place
 * simulates its gates, so the reader sees them work. Same object when nothing
 * is unfolded, so the engine's compile cache stays warm.
 */
export function simulationCircuit(
  circuit: Circuit,
  open: ReadonlySet<string>,
  prefix = "",
): Circuit {
  const inside = [...open].filter((path) => path.startsWith(prefix));
  if (!inside.length) return circuit;
  const key = inside.sort().join("|");
  let cache = simulated.get(circuit);
  if (!cache) simulated.set(circuit, (cache = new Map()));
  const known = cache.get(key);
  if (known) return known;
  let changed = false;
  const nodes = circuit.nodes.map((node) => {
    if (node.type !== "module" || !node.module) return node;
    const path = `${prefix}${node.id}`;
    const module = simulationCircuit(node.module, open, `${path}/`);
    const gates = open.has(path) && node.behaviour;
    if (!gates && module === node.module) return node;
    changed = true;
    return { ...node, module, ...(gates ? { behaviour: undefined } : {}) };
  });
  const result = changed ? { ...circuit, nodes } : circuit;
  cache.set(key, result);
  return result;
}

/**
 * Puts each datapath block's state where the view needs it: into its gates when
 * the block is unfolded, back into the block when it is folded. Call it before
 * stepping with `simulationCircuit(circuit, open)`. Returns the same snapshot
 * when nothing moves.
 */
export function syncBlockStates(
  circuit: Circuit,
  snapshot: Snapshot,
  open: ReadonlySet<string>,
  prefix = "",
): Snapshot {
  let modules = snapshot.modules;
  let blocks = snapshot.blocks;
  const write = (id: string, inner: Snapshot | undefined, state: unknown, hasState: boolean) => {
    if (modules === snapshot.modules) modules = { ...modules };
    if (inner) modules[id] = inner;
    else delete modules[id];
    if (blocks === snapshot.blocks) blocks = { ...blocks };
    if (hasState) blocks![id] = state;
    else delete blocks![id];
  };
  for (const node of circuit.nodes) {
    if (node.type !== "module" || !node.module) continue;
    const path = `${prefix}${node.id}`;
    const block = isDatapathKind(node.behaviour);
    const unfolded = !block || open.has(path);
    if (block && unfolded && !modules[node.id] && blocks && node.id in blocks)
      write(node.id, unfoldBlockState(node, blocks[node.id]), undefined, false);
    else if (block && unfolded && modules[node.id] && blocks && node.id in blocks)
      write(node.id, modules[node.id], undefined, false);
    else if (block && !unfolded && modules[node.id])
      write(node.id, undefined, foldBlockState(node, modules[node.id]), true);
    const inner = modules[node.id];
    if (unfolded && inner) {
      const synced = syncBlockStates(node.module, inner, open, `${path}/`);
      if (synced !== inner) {
        if (modules === snapshot.modules) modules = { ...modules };
        modules[node.id] = synced;
      }
    }
  }
  return modules === snapshot.modules && blocks === snapshot.blocks
    ? snapshot
    : { ...snapshot, modules, ...(blocks ? { blocks } : {}) };
}

/** The snapshot to show when the reader enters a module as its own level. */
export function enteredSnapshot(node: Node, parent: Snapshot): Snapshot | undefined {
  const inner = parent.modules[node.id];
  if (inner || !isDatapathKind(node.behaviour) || !parent.blocks || !(node.id in parent.blocks))
    return inner;
  return unfoldBlockState(node, parent.blocks[node.id]);
}

/** The parent snapshot after leaving a module level; its gates now hold the state. */
export function returnedSnapshot(moduleId: string, parent: Snapshot, child: Snapshot): Snapshot {
  const blocks = parent.blocks && moduleId in parent.blocks ? { ...parent.blocks } : parent.blocks;
  if (blocks !== parent.blocks) delete blocks![moduleId];
  return {
    ...parent,
    modules: { ...parent.modules, [moduleId]: child },
    ...(blocks ? { blocks } : {}),
  };
}

/** Node types and wiring only, ignoring layout, labels and input switch levels. */
export function gateStructure(circuit: Circuit): string {
  return JSON.stringify({
    nodes: circuit.nodes.map(({ id, type, numberValue, behaviour, module }) => [
      id,
      type,
      numberValue ?? null,
      behaviour ?? null,
      module ? gateStructure(module) : null,
    ]),
    wires: circuit.wires.map(({ from, to, input, output }) => [from, to, input, output ?? 0]),
  });
}
