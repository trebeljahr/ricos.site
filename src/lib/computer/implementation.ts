import {
  type Circuit,
  type CircuitGroup,
  type GateType,
  GATE_NAMES,
  gateBlueprint,
  type LogicGate,
  type Node,
  type Wire,
  inputCount,
  moduleInputs,
  moduleOutputs,
  outputCount,
} from "./logic";

type Endpoint = { to: string; input: number };
type Source = { id: string; output: number };
type Entry = { inputs: Endpoint[][]; outputs: Source[]; nodeIds: string[] };
type SchematicNode = Node & { schematicKind?: "capacitor" | "floating-gate" };
export type UnfoldableBox = { id: string; label: string; type: GateType; expanded: boolean };
export type Implementation = {
  nodes: SchematicNode[];
  wires: Wire[];
  groups: CircuitGroup[];
  width: number;
  height: number;
  transistorCount: number;
  boxes: UnfoldableBox[];
};

const SCALE = 0.65;
const PART_WIDTH = 140;
const PART_HEIGHT = 64;
const COLUMN_GAP = 90;
const ROW_GAP = 75;

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

function srLatchCircuit(): Circuit {
  const nodes: Node[] = [
    { id: "set", type: "switch", x: 30, y: 70, label: "SET" },
    { id: "reset", type: "switch", x: 30, y: 210, label: "RESET" },
    { id: "q", type: "nor", x: 260, y: 70, label: "Q NOR" },
    { id: "qbar", type: "nor", x: 260, y: 210, label: "NOT Q NOR" },
    { id: "out", type: "lamp", x: 500, y: 70, label: "Q" },
  ];
  const wires: Wire[] = [
    { id: "reset-q", from: "reset", to: "q", input: 0 },
    { id: "qbar-q", from: "qbar", to: "q", input: 1 },
    { id: "set-qbar", from: "set", to: "qbar", input: 0 },
    { id: "q-qbar", from: "q", to: "qbar", input: 1 },
    { id: "q-out", from: "q", to: "out", input: 0 },
  ];
  return { name: "Cross-coupled NOR SR latch", nodes, wires };
}

function dLatchCircuit(): Circuit {
  const nodes: Node[] = [
    { id: "data", type: "switch", x: 30, y: 70, label: "DATA" },
    { id: "enable", type: "switch", x: 30, y: 210, label: "ENABLE" },
    { id: "not-data", type: "not", x: 240, y: 170, label: "NOT DATA" },
    { id: "set", type: "and", x: 450, y: 70, label: "SET PATH" },
    { id: "reset", type: "and", x: 450, y: 210, label: "RESET PATH" },
    { id: "core", type: "srlatch", x: 680, y: 110, label: "SR CORE" },
    { id: "out", type: "lamp", x: 920, y: 110, label: "Q" },
  ];
  const wires: Wire[] = [
    { id: "data-not", from: "data", to: "not-data", input: 0 },
    { id: "data-set", from: "data", to: "set", input: 0 },
    { id: "enable-set", from: "enable", to: "set", input: 1 },
    { id: "not-reset", from: "not-data", to: "reset", input: 0 },
    { id: "enable-reset", from: "enable", to: "reset", input: 1 },
    { id: "set-core", from: "set", to: "core", input: 0 },
    { id: "reset-core", from: "reset", to: "core", input: 1 },
    { id: "core-out", from: "core", to: "out", input: 0 },
  ];
  return { name: "Gated D latch", nodes, wires };
}

const storageCircuit = (type: "dff" | "srlatch" | "dlatch") =>
  type === "dff" ? dffCircuit() : type === "srlatch" ? srLatchCircuit() : dLatchCircuit();

export function collectUnfoldableIds(circuit: Circuit, prefix = ""): string[] {
  return circuit.nodes.flatMap((item) => {
    const id = `${prefix}${item.id}`;
    if (item.type === "module" && item.module)
      return [id, ...collectUnfoldableIds(item.module, `${id}/`)];
    if (["dff", "srlatch", "dlatch"].includes(item.type)) {
      if (item.type === "dff" && item.label?.startsWith("FLOATING GATE")) return [id];
      return [
        id,
        ...collectUnfoldableIds(
          storageCircuit(item.type as "dff" | "srlatch" | "dlatch"),
          `${id}/`,
        ),
      ];
    }
    return GATE_NAMES.includes(item.type as LogicGate) || item.type === "dramcell" ? [id] : [];
  });
}

/** Builds the visible graph. Passing no set unfolds every box down to CMOS transistors. */
export function buildImplementation(
  circuit: Circuit,
  expanded?: ReadonlySet<string>,
): Implementation {
  const nodes: SchematicNode[] = [];
  const wires: Wire[] = [];
  const groups: CircuitGroup[] = [];
  const boxes: UnfoldableBox[] = [];
  const layoutCache = new Map<
    string,
    {
      positions: Map<string, { x: number; y: number }>;
      width: number;
      height: number;
    }
  >();
  let wireId = 0;
  const link = (from: string, to: string, input = 0, output = 0) => {
    wires.push({ id: `schematic-wire-${wireId++}`, from, to, input, output });
  };
  const layout = (
    source: Circuit,
    prefix: string,
  ): {
    positions: Map<string, { x: number; y: number }>;
    width: number;
    height: number;
  } => {
    const cached = layoutCache.get(prefix);
    if (cached) return cached;
    const xs = [...new Set(source.nodes.map((item) => item.x))].sort((a, b) => a - b);
    const ys = [...new Set(source.nodes.map((item) => item.y))].sort((a, b) => a - b);
    const sizes = new Map(
      source.nodes.map((item) => {
        const id = `${prefix}${item.id}`;
        if (!(expanded?.has(id) ?? true))
          return [item.id, { width: PART_WIDTH, height: PART_HEIGHT }] as const;
        if (GATE_NAMES.includes(item.type as LogicGate)) {
          const parts = gateBlueprint(item.type as LogicGate, "transistor").nodes;
          return [
            item.id,
            {
              width: Math.max(...parts.map((part) => part.x)) * SCALE + PART_WIDTH + 30,
              height: Math.max(...parts.map((part) => part.y)) * SCALE + PART_HEIGHT + 45,
            },
          ] as const;
        }
        if (item.type === "module" && item.module) {
          const inner = layout(item.module, `${id}/`);
          return [item.id, { width: inner.width + 40, height: inner.height + 65 }] as const;
        }
        if (
          ["dff", "srlatch", "dlatch"].includes(item.type) &&
          !(item.type === "dff" && item.label?.startsWith("FLOATING GATE"))
        ) {
          const inner = layout(storageCircuit(item.type as "dff" | "srlatch" | "dlatch"), `${id}/`);
          return [item.id, { width: inner.width + 40, height: inner.height + 65 }] as const;
        }
        if (
          item.type === "dramcell" ||
          (item.type === "dff" && item.label?.startsWith("FLOATING GATE"))
        )
          return [item.id, { width: 420, height: 230 }] as const;
        return [item.id, { width: PART_WIDTH, height: PART_HEIGHT }] as const;
      }),
    );
    const columns = xs.map((x) =>
      Math.max(
        ...source.nodes.filter((item) => item.x === x).map((item) => sizes.get(item.id)!.width),
      ),
    );
    const rows = ys.map((y) =>
      Math.max(
        ...source.nodes.filter((item) => item.y === y).map((item) => sizes.get(item.id)!.height),
      ),
    );
    const xOffsets = columns.map((_, index) =>
      columns.slice(0, index).reduce((sum, width) => sum + width + COLUMN_GAP, 0),
    );
    const yOffsets = rows.map((_, index) =>
      rows.slice(0, index).reduce((sum, height) => sum + height + ROW_GAP, 0),
    );
    const positions = new Map(
      source.nodes.map((item) => [
        item.id,
        {
          x: xOffsets[xs.indexOf(item.x)],
          y: yOffsets[ys.indexOf(item.y)],
        },
      ]),
    );
    const result = {
      positions,
      width: columns.reduce((sum, width) => sum + width + COLUMN_GAP, 0),
      height: rows.reduce((sum, height) => sum + height + ROW_GAP, 0),
    };
    layoutCache.set(prefix, result);
    return result;
  };

  const expand = (
    source: Circuit,
    prefix: string,
    nested: boolean,
    depth: number,
    baseX: number,
    baseY: number,
  ): Map<string, Entry> => {
    const entries = new Map<string, Entry>();
    const placement = layout(source, prefix).positions;
    if (depth > 5) throw new Error("Circuit nesting exceeds the implementation view limit.");
    for (const item of source.nodes) {
      const id = `${prefix}${item.id}`;
      const at = placement.get(item.id)!;
      const origin = { x: baseX + at.x, y: baseY + at.y };
      const expandable =
        GATE_NAMES.includes(item.type as LogicGate) ||
        item.type === "dff" ||
        item.type === "srlatch" ||
        item.type === "dlatch" ||
        item.type === "dramcell" ||
        item.type === "module";
      if (expandable)
        boxes.push({
          id,
          label: item.label || item.module?.name || item.type.toUpperCase(),
          type: item.type,
          expanded: expanded?.has(id) ?? true,
        });
      if (GATE_NAMES.includes(item.type as LogicGate) && (expanded?.has(id) ?? true)) {
        const blueprint = gateBlueprint(item.type as LogicGate, "transistor");
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
        entries.set(item.id, {
          inputs,
          outputs: [{ id: mapId(output.from), output: 0 }],
          nodeIds: ids,
        });
        groups.push({
          id: `${id}/group`,
          label: `${item.label || item.type.toUpperCase()} · CMOS ${item.type.toUpperCase()}`,
          nodeIds: ids,
        });
      } else if (
        (item.type === "module" || ["dff", "srlatch", "dlatch"].includes(item.type)) &&
        (expanded?.has(id) ?? true) &&
        !(item.type === "dff" && item.label?.startsWith("FLOATING GATE"))
      ) {
        const inner =
          item.type === "module"
            ? item.module
            : storageCircuit(item.type as "dff" | "srlatch" | "dlatch");
        if (!inner) continue;
        const innerEntries = expand(inner, `${id}/`, true, depth + 1, origin.x + 20, origin.y + 45);
        const inputPorts = item.type === "module" ? moduleInputs(inner) : inner.nodes.slice(0, 2);
        const outputPorts =
          item.type === "module"
            ? moduleOutputs(inner)
            : inner.nodes.filter((part) => part.id === "out");
        const ids = [...innerEntries.values()].flatMap((entry) => entry.nodeIds);
        entries.set(item.id, {
          inputs: inputPorts.map((port) => innerEntries.get(port.id)?.inputs[0] ?? []),
          outputs: outputPorts.map(
            (port) => innerEntries.get(port.id)?.outputs[0] ?? { id: "", output: 0 },
          ),
          nodeIds: ids,
        });
        groups.push({
          id: `${id}/group`,
          label:
            item.type === "module"
              ? item.label || inner.name
              : `${item.label || inner.name} · ${inner.name}`,
          nodeIds: ids,
        });
      } else if (
        (item.type === "dramcell" ||
          (item.type === "dff" && item.label?.startsWith("FLOATING GATE"))) &&
        (expanded?.has(id) ?? true)
      ) {
        const access = `${id}/access`;
        const storage = `${id}/storage`;
        const flash = item.type === "dff";
        nodes.push({
          id: access,
          type: "nmos",
          x: origin.x + 40,
          y: origin.y + 85,
          label: flash ? "FLOATING-GATE MOS" : "ACCESS NMOS",
          schematicKind: flash ? "floating-gate" : undefined,
        });
        if (!flash)
          nodes.push({
            id: storage,
            type: "junction",
            x: origin.x + 250,
            y: origin.y + 85,
            label: "STORAGE CAPACITOR",
            schematicKind: "capacitor",
          });
        if (!flash) link(access, storage);
        entries.set(item.id, {
          inputs: [[{ to: access, input: 1 }], [{ to: access, input: 0 }]],
          outputs: [{ id: flash ? access : storage, output: 0 }],
          nodeIds: flash ? [access] : [access, storage],
        });
        groups.push({
          id: `${id}/group`,
          label: flash
            ? `${item.label || "Flash cell"} · floating-gate MOS`
            : `${item.label || "DRAM cell"} · 1T1C`,
          nodeIds: flash ? [access] : [access, storage],
        });
      } else {
        const port = nested && ["switch", "clock", "pulse", "lamp"].includes(item.type);
        nodes.push({
          ...item,
          id,
          type: port ? "junction" : item.type,
          x: origin.x,
          y: origin.y,
        });
        entries.set(item.id, {
          inputs:
            nested && ["switch", "clock", "pulse"].includes(item.type)
              ? [[{ to: id, input: 0 }]]
              : Array.from({ length: inputCount(item) }, (_, input) => [{ to: id, input }]),
          outputs: Array.from({ length: port ? 1 : outputCount(item) }, (_, output) => ({
            id,
            output,
          })),
          nodeIds: [id],
        });
      }
    }
    for (const edge of source.wires) {
      const from = entries.get(edge.from)?.outputs[edge.output ?? 0];
      const targets = entries.get(edge.to)?.inputs[edge.input] ?? [];
      if (from?.id)
        for (const target of targets) link(from.id, target.to, target.input, from.output);
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
  const root = layout(circuit, "");
  expand(circuit, "", false, 0, 50, 70);
  return {
    nodes,
    wires,
    groups,
    width: root.width + 100,
    height: root.height + 140,
    transistorCount: nodes.filter((item) => item.type === "nmos" || item.type === "pmos").length,
    boxes,
  };
}
