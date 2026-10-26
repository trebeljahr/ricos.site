import { inputCount, outputCount, type Circuit, type Node } from "./logic";
import { nodeHeight, nodeWidth } from "./nodeGeometry";

type Vertex = {
  node?: Node;
  rank: number;
  y: number;
  height: number;
  incoming: Edge[];
  outgoing: Edge[];
};
type Edge = { from: Vertex; to: Vertex; output: number; input: number };

function portOffset(vertex: Vertex, index: number, kind: "input" | "output") {
  if (!vertex.node) return vertex.height / 2;
  const node = vertex.node;
  const count = node.type === "sevensegment" ? 7 : kind === "input" ? inputCount(node) : outputCount(node);
  const edge = node.type === "module" ? 42 : 40;
  return count <= 1 ? vertex.height / 2 : edge + (index % count) * ((vertex.height - edge - 24) / (count - 1));
}

/** Layer a combinational diagram by dependencies, then order each layer by its pins.
 * Feedback, groups and rotated parts retain their authored schematic structure.
 * Mutates only the supplied display copies, never the circuit's port/node order. */
export function arrangeSignalFlow(
  circuit: Circuit,
  nodes: Node[],
  { rowGap = 40, columnGap = 120 }: { rowGap?: number; columnGap?: number } = {},
): boolean {
  if (!nodes.length || circuit.groups?.length || nodes.some((node) =>
    node.splice || (node.inputSide && node.inputSide !== "left") ||
    (node.outputSide && node.outputSide !== "right"))) return false;
  const vertices = new Map(nodes.map((node): [string, Vertex] => [node.id, {
    node, rank: 0, y: node.y, height: nodeHeight(node), incoming: [], outgoing: [],
  }]));
  for (const wire of circuit.wires) {
    const from = vertices.get(wire.from), to = vertices.get(wire.to);
    if (!from || !to) continue;
    const edge = { from, to, input: wire.input, output: wire.output ?? 0 };
    from.outgoing.push(edge);
    to.incoming.push(edge);
  }
  const remaining = new Map([...vertices.values()].map((vertex) => [vertex, vertex.incoming.length]));
  const queue = [...vertices.values()].filter((vertex) => !vertex.incoming.length);
  for (let i = 0; i < queue.length; i++) {
    for (const { to } of queue[i].outgoing) {
      to.rank = Math.max(to.rank, queue[i].rank + 1);
      remaining.set(to, remaining.get(to)! - 1);
      if (!remaining.get(to)) queue.push(to);
    }
  }
  if (queue.length !== nodes.length) return false;
  const lastRank = Math.max(...queue.map((vertex) => vertex.rank));
  for (const vertex of queue) {
    if (vertex.incoming.length && !vertex.outgoing.length) vertex.rank = lastRank;
  }
  const channels = queue.reduce((sum, vertex) => sum + vertex.outgoing.reduce((count, edge) =>
    count + Math.max(0, edge.to.rank - vertex.rank - 1), 0), 0);
  // Bound scratch geometry for large imported diagrams with many long edges.
  if (channels > 12000) return false;
  const layers: Vertex[][] = Array.from({ length: lastRank + 1 }, () => []);
  for (const vertex of vertices.values()) layers[vertex.rank].push(vertex);
  // Named inputs are an interface, e.g. A, B, CARRY IN or ascending bit lanes.
  // Keep that order unless they directly feed one pin bank, whose pin order
  // gives a clearer reading (the independent a–g segment switches).
  const sources = layers[0];
  const directBank = sources.length > 1 && sources.every((vertex) => vertex.outgoing.length === 1 &&
    vertex.outgoing[0].to === sources[0].outgoing[0]?.to);
  if (directBank) sources.sort((a, b) => a.outgoing[0].input - b.outgoing[0].input);
  const sourceOrder = new Map(sources.map((vertex, index) => [vertex, index]));
  // Virtual vertices keep long connections in the ordering calculation. They
  // reserve a clear channel through intervening layers without adding parts.
  for (const vertex of vertices.values()) {
    for (const edge of [...vertex.outgoing]) {
      if (edge.to.rank - vertex.rank <= 1) continue;
      vertex.outgoing.splice(vertex.outgoing.indexOf(edge), 1);
      edge.to.incoming.splice(edge.to.incoming.indexOf(edge), 1);
      let previous = vertex;
      for (let rank = vertex.rank + 1; rank < edge.to.rank; rank++) {
        const via: Vertex = { rank, y: vertex.y, height: 12, incoming: [], outgoing: [] };
        const hop = { from: previous, to: via, output: previous === vertex ? edge.output : 0, input: 0 };
        previous.outgoing.push(hop);
        via.incoming.push(hop);
        layers[rank].push(via);
        previous = via;
      }
      const hop = { from: previous, to: edge.to, output: 0, input: edge.input };
      previous.outgoing.push(hop);
      edge.to.incoming.push(hop);
    }
  }
  const gap = rowGap;
  const pack = (layer: Vertex[], desired: Map<Vertex, number>) => {
    // Isotonic regression finds the nearest ordered positions while preserving
    // body clearance. Unlike a forward collision push, it cannot drift downward.
    const blocks: { start: number; end: number; sum: number; count: number }[] = [];
    let offset = 0;
    const offsets = layer.map((vertex) => {
      const before = offset;
      offset += vertex.height + gap;
      return before;
    });
    layer.forEach((vertex, index) => {
      blocks.push({ start: index, end: index, sum: desired.get(vertex)! - offsets[index], count: 1 });
      while (blocks.length > 1) {
        const a = blocks[blocks.length - 2], b = blocks[blocks.length - 1];
        if (a.sum / a.count <= b.sum / b.count) break;
        blocks.splice(-2, 2, { start: a.start, end: b.end, sum: a.sum + b.sum, count: a.count + b.count });
      }
    });
    for (const block of blocks) {
      for (let i = block.start; i <= block.end; i++) layer[i].y = block.sum / block.count + offsets[i];
    }
  };
  for (const layer of layers) {
    layer.sort((a, b) => a.y - b.y);
    pack(layer, new Map(layer.map((vertex) => [vertex, 0])));
  }
  for (let sweep = 0; sweep < 8; sweep++) {
    const forward = sweep % 2 === 0;
    const ordered = forward ? layers : [...layers].reverse();
    for (const layer of ordered) {
      const desired = new Map(layer.map((vertex): [Vertex, number] => {
        const edges = forward ? vertex.incoming : vertex.outgoing;
        const values = edges.map((edge) => forward
          ? edge.from.y + portOffset(edge.from, edge.output, "output") - portOffset(vertex, edge.input, "input")
          : edge.to.y + portOffset(edge.to, edge.input, "input") - portOffset(vertex, edge.output, "output"));
        return [vertex, values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : vertex.y];
      }));
      layer.sort((a, b) => layer === sources
        ? sourceOrder.get(a)! - sourceOrder.get(b)!
        : desired.get(a)! - desired.get(b)!);
      pack(layer, desired);
    }
  }
  // A mean position can place a long control line between two related inputs.
  // Prefer the ordering with fewer pin inversions before refining wire lengths.
  const order = new Map(layers.flatMap((layer) => layer.map((vertex, index) => [vertex, index] as const)));
  const pinOrder = (vertex: Vertex, index: number, kind: "input" | "output") =>
    order.get(vertex)! + portOffset(vertex, index, kind) / vertex.height;
  const swapCost = (a: Vertex, b: Vertex) => {
    let delta = 0;
    for (const incoming of [true, false]) {
      const targets = (vertex: Vertex) => (incoming ? vertex.incoming : vertex.outgoing).map((edge) =>
        incoming ? pinOrder(edge.from, edge.output, "output") : pinOrder(edge.to, edge.input, "input"));
      for (const first of targets(a)) {
        for (const second of targets(b)) delta += Math.sign(second - first);
      }
    }
    return delta;
  };
  for (let sweep = 0; sweep < 8; sweep++) {
    let changed = false;
    for (const layer of sweep % 2 ? [...layers].reverse() : layers) {
      if (layer === sources) continue;
      for (let index = 0; index < layer.length - 1; index++) {
        const a = layer[index], b = layer[index + 1];
        if (swapCost(a, b) >= 0) continue;
        layer[index] = b;
        layer[index + 1] = a;
        order.set(b, index);
        order.set(a, index + 1);
        changed = true;
      }
      pack(layer, new Map(layer.map((vertex) => [vertex, vertex.y])));
    }
    if (!changed) break;
  }
  const top = Math.min(...queue.map((vertex) => vertex.y));
  let x = 80;
  for (const layer of layers) {
    for (const vertex of layer) {
      if (vertex.node) {
        vertex.node.x = x;
        vertex.node.y = Math.round(vertex.y - top + 80);
      }
    }
    const signals = new Set(layer.flatMap((vertex) => vertex.outgoing.map((edge) =>
      `${vertex.node?.id ?? layer.indexOf(vertex)}:${edge.output}`))).size;
    x += Math.max(0, ...layer.map((vertex) => vertex.node ? nodeWidth(vertex.node) : 0)) +
      Math.max(columnGap, Math.min(signals, 24) * 16 + 48);
  }
  return true;
}
