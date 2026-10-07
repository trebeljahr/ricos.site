// Shared helpers for building block gate forms: a small circuit builder, port
// lists, bit packing, and flip-flop seeding for moving state across a fold.
import type { Circuit, GateType, Node, Snapshot, Wire } from "./logic";

export const range = (n: number) => Array.from({ length: n }, (_, i) => i);
export const toBits = (value: number, width: number) =>
  range(width).map((bit) => Boolean((value >> bit) & 1));
export const toNumber = (bits: readonly boolean[]) =>
  bits.reduce((n, bit, i) => n | (Number(bit) << i), 0);
export const hex = (value: number) => value.toString(16).toUpperCase().padStart(2, "0");

/** A signal source: a node id, plus the output port for multi-output nodes. */
export type Ref = string | [string, number];

export class Builder {
  readonly nodes: Node[] = [];
  readonly wires: Wire[] = [];
  add(id: string, type: GateType, x: number, y: number, label?: string, extra: Partial<Node> = {}) {
    this.nodes.push({ id, type, x, y, ...(label ? { label } : {}), ...extra });
    return id;
  }
  connect(from: Ref, to: string, input = 0) {
    const [id, output] = typeof from === "string" ? [from, undefined] : from;
    this.wires.push({
      id: `${id}:${output ?? 0}-${to}:${input}`,
      from: id,
      to,
      input,
      ...(output === undefined ? {} : { output }),
    });
  }
  gate(id: string, type: GateType, x: number, y: number, a: Ref, b?: Ref, label?: string) {
    this.add(id, type, x, y, label);
    this.connect(a, id);
    if (b !== undefined) this.connect(b, id, 1);
    return id;
  }
  /** ORs the sources pairwise down to one signal. */
  orTree(prefix: string, sources: Ref[], x: number, y: number, label?: string): Ref {
    let level = sources;
    for (let depth = 0; level.length > 1; depth++) {
      const next: Ref[] = [];
      for (let i = 0; i < level.length; i += 2)
        next.push(
          i + 1 < level.length
            ? this.gate(
                `${prefix}-or${depth}-${i / 2}`,
                "or",
                x + depth * 140,
                y + i * 30,
                level[i],
                level[i + 1],
                level.length === 2 ? label : undefined,
              )
            : level[i],
        );
      level = next;
    }
    return level[0];
  }
  /** One-hot select lines for a 4-bit address, optionally gated by an enable. */
  decoder(prefix: string, address: Ref[], x: number, y: number, enable?: Ref, label = "ROW") {
    const inverted = address.map((bit, b) =>
      this.gate(`${prefix}-not${b}`, "not", x, y + b * 80, bit, undefined, `NOT A${b}`),
    );
    const pick = (b: number, one: boolean) => (one ? address[b] : inverted[b]);
    const pair = (lo: number, combo: number) =>
      this.gate(
        `${prefix}-p${lo}-${combo}`,
        "and",
        x + 150,
        y + (lo * 2 + combo / 4) * 160,
        pick(lo, Boolean(combo & 1)),
        pick(lo + 1, Boolean(combo & 2)),
      );
    const low = range(4).map((combo) => pair(0, combo));
    const high = range(4).map((combo) => pair(2, combo));
    return range(16).map((row) => {
      const sel = this.gate(
        `${prefix}-sel${row}`,
        "and",
        x + 300,
        y + row * 90,
        low[row & 3],
        high[row >> 2],
        enable === undefined ? `${label} ${row}` : undefined,
      );
      return enable === undefined
        ? sel
        : this.gate(
            `${prefix}-en${row}`,
            "and",
            x + 440,
            y + row * 90,
            sel,
            enable,
            `${label} ${row}`,
          );
    });
  }
  circuit(name: string): Circuit {
    return { name, nodes: this.nodes, wires: this.wires };
  }
}

/** Adds input nodes for a block's ports, in port order. */
export function ports(b: Builder, specs: [id: string, label: string][], clock = "clock") {
  specs.forEach(([id, label], i) =>
    b.add(id, id === clock ? "clock" : "switch", 30, 30 + i * 90, label),
  );
}
export const busPorts = (prefix: string, label: string, width = 8): [string, string][] =>
  range(width).map((bit) => [`${prefix}${bit}`, `${label}${bit}`]);

/** Writes a byte into flip-flops `${prefix}0..7`, as their stored bit and last clock. */
export function seedCells(snapshot: Snapshot, cells: string[], value: number, clock: boolean) {
  cells.forEach((id, bit) => {
    const on = Boolean((value >> bit) & 1);
    snapshot.memory[id] = on;
    snapshot.values[id] = on;
    snapshot.lastClock[id] = clock;
  });
}
export const readCells = (snapshot: Snapshot, cells: string[]) =>
  toNumber(cells.map((id) => Boolean(snapshot.memory[id])));
export const cellIds = (prefix: string, width = 8) => range(width).map((bit) => `${prefix}${bit}`);
