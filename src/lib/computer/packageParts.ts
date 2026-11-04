// Folds a set of a circuit's parts into one module, wire for wire: each signal that
// crosses the fold becomes a port of the module. The module simulates the same parts.
import type { Circuit, Node, Wire } from "./logic";

export type PackagedPart = Pick<Node, "id" | "x" | "y"> & { label: string };

const key = (wire: Wire) => `${wire.from}:${wire.output ?? 0}`;

export function packageParts(
  circuit: Circuit,
  ids: ReadonlySet<string>,
  part: PackagedPart,
): Circuit {
  const label = (id: string, output: number) => {
    const node = circuit.nodes.find((item) => item.id === id);
    return `${(node?.label ?? id).slice(0, 26)} ${output}`.slice(0, 30);
  };
  const entering = circuit.wires.filter((wire) => !ids.has(wire.from) && ids.has(wire.to));
  const leaving = circuit.wires.filter((wire) => ids.has(wire.from) && !ids.has(wire.to));
  // The ports of one neighbour stay together and in bit order, so a lane meets them in one comb.
  const neighbour = new Map<string, number>();
  for (const id of [...entering.map((wire) => wire.from), ...leaving.map((wire) => wire.to)])
    if (!neighbour.has(id)) neighbour.set(id, neighbour.size);
  const rank = (id: string) => neighbour.get(id) as number;
  const inputs = [...new Map(entering.map((wire) => [key(wire), wire])).values()].sort(
    (a, b) => rank(a.from) - rank(b.from) || (a.output ?? 0) - (b.output ?? 0),
  );
  const outputs = [...new Map(leaving.map((wire) => [key(wire), wire])).values()].sort(
    (a, b) => rank(a.to) - rank(b.to) || a.input - b.input,
  );
  const inputIndex = new Map(inputs.map((wire, index) => [key(wire), index]));
  const outputIndex = new Map(outputs.map((wire, index) => [key(wire), index]));
  const inputId = (index: number) => `in-${index}`;
  const outputId = (index: number) => `out-${index}`;
  const inner: Circuit = {
    name: part.label,
    nodes: [
      ...inputs.map(
        (wire, index): Node => ({
          id: inputId(index),
          type: "switch",
          x: 0,
          y: 0,
          label: label(wire.from, wire.output ?? 0),
        }),
      ),
      ...circuit.nodes.filter((node) => ids.has(node.id)),
      ...outputs.map(
        (wire, index): Node => ({
          id: outputId(index),
          type: "lamp",
          x: 0,
          y: 0,
          label: label(wire.to, wire.input),
        }),
      ),
    ],
    wires: [
      ...circuit.wires.filter((wire) => ids.has(wire.from) && ids.has(wire.to)),
      ...entering.map((wire): Wire => {
        const index = inputIndex.get(key(wire)) as number;
        return {
          id: `${inputId(index)}-${wire.to}:${wire.input}`,
          from: inputId(index),
          to: wire.to,
          input: wire.input,
        };
      }),
      ...outputs.map(
        (wire, index): Wire => ({
          id: `${wire.from}:${wire.output ?? 0}-${outputId(index)}`,
          from: wire.from,
          ...(wire.output === undefined ? {} : { output: wire.output }),
          to: outputId(index),
          input: 0,
        }),
      ),
    ],
    ports: {
      inputs: inputs.map((_, index) => inputId(index)),
      outputs: outputs.map((_, index) => outputId(index)),
    },
  };
  const outside = (wire: Wire) => !ids.has(wire.from) && !ids.has(wire.to);
  return {
    ...circuit,
    nodes: [
      ...circuit.nodes.filter((node) => !ids.has(node.id)),
      { id: part.id, type: "module", x: part.x, y: part.y, label: part.label, module: inner },
    ],
    wires: [
      ...circuit.wires.filter(outside),
      ...inputs.map(
        (wire, index): Wire => ({
          id: `${key(wire)}-${part.id}:${index}`,
          from: wire.from,
          ...(wire.output === undefined ? {} : { output: wire.output }),
          to: part.id,
          input: index,
        }),
      ),
      ...leaving.map((wire): Wire => {
        const output = outputIndex.get(key(wire)) as number;
        return {
          id: `${part.id}:${output}-${wire.to}:${wire.input}`,
          from: part.id,
          output,
          to: wire.to,
          input: wire.input,
        };
      }),
    ],
  };
}
