import {
  type Circuit,
  type CircuitGroup,
  GATE_NAMES,
  gateBlueprint,
  type LogicGate,
  type Node,
  type Wire,
  moduleInputs,
  moduleOutputs,
} from "./logic";

type Endpoint = { to: string; input: number };
type Entry = { inputs: Endpoint[][]; outputs: string[]; nodeIds: string[] };
export type Implementation = {
  nodes: Node[];
  wires: Wire[];
  groups: CircuitGroup[];
  width: number;
  height: number;
  transistorCount: number;
};

const COLUMNS = 3;
const CELL_WIDTH = 1600;
const CELL_HEIGHT = 560;
const SCALE = 0.65;

function dffCircuit(): Circuit {
  const names = [
    "data",
    "clock",
    "not-data",
    "not-clock",
    "master-set",
    "master-reset",
    "master-q",
    "master-qbar",
    "slave-set",
    "slave-reset",
    "q",
    "qbar",
    "out",
  ];
  const types = [
    "switch",
    "switch",
    "not",
    "not",
    "nand",
    "nand",
    "nand",
    "nand",
    "nand",
    "nand",
    "nand",
    "nand",
    "lamp",
  ] as const;
  const nodes: Node[] = names.map((id, index) => ({
    id,
    type: types[index],
    x: 0,
    y: 0,
    label: id.replaceAll("-", " ").toUpperCase(),
  }));
  const wires: Wire[] = [];
  const link = (from: string, to: string, input = 0) =>
    wires.push({
      id: `${from}-${to}-${input}`,
      from,
      to,
      input,
    });
  link("data", "not-data");
  link("clock", "not-clock");
  link("data", "master-set");
  link("not-clock", "master-set", 1);
  link("not-data", "master-reset");
  link("not-clock", "master-reset", 1);
  link("master-set", "master-q");
  link("master-qbar", "master-q", 1);
  link("master-reset", "master-qbar");
  link("master-q", "master-qbar", 1);
  link("master-q", "slave-set");
  link("clock", "slave-set", 1);
  link("master-qbar", "slave-reset");
  link("clock", "slave-reset", 1);
  link("slave-set", "q");
  link("qbar", "q", 1);
  link("slave-reset", "qbar");
  link("q", "qbar", 1);
  link("q", "out");
  return { name: "Positive-edge master-slave D flip-flop", nodes, wires };
}

/** Builds a read-only CMOS netlist. Every combinational gate ends at transistor switches. */
export function buildImplementation(circuit: Circuit): Implementation {
  const nodes: Node[] = [];
  const wires: Wire[] = [];
  const groups: CircuitGroup[] = [];
  let cell = 0;
  let wireId = 0;
  const link = (from: string, to: string, input = 0, output = 0) => {
    wires.push({ id: `schematic-wire-${wireId++}`, from, to, input, output });
  };
  const position = () => {
    const index = cell++;
    return {
      x: 60 + (index % COLUMNS) * CELL_WIDTH,
      y: 80 + Math.floor(index / COLUMNS) * CELL_HEIGHT,
    };
  };

  const expand = (
    source: Circuit,
    prefix: string,
    nested: boolean,
    depth: number,
  ): Map<string, Entry> => {
    const entries = new Map<string, Entry>();
    if (depth > 5) throw new Error("Circuit nesting exceeds the implementation view limit.");
    for (const item of source.nodes) {
      const id = `${prefix}${item.id}`;
      if (GATE_NAMES.includes(item.type as LogicGate)) {
        const blueprint = gateBlueprint(item.type as LogicGate, "transistor");
        const origin = position();
        const mapId = (part: string) => `${id}/${part}`;
        const internal = blueprint.nodes.filter(
          (part) => part.id !== "a" && part.id !== "b" && part.id !== "out",
        );
        const ids = internal.map((part) => mapId(part.id));
        nodes.push(
          ...internal.map((part) => ({
            ...part,
            id: mapId(part.id),
            x: origin.x + part.x * SCALE,
            y: origin.y + part.y * SCALE,
          })),
        );
        for (const edge of blueprint.wires) {
          if (["a", "b"].includes(edge.from) || edge.to === "out") continue;
          link(mapId(edge.from), mapId(edge.to), edge.input, edge.output ?? 0);
        }
        const inputs = ["a", "b"].slice(0, item.type === "not" ? 1 : 2).map((port) =>
          blueprint.wires
            .filter((edge) => edge.from === port)
            .map((edge) => ({
              to: mapId(edge.to),
              input: edge.input,
            })),
        );
        const output = blueprint.wires.find((edge) => edge.to === "out")!;
        entries.set(item.id, { inputs, outputs: [mapId(output.from)], nodeIds: ids });
        groups.push({
          id: `${id}/group`,
          label: `${item.label || item.type.toUpperCase()} · CMOS ${item.type.toUpperCase()}`,
          nodeIds: ids,
        });
      } else if (item.type === "module" || item.type === "dff") {
        const inner = item.type === "module" ? item.module : dffCircuit();
        if (!inner) continue;
        const innerEntries = expand(inner, `${id}/`, true, depth + 1);
        const inputPorts = item.type === "module" ? moduleInputs(inner) : inner.nodes.slice(0, 2);
        const outputPorts =
          item.type === "module"
            ? moduleOutputs(inner)
            : inner.nodes.filter((part) => part.id === "out");
        const ids = [...innerEntries.values()].flatMap((entry) => entry.nodeIds);
        entries.set(item.id, {
          inputs: inputPorts.map((port) => innerEntries.get(port.id)?.inputs[0] ?? []),
          outputs: outputPorts.map((port) => innerEntries.get(port.id)?.outputs[0] ?? ""),
          nodeIds: ids,
        });
        groups.push({
          id: `${id}/group`,
          label:
            item.type === "dff"
              ? `${item.label || "D flip-flop"} · master–slave NAND`
              : item.label || inner.name,
          nodeIds: ids,
        });
      } else {
        const origin = position();
        const port = nested && ["switch", "clock", "pulse", "lamp"].includes(item.type);
        nodes.push({
          ...item,
          id,
          type: port ? "junction" : item.type,
          x: origin.x + 420,
          y: origin.y + 320,
        });
        entries.set(item.id, {
          inputs:
            item.type === "lamp" || (nested && ["switch", "clock", "pulse"].includes(item.type))
              ? [[{ to: id, input: 0 }]]
              : Array.from(
                  {
                    length:
                      item.type === "nmos" || item.type === "pmos" || item.type === "junction"
                        ? 2
                        : 0,
                  },
                  (_, input) => [{ to: id, input }],
                ),
          outputs: item.type === "lamp" && !nested ? [] : [id],
          nodeIds: [id],
        });
      }
    }
    for (const edge of source.wires) {
      const from = entries.get(edge.from)?.outputs[edge.output ?? 0];
      const targets = entries.get(edge.to)?.inputs[edge.input] ?? [];
      if (from) for (const target of targets) link(from, target.to, target.input);
    }
    for (const group of source.groups ?? []) {
      groups.push({
        id: `${prefix}${group.id}/source-group`,
        label: group.label,
        nodeIds: group.nodeIds.flatMap((member) => entries.get(member)?.nodeIds ?? []),
      });
    }
    return entries;
  };
  expand(circuit, "", false, 0);
  return {
    nodes,
    wires,
    groups,
    width: COLUMNS * CELL_WIDTH + 80,
    height: Math.ceil(cell / COLUMNS) * CELL_HEIGHT + 80,
    transistorCount: nodes.filter((item) => item.type === "nmos" || item.type === "pmos").length,
  };
}
