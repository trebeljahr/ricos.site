import { type Circuit, isProbeDisplay, type Snapshot } from "./logic";

export type ProbeEntry = {
  name: string;
  /** Module node ids from the root down to the display, ending with the display id. */
  path: string[];
  bits: 4 | 8;
};

/**
 * Every named probe display, outermost circuit first (breadth-first), then in node order.
 * The first entry for a name is the one `readProbes` reports.
 */
export function listProbes(circuit: Circuit): ProbeEntry[] {
  const found: ProbeEntry[] = [];
  let level: { circuit: Circuit; path: string[] }[] = [{ circuit, path: [] }];
  for (let depth = 0; level.length && depth <= 6; depth++) {
    const next: typeof level = [];
    for (const { circuit: current, path } of level)
      for (const node of current.nodes) {
        if (isProbeDisplay(node.type) && node.probe)
          found.push({
            name: node.probe,
            path: [...path, node.id],
            bits: node.type === "display4" ? 4 : 8,
          });
        if (node.type === "module" && node.module)
          next.push({ circuit: node.module, path: [...path, node.id] });
      }
    level = next;
  }
  return found;
}

/** Names used by more than one probe display anywhere in the circuit. */
export function duplicateProbes(circuit: Circuit): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const { name } of listProbes(circuit)) {
    if (seen.has(name)) duplicates.add(name);
    seen.add(name);
  }
  return [...duplicates];
}

/**
 * Reads every named probe display as a number, also inside folded modules.
 * Duplicate names: the shallowest probe wins, ties go to the earlier node (see `listProbes`).
 * Pass `probes` when reading the same circuit many times: listing walks every nested module.
 */
export function readProbes(
  circuit: Circuit,
  snapshot: Snapshot,
  probes: ProbeEntry[] = listProbes(circuit),
): Record<string, number> {
  const values: Record<string, number> = {};
  for (const probe of probes) {
    if (Object.hasOwn(values, probe.name)) continue;
    let state: Snapshot | undefined = snapshot;
    for (const id of probe.path.slice(0, -1)) state = state?.modules[id];
    const bits = state?.outputs[probe.path[probe.path.length - 1]] ?? [];
    values[probe.name] = bits
      .slice(0, probe.bits)
      .reduce((value, bit, index) => value + (bit ? 2 ** index : 0), 0);
  }
  return values;
}
