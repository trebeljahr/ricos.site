import Link from "next/link";
import clsx from "clsx";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CircuitToolbar } from "./CircuitToolbar";
import { ToolbarMenu } from "./ToolbarMenu";
import { ToolbarSwitch } from "./ToolbarSwitch";
import { useHistoryState } from "../../hooks/useHistoryState";
import { usePortWiring } from "../../hooks/usePortWiring";
import { type PortRef, portLabelBank, wiringPorts } from "../../lib/computer/portWiring";
import {
  BLUEPRINT_FAMILIES,
  BLUEPRINT_RECIPES,
  BLUEPRINTS as sourceBlueprints,
  type BlueprintFamily,
  blueprintGate,
  type Circuit,
  GATE_NAMES,
  type GateType,
  gateBlueprint as sourceGateBlueprint,
  initialSnapshot,
  inputCount,
  inputLabel,
  LABELS,
  type LogicGate,
  moduleInputs,
  moduleOutputs,
  type Node,
  outputCount,
  outputLabel,
  PRESETS as sourcePresets,
  type Snapshot,
  step,
  validateCircuit,
  WIRE_COLORS,
  type WireColor,
} from "../../lib/computer/logic";
import { collectUnfoldableIds, storageCircuit } from "../../lib/computer/circuitHierarchy";
import { layoutCircuit } from "../../lib/computer/circuitLayout";
import { nodeWidth, nodeHeight, type DisplayNode as GeometryNode } from "../../lib/computer/nodeGeometry";
import { MEMORY_HINTS } from "../../lib/computer/memoryCircuits";
import { routeCircuitWires, simpleWirePath, wirePath } from "../../lib/computer/wireRouting";
import { ActionIcon } from "./ActionIcon";
import { GateSymbol } from "./GateSymbol";
import styles from "./LogicBuilder.module.css";

const STORAGE = "ricos-computer-circuits-v1";
const WIDTH = 900;
const HEIGHT = 520;
const NODE_WIDTH = 132;
const NODE_HEIGHT = 116;
const MODULE_WIDTH = 300;
const PRESETS = Object.fromEntries(Object.entries(sourcePresets).map(([name, circuit]) => [name, layoutCircuit(circuit)]));
const BLUEPRINTS = Object.fromEntries(Object.entries(sourceBlueprints).map(([name, circuit]) => [name, layoutCircuit(circuit)]));
const gateBlueprint = (gate: LogicGate, family: BlueprintFamily) => layoutCircuit(sourceGateBlueprint(gate, family));
type DisplayNode = GeometryNode & { expanded?: boolean };
const circuitHints: Record<string, string> = {
  ...MEMORY_HINTS,
  "8-bit half adder": "Adds A and B bit by bit. Each bit has SUM and CARRY outputs.",
  "8-bit full adder":
    "Adds A, B, and CARRY IN. OUT0–OUT7 form the sum; CARRY OUT is the final carry.",
  "8-bit 2:1 multiplexer": "SELECT chooses each output bit: 0 takes A, 1 takes B.",
  "8-bit ALU":
    "A and B are 8-bit inputs. OP1 OP0: 00 AND, 01 OR, 10 XOR, 11 ADD. CARRY IN feeds ADD; CARRY OUT reports its final carry. OUT0 is the least significant result bit.",
  "8-bit magnitude comparator": "Compares A and B. GREATER, EQUAL, and LESS indicate the result.",
  "8-bit shift register":
    "On each clock edge, SERIAL IN enters bit 0 and stored bits shift toward bit 7.",
  "8-bit binary counter":
    "On each clock edge, the 8-bit value increases by one. Q0 is the least significant bit.",
};
const MIN_ZOOM = 1e-9;
const MAX_ZOOM = 1e9;
const GRID_BASE_STEP = 20;
const gridSpacing = (zoom: number) =>
  GRID_BASE_STEP * 2 ** Math.round(Math.log2(1 / zoom)) * zoom;
const syncGrid = (viewport: HTMLDivElement, zoom: number,
  bounds: { left: number; top: number }) => {
  const spacing = gridSpacing(zoom);
  const phase = (origin: number, scroll: number) =>
    (((-origin % (spacing / zoom)) * zoom - scroll - spacing / 2) % spacing + spacing) % spacing;
  viewport.style.backgroundSize = `${spacing}px ${spacing}px`;
  viewport.style.backgroundPosition =
    `${phase(bounds.left, viewport.scrollLeft)}px ${phase(bounds.top, viewport.scrollTop)}px`;
};
const formatZoom = (zoom: number) => {
  const percent = zoom * 100;
  if (percent < 0.01 || percent >= 1e6) return `${percent.toExponential(1)}%`;
  return `${Number(percent.toFixed(percent < 1 ? 2 : 0)).toLocaleString("en-US")}%`;
};
const frameBounds = (left: number, top: number, zoom: number, width: number, height: number) => ({
  left: left - (2 * width) / zoom,
  top: top - (2 * height) / zoom,
  right: left + (3 * width) / zoom,
  bottom: top + (3 * height) / zoom,
});
const wireColorNames = Object.keys(WIRE_COLORS) as WireColor[];
const partColors: Record<GateType, string> = {
  switch: "#ffc76a",
  pulse: "#ff8f87",
  clock: "#b7a1ff",
  lamp: "#b9e976",
  input4: "#ffc76a",
  input8: "#ffc76a",
  display4: "#ff6b67",
  display8: "#ff6b67",
  high: "#ffc76a",
  ground: "#7cb8ff",
  nmos: "#69e2e0",
  pmos: "#b7a1ff",
  junction: "#7cb8ff",
  not: "#7cb8ff",
  and: "#69e2e0",
  or: "#69e2e0",
  xor: "#b7a1ff",
  xnor: "#b7a1ff",
  nand: "#ff8f87",
  nor: "#ff8f87",
  dff: "#b9e976",
  srlatch: "#b9e976",
  dlatch: "#b9e976",
  dramcell: "#7cb8ff",
  module: "#ffc76a",
};
type WireDraft = {
  from?: string;
  output?: number;
  to?: string;
  input?: number;
  x: number;
  y: number;
  originX: number;
  originY: number;
};
function PortWirePreview({ wiring }: { wiring: ReturnType<typeof usePortWiring> }) {
  return <g data-port-preview={wiring.previews.length || undefined}>
    {wiring.previews.map(({ from, to }, index) => <path key={index}
      d={wirePath(from, to)}
      className={clsx(styles.portWirePreview, wiring.invalid && styles.portWireInvalid)} />)}
  </g>;
}
const draftPort = (draft: WireDraft): PortRef => draft.from
  ? { nodeId: draft.from, kind: "output", index: draft.output ?? 0 }
  : { nodeId: draft.to!, kind: "input", index: draft.input ?? 0 };
const defaultWireColor = (id: string, nodes: Node[]): WireColor =>
  wireColorNames[
    Math.max(
      0,
      nodes.findIndex((node) => node.id === id),
    ) % wireColorNames.length
  ];
const palette: GateType[] = [
  "switch",
  "pulse",
  "clock",
  "lamp",
  "input4",
  "input8",
  "display4",
  "display8",
  "high",
  "ground",
  "nmos",
  "pmos",
  "junction",
  "not",
  "and",
  "or",
  "xor",
  "xnor",
  "nand",
  "nor",
  "dff",
  "srlatch",
  "dlatch",
];
const clone = (circuit: Circuit): Circuit => JSON.parse(JSON.stringify(circuit));
type ViewportState = { zoom: number; left: number; top: number };
type ViewLevel = { parent: Circuit; snapshot: Snapshot; via: string; moduleId?: string; unfolded: string[]; viewport?: ViewportState; unfoldedViewport?: ViewportState };
type BuilderDocument = { circuit: Circuit; saved: Record<string, Circuit>; viewPath: ViewLevel[]; unfolded: string[] };
const withUpdatedModule = (parent: Circuit, moduleId: string, inner: Circuit): Circuit => ({
  ...parent,
  nodes: parent.nodes.map((item) =>
    item.id === moduleId ? { ...item, module: clone(inner) } : item,
  ),
});
type PortSide = NonNullable<Node["inputSide"]>;
const portSides: PortSide[] = ["top", "right", "bottom", "left"];
const rotatedSide = (side: PortSide, direction: -1 | 1): PortSide =>
  portSides[(portSides.indexOf(side) + direction + portSides.length) % portSides.length];
const inputSide = (node: Node): PortSide => node.inputSide ?? "left";
const outputSide = (node: Node): PortSide => node.outputSide ?? "right";
const sideVector = (side: PortSide) => ({
  left: { x: -1, y: 0 }, top: { x: 0, y: -1 },
  right: { x: 1, y: 0 }, bottom: { x: 0, y: 1 },
})[side];
const orientedWirePath = (start: { x: number; y: number }, end: { x: number; y: number },
  fromSide: PortSide, toSide: PortSide) => {
  if (fromSide === "right" && toSide === "left")
    return end.x > start.x ? simpleWirePath(start, end) : wirePath(start, end);
  const from = sideVector(fromSide);
  const to = sideVector(toSide);
  const exit = { x: start.x + from.x * 24, y: start.y + from.y * 24 };
  const entry = { x: end.x + to.x * 24, y: end.y + to.y * 24 };
  return `M ${start.x} ${start.y} L ${exit.x} ${exit.y} ${wirePath(exit, entry)} L ${end.x} ${end.y}`;
};
const portPoint = (node: DisplayNode, index: number, kind: "input" | "output") => {
  const side = kind === "input" ? inputSide(node) : outputSide(node);
  const sharedSide = inputSide(node) === outputSide(node);
  const count = sharedSide
    ? inputCount(node) + outputCount(node)
    : kind === "input" ? inputCount(node) : outputCount(node);
  const portIndex = sharedSide && kind === "output" ? inputCount(node) + index : index;
  const horizontal = side === "top" || side === "bottom";
  const length = horizontal ? nodeWidth(node) : nodeHeight(node);
  const bitRow = ["input4", "input8", "display4", "display8"].includes(node.type);
  const orderedIndex = horizontal && bitRow ? count - portIndex - 1 : portIndex;
  const edge = horizontal ? 16 : node.expanded ? 88 : node.type === "module" ? 42 : 40;
  const offset = count === 1 ? length / 2 : edge + orderedIndex * ((length - edge - 24) / (count - 1));
  return {
    x: node.x + (horizontal ? offset : side === "left" ? 0 : nodeWidth(node)),
    y: node.y + (horizontal ? side === "top" ? 0 : nodeHeight(node) : offset),
  };
};
const portStyle = (node: DisplayNode, index: number, kind: "input" | "output") => {
  const point = portPoint(node, index, kind);
  return {
    left: `${((point.x - node.x) / nodeWidth(node)) * 100}%`,
    top: `${((point.y - node.y) / nodeHeight(node)) * 100}%`,
  };
};

type InlinePart = DisplayNode & { path: string; child?: InlineLayout; inner?: Circuit; expandable: boolean };
type InlineLayout = { width: number; height: number; originX: number; originY: number;
  parts: InlinePart[]; inputs: Node[]; outputs: Node[]; canExpand: boolean };
const INLINE_X = 12;
const INLINE_Y = 56;
const EMPTY_SNAPSHOT = initialSnapshot();
const intrinsicCircuits = new Map<string, Circuit>();
const isUnfoldable = (node: Node) => node.type === "module" ||
  GATE_NAMES.includes(node.type as LogicGate) || ["dff", "srlatch", "dlatch", "dramcell"].includes(node.type);

const makeInnerCircuit = (node: Node): Circuit | undefined => {
  if (node.type === "module") return node.module;
  if (GATE_NAMES.includes(node.type as LogicGate))
    return gateBlueprint(node.type as LogicGate, "transistor");
  if (node.type === "dff" && node.label?.startsWith("FLOATING GATE"))
    return { name: "Floating gate", nodes: [
      { id: "program", type: "switch", x: 0, y: 80, label: "PROGRAM" },
      { id: "cell", type: "nmos", x: 220, y: 80, label: "FLOATING GATE" },
      { id: "out", type: "lamp", x: 440, y: 80, label: "OUT" },
    ], wires: [
      { id: "program-cell", from: "program", to: "cell", input: 0 },
      { id: "cell-out", from: "cell", to: "out", input: 0 },
    ] };
  if (node.type === "dff" || node.type === "srlatch" || node.type === "dlatch")
    return layoutCircuit(storageCircuit(node.type));
  if (node.type === "dramcell")
    return { name: "DRAM cell", nodes: [
      { id: "data", type: "switch", x: 0, y: 50, label: "DATA" },
      { id: "write", type: "switch", x: 0, y: 200, label: "WRITE" },
      { id: "access", type: "nmos", x: 230, y: 110, label: "ACCESS" },
      { id: "storage", type: "junction", x: 450, y: 110, label: "STORAGE CAPACITOR" },
      { id: "out", type: "lamp", x: 670, y: 110, label: "OUT" },
    ], wires: [
      { id: "data-access", from: "data", to: "access", input: 1 },
      { id: "write-access", from: "write", to: "access", input: 0 },
      { id: "access-storage", from: "access", to: "storage", input: 0 },
      { id: "storage-out", from: "storage", to: "out", input: 0 },
    ] };
  return undefined;
};
const innerCircuit = (node: Node): Circuit | undefined => {
  if (node.type === "module") return node.module;
  if (!isUnfoldable(node)) return undefined;
  const key = node.label?.startsWith("FLOATING GATE") ? "floating-gate" : node.type;
  if (!intrinsicCircuits.has(key)) {
    const inner = makeInnerCircuit(node);
    if (inner) intrinsicCircuits.set(key, inner);
  }
  return intrinsicCircuits.get(key);
};

// Visit only the visible frontier; collapsed descendants need no work yet.
const nextInlineLevel = (circuit: Circuit, prefix: string, unfolded: ReadonlySet<string>): string[] => {
  const immediate = circuit.nodes.filter((node) => isUnfoldable(node) && !unfolded.has(`${prefix}${node.id}`))
    .map((node) => `${prefix}${node.id}`);
  if (immediate.length) return immediate;
  const next = circuit.nodes.flatMap((node) => {
    if (!unfolded.has(`${prefix}${node.id}`)) return [];
    const inner = innerCircuit(node);
    return inner ? nextInlineLevel(inner, `${prefix}${node.id}/`, unfolded) : [];
  });
  const depth = Math.min(...next.map((id) => id.split("/").length));
  return next.filter((id) => id.split("/").length === depth);
};

const editInlineCircuit = (root: Circuit, path: string, edit: (inner: Circuit) => Circuit): Circuit => {
  const segments = path.split("/");
  const structure = (circuit: Circuit): string => JSON.stringify({
    nodes: circuit.nodes.map(({ x, y, label, inputSide, outputSide, module, ...node }) => ({
      ...node, module: module ? structure(module) : undefined,
    })),
    wires: circuit.wires.map(({ from, to, input, output }) => ({ from, to, input, output: output ?? 0 })),
  });
  const update = (circuit: Circuit, index: number): { circuit: Circuit; modified: boolean } => {
    let modified = false;
    const nodes = circuit.nodes.map((node) => {
      if (node.id !== segments[index]) return node;
      const source = innerCircuit(node);
      if (!source) return node;
      const result = index === segments.length - 1 ? { circuit: edit(source), modified: false } : update(source, index + 1);
      const changed = result.circuit;
      if (changed === source) return node;
      modified = index === segments.length - 1 ? structure(source) !== structure(changed) : result.modified;
      const name = !modified || changed.name.startsWith("Modified ") ? changed.name : `Modified ${changed.name}`;
      return { ...node, type: "module" as const, module: { ...changed, name },
        label: !modified || node.label?.startsWith("Modified ") ? node.label : `Modified ${node.label || source.name}` };
    });
    return { circuit: nodes.every((node, i) => node === circuit.nodes[i]) ? circuit : { ...circuit, nodes }, modified };
  };
  return update(root, 0).circuit;
};

const layoutInlineCircuit = (
  circuit: Circuit, prefix: string, unfolded: ReadonlySet<string>, depth = 0,
): InlineLayout => {
  const inputs = moduleInputs(circuit);
  const outputs = moduleOutputs(circuit);
  const boundary = new Set([...inputs, ...outputs].map((node) => node.id));
  const visible = circuit.nodes.filter((node) => !boundary.has(node.id));
  const minX = Math.min(0, ...visible.map((node) => node.x));
  const minY = Math.min(0, ...visible.map((node) => node.y));
  const sizes = visible.map((node) => {
    const path = `${prefix}${node.id}`;
    const inner = unfolded.has(path) && depth < 6 ? innerCircuit(node) : undefined;
    const child = inner ? layoutInlineCircuit(inner, `${path}/`, unfolded, depth + 1) : undefined;
    return { node, path, inner, child,
      width: Math.max(nodeWidth(node), child ? child.width + INLINE_X * 2 : 0),
      height: Math.max(nodeHeight(node), child ? child.height + INLINE_Y + 12 : 148) };
  });
  const parts: InlinePart[] = [];
  for (const item of [...sizes].sort((a, b) => a.node.y - b.node.y || a.node.x - b.node.x)) {
    let x = item.node.x - minX + 72;
    let y = item.node.y - minY + 52;
    // Push overlapping siblings clear of the complete expanded bounds, including
    // secondary collisions caused by an earlier displacement.
    let collision: InlinePart | undefined;
    while ((collision = parts.find((other) => x < other.x + nodeWidth(other) + 28 &&
      x + item.width + 28 > other.x && y < other.y + nodeHeight(other) + 28 &&
      y + item.height + 28 > other.y))) {
      const original = visible.find((node) => node.id === collision!.id)!;
      if (item.node.x >= original.x + nodeWidth(original)) x = collision.x + nodeWidth(collision) + 28;
      else y = collision.y + nodeHeight(collision) + 28;
    }
    parts.push({ ...item.node, x, y, path: item.path, inner: item.inner, child: item.child,
      expandable: isUnfoldable(item.node), expanded: Boolean(item.child), displayWidth: item.width, displayHeight: item.height });
  }
  return {
    width: Math.max(560, ...parts.map((part) => part.x + nodeWidth(part) + 72)),
    height: Math.max(200, Math.max(inputs.length, outputs.length) * 60 + 140,
      ...parts.map((part) => part.y + nodeHeight(part) + 70)),
    parts, inputs, outputs, originX: 72 - minX, originY: 52 - minY,
    canExpand: parts.some((part) => part.expandable && (!part.child || part.child.canExpand)),
  };
};

type InlineCircuitProps = {
  host: DisplayNode;
  circuit: Circuit;
  layout: InlineLayout;
  unfolded: ReadonlySet<string>;
  snapshot: Snapshot;
  onToggle: (path: string) => void;
  onExpandLevel: (path: string, circuit: Circuit) => void;
  onRefoldLevel: (path: string) => void;
  onEnter: (path: string) => void;
  onEdit: (path: string, edit: (inner: Circuit) => Circuit) => void;
  onActivate: (path: string) => void;
  activePath: string | null;
  zoom: number;
  path: string;
};

type InlineEndpoint = {
  id: string; port: number; kind: "input" | "output";
  point: { x: number; y: number }; wirePoint: { x: number; y: number };
  side: PortSide; label: string; boundary?: boolean;
};

const InlineCircuit = memo(function InlineCircuit({ host, circuit, layout, unfolded, snapshot, onToggle,
  onExpandLevel, onRefoldLevel, onEnter, onEdit, onActivate, activePath, zoom, path }: InlineCircuitProps) {
  const root = useRef<HTMLDivElement>(null);
  const diagram = useRef<HTMLDivElement>(null);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [selectedWire, setSelectedWire] = useState<string | null>(null);
  const [pendingPort, setPendingPort] = useState<InlineEndpoint | null>(null);
  const [editingPart, setEditingPart] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");
  const [menu, setMenu] = useState<{ x: number; y: number; part?: Node; wire?: string } | null>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [preview, setPreview] = useState<{ port: InlineEndpoint; point: { x: number; y: number } } | null>(null);
  const interaction = useRef<{
    pointer: number; x: number; y: number; scale: number;
    part?: string; port?: InlineEndpoint; rect: DOMRect;
  } | null>(null);
  const frame = useRef<number | null>(null);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);
  const activate = () => { onActivate(path); root.current?.focus({ preventScroll: true }); };
  const endpoints = useMemo(() => {
    const result: InlineEndpoint[] = [];
    for (const [kind, ports] of [["input", layout.inputs], ["output", layout.outputs]] as const) {
      ports.forEach((port, index) => {
        const edge = portPoint({ ...host, x: 0, y: 0 }, index, kind);
        const side = kind === "input" ? inputSide(host) : outputSide(host);
        const vector = sideVector(side);
        const wirePoint = { x: edge.x - INLINE_X, y: edge.y - INLINE_Y };
        result.push({ id: port.id, port: 0, kind: kind === "input" ? "output" : "input",
          point: { x: wirePoint.x - vector.x * 24, y: wirePoint.y - vector.y * 24 }, wirePoint,
          side: rotatedSide(rotatedSide(side, 1), 1), boundary: true,
          label: port.label || `${kind === "input" ? "IN" : "OUT"} ${index + 1}` });
      });
    }
    layout.parts.forEach((part) => {
      for (const kind of ["input", "output"] as const) {
        const count = kind === "input" ? inputCount(part) : outputCount(part);
        for (let port = 0; port < count; port++) {
          const point = portPoint(part, port, kind);
          result.push({ id: part.id, port, kind, point, wirePoint: point,
            side: kind === "input" ? inputSide(part) : outputSide(part),
            label: `${part.label || LABELS[part.type]} ${kind === "input" ? inputLabel(part, port) : outputLabel(part, port)}` });
        }
      }
    });
    return result;
  }, [layout, host.displayWidth, host.displayHeight, host.expanded, host.type, host.module, host.inputSide, host.outputSide]);
  const endpointMap = useMemo(() => new Map(endpoints.map((port) =>
    [`${port.kind}:${port.id}:${port.port}`, port])), [endpoints]);
  const [portMessage, setPortMessage] = useState("");
  const inlinePorts = useMemo(() => {
    const boundaryPorts = (kind: InlineEndpoint["kind"]) => endpoints
      .filter((port) => port.boundary && port.kind === kind)
      .map((port) => ({ nodeId: port.id, kind, index: port.port, ...port.point,
        bank: `boundary-${kind}-${portLabelBank(port.label)}`, label: port.label }));
    return [...boundaryPorts("output"), ...wiringPorts(layout.parts, portPoint), ...boundaryPorts("input")];
  }, [endpoints, layout.parts]);
  const portWiring = usePortWiring({
    ports: inlinePorts, wires: circuit.wires, zoom,
    toPoint: (x, y) => {
      const rect = diagram.current!.getBoundingClientRect();
      const scale = rect.width / layout.width || zoom;
      return { x: (x - rect.left) / scale, y: (y - rect.top) / scale };
    },
    onStart: () => {
      activate(); cancelInteraction(); setSelectedPart(null); setSelectedWire(null); setPendingPort(null);
    },
    onConnect: (connections) => onEdit(path, (inner) => ({ ...inner, wires: [
      ...inner.wires, ...connections.map((connection) => ({ ...connection, id: crypto.randomUUID(), color: "cyan" as const })),
    ] })),
    onMessage: setPortMessage,
  });
  const clearPortSelection = portWiring.clear;
  useEffect(() => { if (activePath !== path) clearPortSelection(); }, [activePath, path, clearPortSelection]);
  const routes = useMemo(() => routeCircuitWires(circuit.wires.flatMap((wire) => {
    const from = endpointMap.get(`output:${wire.from}:${wire.output ?? 0}`);
    const to = endpointMap.get(`input:${wire.to}:${wire.input}`);
    return from && to ? [{ id: wire.id, from: wire.from, to: wire.to, output: wire.output ?? 0,
      start: from.wirePoint, end: to.wirePoint }] : [];
  }), layout.parts.map((part) => ({ id: part.id, x: part.x, y: part.y,
    width: nodeWidth(part), height: nodeHeight(part) }))), [circuit.wires, endpointMap, layout.parts]);
  const movedPoint = (port: InlineEndpoint, wire = false) => {
    const point = wire ? port.wirePoint : port.point;
    return drag?.id === port.id ? { x: point.x + drag.dx, y: point.y + drag.dy } : point;
  };
  const connectPorts = (first: InlineEndpoint, second: InlineEndpoint) => {
    if (first.kind === second.kind || first.id === second.id) return;
    const from = first.kind === "output" ? first : second;
    const to = first.kind === "input" ? first : second;
    onEdit(path, (inner) => {
      const existing = inner.wires.find((wire) => wire.to === to.id && wire.input === to.port);
      if (existing?.from === from.id && (existing.output ?? 0) === from.port) return inner;
      return { ...inner, wires: [
        ...inner.wires.filter((wire) => wire.to !== to.id || wire.input !== to.port),
        { id: existing?.id ?? crypto.randomUUID(), from: from.id, output: from.port, to: to.id, input: to.port,
          color: existing?.color ?? inner.wires.find((wire) => wire.from === from.id)?.color ?? "cyan" },
      ] };
    });
    setPendingPort(null);
  };
  const choosePort = (port: InlineEndpoint) => {
    activate();
    setMenu(null);
    if (pendingPort && pendingPort.kind !== port.kind) connectPorts(pendingPort, port);
    else setPendingPort(pendingPort === port ? null : port);
  };
  const nearestPort = (source: InlineEndpoint, point: { x: number; y: number }, scale: number) => {
    let nearest: InlineEndpoint | undefined;
    let distance = Math.max(18, 12 / scale);
    for (const port of endpoints) {
      if (port.kind === source.kind || port.id === source.id) continue;
      const next = Math.hypot(port.point.x - point.x, port.point.y - point.y);
      if (next < distance) { nearest = port; distance = next; }
    }
    return nearest;
  };
  const beginWire = (event: React.PointerEvent<HTMLButtonElement>, port: InlineEndpoint) => {
    if (portWiring.pointerDown(event, { nodeId: port.id, kind: port.kind, index: port.port })) return;
    if (event.button !== 0 || !diagram.current) return;
    event.stopPropagation();
    activate();
    setMenu(null);
    const rect = diagram.current.getBoundingClientRect();
    interaction.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY,
      scale: rect.width / layout.width || zoom, rect, port };
    diagram.current.setPointerCapture(event.pointerId);
    setPreview({ port, point: port.point });
  };
  const cancelInteraction = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    interaction.current = null;
    setDrag(null);
    setPreview(null);
  };
  const movePointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const action = interaction.current;
    if (!action || action.pointer !== event.pointerId) return;
    event.stopPropagation();
    const dx = (event.clientX - action.x) / action.scale;
    const dy = (event.clientY - action.y) / action.scale;
    const point = { x: (event.clientX - action.rect.left) / action.scale,
      y: (event.clientY - action.rect.top) / action.scale };
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (action.part) setDrag({ id: action.part, dx, dy });
      if (action.port) setPreview({ port: action.port,
        point: nearestPort(action.port, point, action.scale)?.point ?? point });
    });
  };
  const finishPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const action = interaction.current;
    if (!action || action.pointer !== event.pointerId) return;
    event.stopPropagation();
    const dx = (event.clientX - action.x) / action.scale;
    const dy = (event.clientY - action.y) / action.scale;
    const moved = Math.hypot(event.clientX - action.x, event.clientY - action.y) > 4;
    cancelInteraction();
    if (action.part && moved) {
      // Commit once after the live preview. Preserve the displayed spacing when
      // an expanded sibling has displaced this level's original coordinates.
      onEdit(path, (inner) => ({ ...inner, nodes: inner.nodes.map((node) => {
        const part = layout.parts.find((item) => item.id === node.id);
        return part ? { ...node, x: part.x - layout.originX + (node.id === action.part ? dx : 0),
          y: part.y - layout.originY + (node.id === action.part ? dy : 0) } : node;
      }) }));
    }
    if (action.port) {
      if (!moved) choosePort(action.port);
      else {
        const point = { x: (event.clientX - action.rect.left) / action.scale,
          y: (event.clientY - action.rect.top) / action.scale };
        const target = nearestPort(action.port, point, action.scale);
        if (target) connectPorts(action.port, target);
        else setPendingPort(null);
      }
    }
  };
  const removeSelected = (partId = selectedPart, wireId = selectedWire) => {
    if (!partId && !wireId) return;
    if (partId && layout.outputs.length === 1 && layout.outputs[0].id === partId) return;
    onEdit(path, (inner) => ({ ...inner,
      nodes: partId ? inner.nodes.filter((node) => node.id !== partId) : inner.nodes,
      wires: inner.wires.filter((wire) => wire.id !== wireId && wire.from !== partId && wire.to !== partId),
      groups: inner.groups?.map((group) => ({ ...group, nodeIds: group.nodeIds.filter((id) => id !== partId) }))
        .filter((group) => group.nodeIds.length),
    }));
    setSelectedPart(null); setSelectedWire(null); setPendingPort(null); setMenu(null);
  };
  const beginLabel = (part: Node) => {
    setEditingPart(part.id); setDraftLabel(part.label || ""); setMenu(null);
  };
  const saveLabel = () => {
    if (!editingPart) return;
    const label = draftLabel.trim() || undefined;
    if (circuit.nodes.find((node) => node.id === editingPart)?.label !== label)
      onEdit(path, (inner) => ({ ...inner, nodes: inner.nodes.map((node) =>
        node.id === editingPart ? { ...node, label } : node) }));
    setEditingPart(null);
  };
  const contextMenu = (event: React.MouseEvent, selection: { part?: Node; wire?: string }) => {
    event.preventDefault(); event.stopPropagation(); activate();
    const rect = root.current!.getBoundingClientRect();
    const scale = rect.width / (nodeWidth(host) - INLINE_X * 2) || zoom;
    setSelectedPart(selection.part?.id ?? null); setSelectedWire(selection.wire ?? null);
    setMenu({ x: (event.clientX - rect.left) / scale, y: (event.clientY - rect.top) / scale, ...selection });
  };
  const labelInput = (part: Node) => <input className={styles.nodeNameInput}
    aria-label={`Label for ${part.label || LABELS[part.type]}`} value={draftLabel} autoFocus
    onChange={(event) => setDraftLabel(event.target.value)} onBlur={saveLabel}
    onKeyDown={(event) => { event.stopPropagation();
      if (event.key === "Enter") event.currentTarget.blur();
      if (event.key === "Escape") setEditingPart(null); }} />;
  const portButton = (port: InlineEndpoint, className: string, text?: string) => <button
    type="button" className={clsx(className, pendingPort?.id === port.id &&
      pendingPort.port === port.port && pendingPort.kind === port.kind && styles.pending)}
    aria-label={port.boundary ? `Wire ${port.kind === "output" ? "from input" : "to output"} ${port.label}` :
      `Wire ${port.kind === "output" ? "from" : "to"} ${port.label}`}
    aria-pressed={portWiring.isSelected({ nodeId: port.id, kind: port.kind, index: port.port })}
    data-port-selected={portWiring.isSelected({ nodeId: port.id, kind: port.kind, index: port.port })}
    data-wire-target={portWiring.isTarget({ nodeId: port.id, kind: port.kind, index: port.port })}
    data-port-invalid={portWiring.invalid && portWiring.isTarget({ nodeId: port.id, kind: port.kind, index: port.port })}
    title={port.label} onPointerDown={(event) => beginWire(event, port)}
    onClick={(event) => {
      event.stopPropagation();
      if (portWiring.click(event, { nodeId: port.id, kind: port.kind, index: port.port })) return;
      if (event.detail === 0) choosePort(port);
    }}
    onContextMenu={(event) => contextMenu(event, { part: circuit.nodes.find((part) => part.id === port.id) })}>
    {text}
  </button>;
  const selectedNode = circuit.nodes.find((node) => node.id === selectedPart);
  const hasExpandedChildren = layout.parts.some((part) => part.child);
  return (
    <div ref={root} className={clsx(styles.inlineCircuit, activePath === path && styles.activeInlineCircuit)}
      data-inline-path={path} aria-label={`${circuit.name} expanded circuit`} tabIndex={0}
      onPointerDown={(event) => { event.stopPropagation(); onActivate(path); setMenu(null); }}
      onPointerMove={(event) => { if (!portWiring.pointerMove(event)) movePointer(event); }}
      onPointerUp={(event) => { if (!portWiring.pointerUp(event)) finishPointer(event); }}
      onPointerCancel={() => { cancelInteraction(); portWiring.clear(); }}
      onClick={(event) => { event.stopPropagation(); onActivate(path); }}
      onDoubleClick={(event) => event.stopPropagation()}
      onFocus={(event) => { event.stopPropagation(); onActivate(path); }}
      onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}
      onKeyDown={(event) => {
        if (event.target instanceof Element && event.target.closest("input,select,textarea")) return;
        if (event.key === "Escape") { event.stopPropagation(); cancelInteraction(); portWiring.clear(); setPendingPort(null); setMenu(null); }
        if (activePath !== path) return;
        if (event.key === "Delete" || event.key === "Backspace") {
          event.preventDefault(); event.stopPropagation(); removeSelected();
        }
        if (event.key === "F2" && selectedNode) { event.preventDefault(); event.stopPropagation(); beginLabel(selectedNode); }
      }}>
      <div className={styles.inlineCircuitHeader}>
        <strong title={host.label || circuit.name}>{host.label || circuit.name}</strong>
        <button type="button" disabled={!layout.canExpand} onClick={() => onExpandLevel(path, circuit)}>
          <ActionIcon name="unfold" /> Unfold one level deeper
        </button>
        <button type="button" onClick={() => onRefoldLevel(path)}>
          <ActionIcon name="fold" /> {hasExpandedChildren ? "Refold one level" : "Refold box"}
        </button>
      </div>
      <div ref={diagram} className={styles.inlineDiagram} data-inline-diagram={path} data-port-surface={path}
        data-origin-x={layout.originX} data-origin-y={layout.originY}
        onClick={(event) => {
          if (portWiring.consumeClick()) return;
          if (event.target === event.currentTarget) portWiring.clear();
        }}
        style={{ width: layout.width, height: layout.height }}>
        <svg className={styles.inlineWires} width={layout.width} height={layout.height}
          aria-label={`${circuit.name} internal wires`}>
          <PortWirePreview wiring={portWiring} />
          {circuit.wires.map((wire) => {
            const from = endpointMap.get(`output:${wire.from}:${wire.output ?? 0}`);
            const to = endpointMap.get(`input:${wire.to}:${wire.input}`);
            if (!from || !to) return null;
            const d = drag && (drag.id === from.id || drag.id === to.id)
              ? orientedWirePath(movedPoint(from, true), movedPoint(to, true), from.side, to.side)
              : routes.paths[wire.id] ?? orientedWirePath(from.wirePoint, to.wirePoint, from.side, to.side);
            return <g key={wire.id} style={{ "--wire-color": WIRE_COLORS[wire.color ?? "cyan"] } as React.CSSProperties}>
              <path d={d} className={styles.wireHit} role="button" tabIndex={0}
                aria-label={`Select internal wire from ${from.label} to ${to.label}`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => { event.stopPropagation(); activate(); setSelectedWire(wire.id); setSelectedPart(null); }}
                onContextMenu={(event) => contextMenu(event, { wire: wire.id })}
                onKeyDown={(event) => { if (event.key === "Enter") { setSelectedWire(wire.id); setSelectedPart(null); } }} />
              <path d={d} data-inline-wire={wire.id}
                className={clsx(styles.wire, selectedWire === wire.id && styles.wireSelected)} />
            </g>;
          })}
          {preview && <path className={styles.wirePreview} style={{ "--wire-color": WIRE_COLORS.cyan } as React.CSSProperties}
            d={preview.port.kind === "output" ? simpleWirePath(preview.port.point, preview.point) :
              simpleWirePath(preview.point, preview.port.point)} />}
        </svg>
        {endpoints.filter((port) => port.boundary).map((port) => {
          const node = circuit.nodes.find((part) => part.id === port.id)!;
          return <div key={port.id} className={styles.inlineBoundaryPort}
            style={{ left: port.point.x, top: port.point.y }}>
            {editingPart === port.id ? labelInput(node) : portButton(port, styles.inlineBoundaryButton, port.label)}
          </div>;
        })}
        {layout.parts.map((part) => (
          <div key={part.id} data-inline-part={part.path}
            className={clsx(styles.node, styles.inlinePart, part.child && styles.expandedNode,
              selectedPart === part.id && styles.inlineSelectedPart, drag?.id === part.id && styles.inlineDragging)}
            style={{ "--part-accent": partColors[part.type], left: part.x, top: part.y,
              width: nodeWidth(part), height: nodeHeight(part),
              transform: drag?.id === part.id ? `translate(${drag.dx}px, ${drag.dy}px)` : undefined } as React.CSSProperties}
            role="group" aria-label={`${part.label || LABELS[part.type]} — ${part.type === "module" ? part.module?.name : LABELS[part.type]} part`}
            onPointerDown={(event) => {
              if (event.button !== 0 || event.target instanceof Element &&
                event.target.closest("button,input,select,[role=button]")) return;
              event.stopPropagation(); activate(); portWiring.clear(); setSelectedPart(part.id); setSelectedWire(null); setMenu(null);
              const rect = diagram.current!.getBoundingClientRect();
              interaction.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY,
                scale: rect.width / layout.width || zoom, rect, part: part.id };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onContextMenu={(event) => contextMenu(event, { part })}>
            {Array.from({ length: inputCount(part) }, (_, index) => (
              <div key={`input-${index}`} className={styles.portRow} style={portStyle(part, index, "input")}>
                {portButton(endpointMap.get(`input:${part.id}:${index}`)!, styles.input)}
                {part.type === "module" && !part.child && <span className={styles.inputPortLabel}>{inputLabel(part, index)}</span>}
              </div>
            ))}
            {!part.child && <div className={clsx(styles.nodeBody, styles.inlinePartBody,
              part.type === "module" && styles.moduleBody)}>
              <div className={styles.nodeNameRow}>
                {editingPart === part.id ? labelInput(part) : part.label &&
                  <span className={styles.nodeLabel} title="Double-click to edit label"
                    onDoubleClick={() => beginLabel(part)}>{part.label}</span>}
              </div>
              <span className={styles.nodeSymbol}><GateSymbol type={part.type} circuitName={part.module?.name} /></span>
              <strong className={styles.nodePartName}>{part.type === "module" ? part.module?.name : LABELS[part.type]}</strong>
              {part.type === "module" ? <span className={styles.moduleBits}>
                {inputCount(part)} IN · {outputCount(part)} OUT
              </span> : <span className={styles.bit}>{snapshot.values[part.id] ? "1" : "0"}</span>}
            </div>}
            {!part.child && part.expandable && <div className={styles.nodeActions}>
              <button type="button" title={`Unfold ${part.label || LABELS[part.type]} in place`}
                aria-label={`Unfold ${part.label || LABELS[part.type]} in place`}
                onClick={() => onToggle(part.path)}><ActionIcon name="unfold" /></button>
              {part.type === "module" && <button type="button" title="Open internal view"
                aria-label={`Enter ${part.label || part.module?.name}`} onClick={() => onEnter(part.path)}>↗</button>}
            </div>}
            {part.child && part.inner && <InlineCircuit host={part} circuit={part.inner} layout={part.child}
              unfolded={unfolded} snapshot={snapshot.modules[part.id] ?? EMPTY_SNAPSHOT}
              onToggle={onToggle} onExpandLevel={onExpandLevel} onRefoldLevel={onRefoldLevel}
              onEnter={onEnter} onEdit={onEdit} onActivate={onActivate} activePath={activePath} zoom={zoom} path={part.path} />}
            {Array.from({ length: outputCount(part) }, (_, index) => (
              <div key={`output-${index}`} className={styles.portRow} style={portStyle(part, index, "output")}>
                {part.type === "module" && !part.child && <span className={styles.outputPortLabel}>{outputLabel(part, index)}</span>}
                {portButton(endpointMap.get(`output:${part.id}:${index}`)!, styles.output)}
              </div>
            ))}
          </div>
        ))}
      </div>
      {portMessage && <div className={styles.inlinePortStatus} role="status">{portMessage}</div>}
      {menu && <div className={clsx(styles.contextMenu, styles.inlineContextMenu)} role="menu"
        aria-label="Expanded circuit actions" style={{ left: menu.x, top: menu.y }}
        onPointerDown={(event) => event.stopPropagation()}>
        {menu.part && <button role="menuitem" type="button" onClick={() => beginLabel(menu.part!)}>Rename part</button>}
        <button role="menuitem" type="button"
          onClick={() => removeSelected(menu.part?.id ?? null, menu.wire ?? null)}>
          <ActionIcon name="delete" /> Delete {menu.wire ? "wire" : "part"}
        </button>
      </div>}
    </div>
  );
});

export function LogicBuilder() {
  const history = useHistoryState<BuilderDocument>(() => ({
    circuit: clone(PRESETS["Half adder"]),
    saved: {},
    viewPath: [],
    unfolded: [],
  }));
  const { circuit, saved, viewPath } = history.state;
  const unfolded = useMemo(() => new Set(history.state.unfolded ?? []), [history.state.unfolded]);
  const [nameDraft, setNameDraft] = useState(circuit.name);
  const cancelNameEdit = useRef(false);
  const [snapshot, setSnapshot] = useState<Snapshot>(initialSnapshot);
  const [clockHigh, setClockHigh] = useState(false);
  const [running, setRunning] = useState(false);
  const hasClock = circuit.nodes.some((node) => node.type === "clock");
  useEffect(() => setNameDraft(circuit.name), [circuit.name]);
  useEffect(() => {
    if (!hasClock) setRunning(false);
  }, [hasClock]);
  const [tick, setTick] = useState(0);
  const [rate, setRate] = useState(2);
  const [pending, setPending] = useState<{ from: string; output: number } | null>(null);
  const [wireDraft, setWireDraft] = useState<WireDraft | null>(null);
  const [selectedWires, setSelectedWires] = useState<string[]>([]);
  const [tidyWiring, setTidyWiring] = useState(true);
  const [busWiring, setBusWiring] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [activeInlinePath, setActiveInlinePath] = useState<string | null>(null);
  useEffect(() => {
    if (activeInlinePath && !unfolded.has(activeInlinePath)) setActiveInlinePath(null);
  }, [activeInlinePath, unfolded]);
  const [busSource, setBusSource] = useState("");
  const [editingLabel, setEditingLabel] = useState<{ id: string; value: string } | null>(null);
  const [search, setSearch] = useState("");
  const [circuitFamily, setCircuitFamily] = useState<BlueprintFamily>("transistor");
  const [showVdd, setShowVdd] = useState(true);
  const [showGround, setShowGround] = useState(true);
  const [unfoldedRestore, setUnfoldedRestore] = useState<ViewportState | undefined>();
  const setUnfolded = (change: ReadonlySet<string> | ((current: ReadonlySet<string>) => ReadonlySet<string>)) =>
    history.update((current) => ({ ...current, unfolded: [...(typeof change === "function"
      ? change(new Set(current.unfolded ?? [])) : change)] }));
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    kind: "node" | "wire" | "board";
    id?: string;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as globalThis.Node)) setMenu(null);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
  }, [menu]);
  const rotatePart = (id: string, direction: -1 | 1) => {
    setCircuit((current) => ({
      ...current,
      nodes: current.nodes.map((node) => node.id === id
        ? {
            ...node,
            inputSide: rotatedSide(inputSide(node), direction),
            outputSide: rotatedSide(outputSide(node), direction),
          }
        : node),
    }));
    setMenu(null);
  };
  const [marquee, setMarquee] = useState<{
    x: number;
    y: number;
    endX: number;
    endY: number;
  } | null>(null);
  const publish = (next: BuilderDocument, track = true) => {
    if (track) history.update(() => next);
    else history.replace(() => next);
  };
  const setCircuit = (change: Circuit | ((current: Circuit) => Circuit)) => {
    history.update((current) => ({
      ...current,
      circuit: typeof change === "function" ? change(current.circuit) : change,
    }));
  };
  const updateInline = (path: string, edit: (inner: Circuit) => Circuit) => {
    setCircuit((current) => editInlineCircuit(current, path, edit));
    setSelected([]);
    setMessage("Expanded circuit updated.");
  };
  const setSaved = (
    change:
      | Record<string, Circuit>
      | ((current: Record<string, Circuit>) => Record<string, Circuit>),
  ) => {
    history.update((current) => ({
      ...current,
      saved: typeof change === "function" ? change(current.saved) : change,
    }));
  };
  const beginTransaction = history.begin;
  const endTransaction = history.end;
  const travel = (direction: "undo" | "redo") => {
    portWiring.clear();
    setActiveInlinePath(null);
    if (!history.travel(direction)) return;
    const next = history.current();
    setRunning(false);
    setSelected([]);
    setSelectedWires([]);
    setEditingLabel(null);
    setPending(null);
    setWireDraft(null);
    wireDraftRef.current = null;
    setMenu(null);
    circuitRef.current = next.circuit;
    resetRuntime();
    setMessage(direction === "undo" ? "Undid change." : "Redid change.");
  };
  const [dialog, setDialog] = useState<"save" | "clear" | null>(null);
  const [saveName, setSaveName] = useState("");
  const [message, setMessage] = useState(
    "Shift-click or Shift-drag across ports to select them. Drag a selected port to connect multiple wires.",
  );
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const expandedDetails = useMemo(() => new Map(circuit.nodes.flatMap((node) => {
    if (!unfolded.has(node.id)) return [];
    const inner = innerCircuit(node);
    if (!inner) return [];
    const layout = layoutInlineCircuit(inner, `${node.id}/`, unfolded);
    return [[node.id, { inner, layout, width: Math.max(nodeWidth(node), layout.width + INLINE_X * 2),
      height: Math.max(nodeHeight(node), layout.height + INLINE_Y + 12) }]] as const;
  })), [circuit.nodes, unfolded]);
  const canvasCounts = useMemo(() => {
    const counts = { parts: circuit.nodes.length, wires: circuit.wires.length };
    const addExpanded = (inner: Circuit, layout: InlineLayout) => {
      counts.parts += layout.parts.length;
      counts.wires += inner.wires.length;
      for (const part of layout.parts) {
        if (part.inner && part.child) addExpanded(part.inner, part.child);
      }
    };
    for (const { inner, layout } of expandedDetails.values()) addExpanded(inner, layout);
    return counts;
  }, [circuit.nodes.length, circuit.wires.length, expandedDetails]);
  const displayNodes = useMemo<DisplayNode[]>(() => circuit.nodes.map((node) => {
    let x = node.x;
    let y = node.y;
    for (const source of circuit.nodes) {
      if (source.id === node.id) continue;
      const detail = expandedDetails.get(source.id);
      if (!detail) continue;
      if (node.x >= source.x + nodeWidth(source) && node.y + nodeHeight(node) > source.y && node.y < source.y + detail.height)
        x += detail.width - nodeWidth(source) + 36;
      else if (node.y >= source.y + nodeHeight(source) && node.x + nodeWidth(node) > source.x && node.x < source.x + detail.width)
        y += detail.height - nodeHeight(source) + 36;
    }
    const detail = expandedDetails.get(node.id);
    return { ...node, x, y, expanded: Boolean(detail), displayWidth: detail?.width, displayHeight: detail?.height };
  }), [circuit.nodes, expandedDetails]);
  const [selectMode, setSelectMode] = useState(false);
  const [bounds, setBounds] = useState({ left: -2000, top: -2000, right: 3000, bottom: 2500 });
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;
  const canvasWidth = bounds.right - bounds.left;
  const canvasHeight = bounds.bottom - bounds.top;
  const renderScale = Math.max(0.02, Math.min(zoom, 16));
  const boardRatio = zoom / renderScale;
  const previousBounds = useRef(bounds);
  useEffect(() => {
    if (!displayNodes.length) return;
    const left = Math.min(...displayNodes.map((node) => node.x)) - 300;
    const top = Math.min(...displayNodes.map((node) => node.y)) - 300;
    const right = Math.max(...displayNodes.map((node) => node.x + nodeWidth(node))) + 300;
    const bottom = Math.max(...displayNodes.map((node) => node.y + nodeHeight(node))) + 300;
    setBounds((current) => left >= current.left && top >= current.top &&
      right <= current.right && bottom <= current.bottom ? current : {
        left: Math.min(current.left, left),
        top: Math.min(current.top, top),
        right: Math.max(current.right, right),
        bottom: Math.max(current.bottom, bottom),
      });
  }, [displayNodes]);

  const routes = useMemo(
    () =>
      routeCircuitWires(
        circuit.wires.flatMap((wire) => {
          const from = displayNodes.find((node) => node.id === wire.from);
          const to = displayNodes.find((node) => node.id === wire.to);
          return from && to
            ? [
                {
                  id: wire.id,
                  from: wire.from,
                  to: wire.to,
                  output: wire.output ?? 0,
                  start: portPoint(from, wire.output ?? 0, "output"),
                  end: portPoint(to, wire.input, "input"),
                },
              ]
            : [];
        }),
        displayNodes.map((node) => ({
          id: node.id,
          x: node.x,
          y: node.y,
          width: nodeWidth(node),
          height: nodeHeight(node),
        })),
        busWiring && circuit.wires.every((wire) => {
          const from = displayNodes.find((node) => node.id === wire.from);
          const to = displayNodes.find((node) => node.id === wire.to);
          return from && to && outputSide(from) === "right" && inputSide(to) === "left";
        }),
      ),
    [displayNodes, circuit.wires, busWiring],
  );
  const [drag, setDrag] = useState<{
    x: number;
    y: number;
    starts: Record<string, { x: number; y: number }>;
  } | null>(null);
  const board = useRef<HTMLDivElement>(null);
  const boardViewport = useRef<HTMLDivElement>(null);
  const workspace = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const captureViewport = (): ViewportState => ({
    zoom: zoomRef.current,
    left: (boardViewport.current?.scrollLeft ?? 0) + bounds.left * zoomRef.current,
    top: (boardViewport.current?.scrollTop ?? 0) + bounds.top * zoomRef.current,
  });
  const restoreViewport = (state?: ViewportState) => {
    const next = state ?? { zoom: 1, left: 0, top: 0 };
    const viewport = boardViewport.current;
    const width = viewport?.clientWidth || 900;
    const height = viewport?.clientHeight || 520;
    const framed = frameBounds(next.left / next.zoom, next.top / next.zoom,
      next.zoom, width, height);
    const target = {
      left: (next.left / next.zoom - framed.left) * next.zoom,
      top: (next.top / next.zoom - framed.top) * next.zoom,
    };
    zoomRef.current = next.zoom;
    boundsRef.current = framed;
    queuedScroll.current = target;
    setZoom(next.zoom);
    setBounds(framed);
  };
  useLayoutEffect(() => {
    const previous = previousBounds.current;
    const viewport = boardViewport.current;
    if (viewport) {
      // Apply the camera only after React has rendered its new bounds and scale.
      // An animation frame can run before that commit and compensate twice.
      if (queuedScroll.current) {
        viewport.scrollLeft = queuedScroll.current.left;
        viewport.scrollTop = queuedScroll.current.top;
        queuedScroll.current = null;
      } else if (previous !== bounds) {
        viewport.scrollLeft += (previous.left - bounds.left) * zoomRef.current;
        viewport.scrollTop += (previous.top - bounds.top) * zoomRef.current;
      }
    }
    if (viewport) syncGrid(viewport, zoomRef.current, bounds);
    previousBounds.current = bounds;
  }, [bounds, zoom]);
  const recenterCanvas = () => {
    const viewport = boardViewport.current;
    if (!viewport || queuedScroll.current) return;
    syncGrid(viewport, zoomRef.current, bounds);
    const margin = Math.min(500, viewport.clientWidth / 2, viewport.clientHeight / 2);
    const stepX = (2 * viewport.clientWidth) / zoomRef.current;
    const stepY = (2 * viewport.clientHeight) / zoomRef.current;
    setBounds((current) => {
      const shiftX = viewport.scrollLeft < margin ? -stepX :
        viewport.scrollWidth - viewport.clientWidth - viewport.scrollLeft < margin ? stepX : 0;
      const shiftY = viewport.scrollTop < margin ? -stepY :
        viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop < margin ? stepY : 0;
      return shiftX || shiftY ? {
        left: current.left + shiftX,
        top: current.top + shiftY,
        right: current.right + shiftX,
        bottom: current.bottom + shiftY,
      } : current;
    });
  };
  const queuedScroll = useRef<{ left: number; top: number } | null>(null);
  const spaceHeld = useRef(false);
  const activePan = useRef<{ id: number; x: number; y: number } | null>(null);
  const touchPointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; x: number; y: number } | null>(null);
  const touchMoved = useRef(false);
  const inputFile = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const circuitRef = useRef(circuit);
  const snapshotRef = useRef(snapshot);
  const clockRef = useRef(clockHigh);
  const dragRef = useRef(drag);
  const wireDraftRef = useRef<WireDraft | null>(null);
  const suppressBoardClick = useRef(false);
  circuitRef.current = circuit;
  snapshotRef.current = snapshot;
  clockRef.current = clockHigh;
  dragRef.current = drag;

  const zoomAt = useCallback(
    (
      requested: number,
      anchorX: number,
      anchorY: number,
      destinationX = anchorX,
      destinationY = anchorY,
    ) => {
      const viewport = boardViewport.current;
      if (!viewport) return;
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, requested));
      const old = zoomRef.current;
      const rect = viewport.getBoundingClientRect();
      const left = queuedScroll.current?.left ?? viewport.scrollLeft;
      const top = queuedScroll.current?.top ?? viewport.scrollTop;
      const pointX = boundsRef.current.left + (anchorX - rect.left + left) / old;
      const pointY = boundsRef.current.top + (anchorY - rect.top + top) / old;
      const visibleLeft = pointX - (destinationX - rect.left) / next;
      const visibleTop = pointY - (destinationY - rect.top) / next;
      const framed = frameBounds(visibleLeft, visibleTop, next,
        viewport.clientWidth || rect.width || 900,
        viewport.clientHeight || rect.height || 520);
      const target = {
        left: (visibleLeft - framed.left) * next,
        top: (visibleTop - framed.top) * next,
      };
      zoomRef.current = next;
      boundsRef.current = framed;
      queuedScroll.current = target;
      setZoom(next);
      setBounds(framed);
    },
    [],
  );
  const zoomFromCenter = (next: number) => {
    const rect = boardViewport.current?.getBoundingClientRect();
    if (!rect) return;
    zoomAt(next, rect.left + rect.width / 2, rect.top + rect.height / 2);
  };
  const pendingFit = useRef(false);
  const fitCanvas = useCallback(() => {
    const viewport = boardViewport.current;
    if (!viewport?.clientWidth || !viewport.clientHeight) return;
    const left = Math.min(0, routes.bounds?.left ?? 0, ...displayNodes.map((node) => node.x)) - 40;
    const top = Math.min(0, routes.bounds?.top ?? 0, ...displayNodes.map((node) => node.y)) - 40;
    const right = Math.max(WIDTH, routes.bounds?.right ?? 0, ...displayNodes.map((node) => node.x + nodeWidth(node))) + 40;
    const bottom = Math.max(HEIGHT, routes.bounds?.bottom ?? 0, ...displayNodes.map((node) => node.y + nodeHeight(node))) + 40;
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM,
      (viewport.clientWidth - 24) / (right - left),
      (viewport.clientHeight - 24) / (bottom - top)));
    const visibleLeft = left - (viewport.clientWidth / next - (right - left)) / 2;
    const visibleTop = top - (viewport.clientHeight / next - (bottom - top)) / 2;
    const framed = frameBounds(visibleLeft, visibleTop, next,
      viewport.clientWidth, viewport.clientHeight);
    const target = {
      left: (visibleLeft - framed.left) * next,
      top: (visibleTop - framed.top) * next,
    };
    zoomRef.current = next;
    boundsRef.current = framed;
    queuedScroll.current = target;
    setZoom(next);
    setBounds(framed);
  }, [displayNodes, routes.bounds]);
  useLayoutEffect(() => {
    if (!pendingFit.current) return;
    pendingFit.current = false;
    fitCanvas();
  }, [fitCanvas]);
  useEffect(() => {
    const viewport = boardViewport.current;
    const workspaceElement = workspace.current;
    if (!viewport || !workspaceElement) return;
    let gestureScale = 1;
    const gestureAnchor = (event: Event) => {
      const rect = viewport.getBoundingClientRect();
      const point = event as Event & { clientX?: number; clientY?: number };
      return {
        x: Number.isFinite(point.clientX) ? point.clientX! : rect.left + rect.width / 2,
        y: Number.isFinite(point.clientY) ? point.clientY! : rect.top + rect.height / 2,
      };
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const anchor = gestureAnchor(event);
      const pixels = event.deltaY * (event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 :
        event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? viewport.clientHeight : 1);
      zoomAt(zoomRef.current * Math.exp(-pixels * (event.ctrlKey || event.metaKey ? 0.01 : 0.0015)),
        anchor.x, anchor.y);
    };
    const onGestureStart = (event: Event) => {
      event.preventDefault();
      gestureScale = 1;
    };
    const onGestureChange = (event: Event) => {
      event.preventDefault();
      const scale = (event as Event & { scale?: number }).scale;
      if (!scale || !Number.isFinite(scale)) return;
      const anchor = gestureAnchor(event);
      zoomAt(zoomRef.current * (scale / gestureScale), anchor.x, anchor.y);
      gestureScale = scale;
    };
    const onGestureEnd = (event: Event) => event.preventDefault();
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 1) event.preventDefault();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.code === "Space" &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement) &&
        !(event.target instanceof HTMLButtonElement)
      )
        spaceHeld.current = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") spaceHeld.current = false;
    };
    viewport.addEventListener("wheel", onWheel, { capture: true, passive: false });
    workspaceElement.addEventListener("gesturestart", onGestureStart, {
      capture: true,
      passive: false,
    });
    workspaceElement.addEventListener("gesturechange", onGestureChange, {
      capture: true,
      passive: false,
    });
    workspaceElement.addEventListener("gestureend", onGestureEnd, {
      capture: true,
      passive: false,
    });
    viewport.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      viewport.removeEventListener("wheel", onWheel, true);
      workspaceElement.removeEventListener("gesturestart", onGestureStart, true);
      workspaceElement.removeEventListener("gesturechange", onGestureChange, true);
      workspaceElement.removeEventListener("gestureend", onGestureEnd, true);
      viewport.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [zoomAt]);

  useEffect(() => {
    requestAnimationFrame(() => restoreViewport());
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const parsed = JSON.parse(raw) as { current?: unknown; saved?: Record<string, unknown> };
        const restored = validateCircuit(parsed.current);
        if (restored) history.replace((current) => ({ ...current, circuit: restored }));
        if (parsed.saved && typeof parsed.saved === "object") {
          const valid: Record<string, Circuit> = {};
          for (const [name, value] of Object.entries(parsed.saved)) {
            const item = validateCircuit(value);
            if (item) valid[name] = item;
          }
          history.replace((current) => ({ ...current, saved: valid }));
        }
      }
    } catch {
      setMessage("Saved circuits could not be loaded. Starter circuit is ready.");
    }
    history.reset(history.current());
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      const root = viewPath.reduceRight(
        (inner, level) =>
          level.moduleId ? withUpdatedModule(level.parent, level.moduleId, inner) : level.parent,
        circuit,
      );
      localStorage.setItem(STORAGE, JSON.stringify({ current: root, saved }));
    } catch {
      setMessage("Browser storage is full. Export this circuit to keep it.");
    }
  }, [circuit, saved, ready, viewPath]);
  useEffect(() => {
    if (dialog) dialogRef.current?.querySelector<HTMLElement>("input, button")?.focus();
  }, [dialog]);

  const advance = useCallback((pulseIds: Record<string, boolean> = {}, forcedClock?: boolean) => {
    const high = forcedClock ?? !clockRef.current;
    clockRef.current = high;
    setClockHigh(high);
    const next = step(circuitRef.current, snapshotRef.current, high, pulseIds);
    snapshotRef.current = next;
    setSnapshot(next);
    setTick((value) => value + 1);
  }, []);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => advance(), 1000 / (rate * 2));
    return () => window.clearInterval(timer);
  }, [running, rate, advance]);
  useEffect(() => {
    const next = step(circuit, snapshotRef.current, clockRef.current);
    snapshotRef.current = next;
    setSnapshot(next);
  }, [circuit]);

  const resetRuntime = () => {
    setRunning(false);
    setClockHigh(false);
    clockRef.current = false;
    setTick(0);
    const next = step(circuitRef.current, initialSnapshot(), false);
    snapshotRef.current = next;
    setSnapshot(next);
  };
  const clearCanvas = () => {
    portWiring.clear();
    if (!circuit.nodes.length && !circuit.wires.length) return;
    setDialog(null);
    const empty = { ...circuit, nodes: [], wires: [] };
    circuitRef.current = empty;
    setCircuit(empty);
    setPending(null);
    setWireDraft(null);
    wireDraftRef.current = null;
    setSelectedWires([]);
    setSelected([]);
    setMarquee(null);
    setDrag(null);
    setMenu(null);
    resetRuntime();
    setMessage("Canvas cleared.");
  };
  const load = (next: Circuit) => {
    portWiring.clear();
    pendingFit.current = true;
    const copy = clone(next);
    circuitRef.current = copy;
    publish({ ...history.current(), circuit: copy, viewPath: [], unfolded: [] });
    setPending(null);
    setWireDraft(null);
    wireDraftRef.current = null;
    setSelectedWires([]);
    setSelected([]);
    resetRuntime();
    setMessage(`${copy.name} loaded.`);
  };
  const enterCircuit = (next: Circuit, via: string, moduleId?: string) => {
    portWiring.clear();
    pendingFit.current = true;
    const parentSnapshot = snapshotRef.current;
    const nextPath = [
      ...viewPath,
      { parent: clone(circuit), snapshot: parentSnapshot, via, moduleId, unfolded: [...unfolded], viewport: captureViewport() },
    ];
    setUnfoldedRestore(undefined);
    restoreViewport();
    const copy = clone(next);
    if (moduleId) {
      moduleInputs(copy).forEach((input, port) => {
        const incoming = circuit.wires.find((wire) => wire.to === moduleId && wire.input === port);
        input.value = incoming
          ? Boolean(
              snapshot.outputs[incoming.from]?.[incoming.output ?? 0] ??
                snapshot.values[incoming.from],
            )
          : false;
      });
    }
    circuitRef.current = copy;
    publish({ ...history.current(), circuit: copy, viewPath: nextPath, unfolded: [] }, false);
    setRunning(false);
    setSelected([]);
    setSelectedWires([]);
    setPending(null);
    const inner = step(
      copy,
      moduleId ? (parentSnapshot.modules[moduleId] ?? initialSnapshot()) : initialSnapshot(),
      clockRef.current,
    );
    snapshotRef.current = inner;
    setSnapshot(inner);
    setMessage(`Inside ${via}. Use Back to return.`);
  };
  const returnToDepth = (depth: number) => {
    if (depth < 0 || depth >= viewPath.length) return;
    let parent = circuit;
    let childSnapshot = snapshotRef.current;
    let childUnfolded = new Set(unfolded);
    for (let index = viewPath.length - 1; index >= depth; index--) {
      const level = viewPath[index];
      parent = level.moduleId ? withUpdatedModule(level.parent, level.moduleId, parent) : level.parent;
      const restored = new Set(level.unfolded ?? []);
      if (level.moduleId) {
        for (const id of restored)
          if (id.startsWith(`${level.moduleId}/`)) restored.delete(id);
        for (const id of childUnfolded) restored.add(`${level.moduleId}/${id}`);
      }
      childUnfolded = restored;
      childSnapshot = level.moduleId
        ? { ...level.snapshot, modules: { ...level.snapshot.modules, [level.moduleId]: childSnapshot } }
        : level.snapshot;
    }
    const level = viewPath[depth];
    setUnfoldedRestore(level.unfoldedViewport);
    restoreViewport(level.viewport);
    circuitRef.current = parent;
    publish({ ...history.current(), circuit: parent, viewPath: viewPath.slice(0, depth), unfolded: [...childUnfolded] }, false);
    setRunning(false);
    setSelected(level.moduleId ? [level.moduleId] : []);
    setSelectedWires([]);
    setPending(null);
    const restored = step(parent, childSnapshot, clockRef.current);
    snapshotRef.current = restored;
    setSnapshot(restored);
    setMessage(`Back to ${parent.name}.`);
  };
  const goBack = () => returnToDepth(viewPath.length - 1);
  const enterModulePath = (path: string, unfoldedViewport?: ViewportState) => {
    let source = circuit;
    let innerSnapshot = snapshotRef.current;
    const levels: ViewLevel[] = [];
    const segments = path.split("/");
    for (const [index, id] of segments.entries()) {
      const part = source.nodes.find((item) => item.id === id && item.type === "module");
      if (!part?.module) return;
      const parentPrefix = index ? `${segments.slice(0, index).join("/")}/` : "";
      levels.push({ parent: clone(source), snapshot: innerSnapshot,
        via: part.label || part.module.name, moduleId: part.id,
        unfolded: [...unfolded].filter((entry) => entry.startsWith(parentPrefix))
          .map((entry) => entry.slice(parentPrefix.length)),
        viewport: index === 0 ? captureViewport() : undefined,
        unfoldedViewport: index === 0 ? unfoldedViewport : undefined });
      source = part.module;
      innerSnapshot = innerSnapshot.modules[id] ?? initialSnapshot();
    }
    setUnfoldedRestore(undefined);
    restoreViewport();
    const copy = clone(source);
    pendingFit.current = true;
    moduleInputs(copy).forEach((input) => { input.value = Boolean(innerSnapshot.values[input.id]); });
    circuitRef.current = copy;
    publish({ ...history.current(), circuit: copy, viewPath: [...viewPath, ...levels],
      unfolded: [...unfolded].filter((entry) => entry.startsWith(`${path}/`))
        .map((entry) => entry.slice(path.length + 1)) }, false);
    setRunning(false);
    setSelected([]);
    setSelectedWires([]);
    setPending(null);
    const next = step(copy, innerSnapshot, clockRef.current);
    snapshotRef.current = next;
    setSnapshot(next);
    setMessage(`Inside ${copy.name}. Use Back to return.`);
  };
  const toggleUnfolded = (id: string) => setUnfolded((current) => {
    const next = new Set(current);
    if (next.has(id)) {
      for (const entry of next)
        if (entry === id || entry.startsWith(`${id}/`)) next.delete(entry);
    } else next.add(id);
    return next;
  });
  const expandOneLevel = (path: string, inner: Circuit) => {
    const candidates = nextInlineLevel(inner, `${path}/`, unfolded);
    if (candidates.length) setUnfolded((current) => new Set([...current, ...candidates]));
  };
  const refoldOneLevel = (path: string) => {
    const descendants = [...unfolded].filter((id) => id.startsWith(`${path}/`));
    if (!descendants.length) return toggleUnfolded(path);
    const depth = Math.max(...descendants.map((id) => id.split("/").length));
    setUnfolded((current) => new Set([...current].filter((id) =>
      !descendants.includes(id) || id.split("/").length !== depth)));
  };
  const refoldCanvasLevel = () => {
    if (!unfolded.size) return;
    const depth = Math.max(...[...unfolded].map((id) => id.split("/").length));
    setUnfolded((current) => new Set([...current].filter((id) => id.split("/").length !== depth)));
  };
  const inlineActionsRef = useRef({ toggleUnfolded, expandOneLevel, refoldOneLevel, enterModulePath, updateInline });
  inlineActionsRef.current = { toggleUnfolded, expandOneLevel, refoldOneLevel, enterModulePath, updateInline };
  const inlineActions = useMemo(() => ({
    onToggle: (path: string) => inlineActionsRef.current.toggleUnfolded(path),
    onExpandLevel: (path: string, inner: Circuit) => inlineActionsRef.current.expandOneLevel(path, inner),
    onRefoldLevel: (path: string) => inlineActionsRef.current.refoldOneLevel(path),
    onEnter: (path: string) => inlineActionsRef.current.enterModulePath(path),
    onEdit: (path: string, edit: (inner: Circuit) => Circuit) => inlineActionsRef.current.updateInline(path, edit),
  }), []);
  const viewGate = (gate: LogicGate, family: BlueprintFamily, source?: Node) => {
    const next = gateBlueprint(gate, family);
    if (source) {
      for (const [port, id] of ["a", "b"].entries()) {
        const inputWire = circuit.wires.find(
          (wire) => wire.to === source.id && wire.input === port,
        );
        const inputNode = next.nodes.find((item) => item.id === id);
        if (inputNode)
          inputNode.value = inputWire
            ? Boolean(
                snapshot.outputs[inputWire.from]?.[inputWire.output ?? 0] ??
                  snapshot.values[inputWire.from],
              )
            : false;
      }
    }
    enterCircuit(next, source?.label || LABELS[gate]);
  };
  const addNode = (type: GateType, position?: { x: number; y: number }, inlineTarget?: string | null) => {
    const inlinePath = inlineTarget === undefined ? activeInlinePath : inlineTarget;
    if (inlinePath) {
      const id = crypto.randomUUID();
      updateInline(inlinePath, (inner) => {
        if (inner.nodes.length >= 300 || type === "switch" && moduleInputs(inner).length >= 24 ||
          type === "lamp" && moduleOutputs(inner).length >= 24) return inner;
        return { ...inner, nodes: [...inner.nodes, {
          id, type, x: position?.x ?? Math.max(100, ...inner.nodes.map((node) => node.x)) + 160,
          y: position?.y ?? 80 + (inner.nodes.length % 5) * 105, value: false,
          label: type === "switch" ? `IN ${moduleInputs(inner).length + 1}` :
            type === "lamp" ? `OUT ${moduleOutputs(inner).length + 1}` : undefined,
        }] };
      });
      return;
    }
    const index = circuit.nodes.length;
    const next: Node = {
      id: crypto.randomUUID(),
      type,
      x: position?.x ?? 110 + (index % 5) * 155,
      y: position?.y ?? 90 + (Math.floor(index / 5) % 5) * 90,
      value: false,
      ...(type === "input4" || type === "input8" ? { numberValue: 0 } : {}),
    };
    setCircuit((current) => ({ ...current, nodes: [...current.nodes, next] }));
    setSelected([next.id]);
    setPending(null);
  };
  const insertionCenter = () => {
    const viewport = boardViewport.current;
    const camera = captureViewport();
    return {
      x: (camera.left + (viewport?.clientWidth || 900) / 2) / camera.zoom,
      y: (camera.top + (viewport?.clientHeight || 520) / 2) / camera.zoom,
    };
  };
  const addSavedCircuit = (source: Circuit, position?: { x: number; y: number }, inlineTarget?: string | null) => {
    if (!source.nodes.length) {
      setMessage("This saved circuit is empty. Add parts before inserting it.");
      return;
    }
    if (!moduleOutputs(source).length || moduleInputs(source).length > 24 || moduleOutputs(source).length > 24) {
      insertCircuit(source, position ?? insertionCenter(),
        inlineTarget === undefined ? activeInlinePath : inlineTarget);
      return;
    }
    const inlinePath = inlineTarget === undefined ? activeInlinePath : inlineTarget;
    if (inlinePath && !position) {
      addModule(source, undefined, inlinePath);
      return;
    }
    const center = position ?? insertionCenter();
    addModule(source, { x: center.x - MODULE_WIDTH / 2,
      y: center.y - nodeHeight({ id: "", type: "module", module: source, x: 0, y: 0 }) / 2 }, inlineTarget);
  };
  const addModule = (source: Circuit, position?: { x: number; y: number }, inlineTarget?: string | null) => {
    if (
      !moduleOutputs(source).length ||
      moduleInputs(source).length > 24 ||
      moduleOutputs(source).length > 24
    ) {
      setMessage("This circuit needs 1–24 outputs and at most 24 inputs to become a black box.");
      return;
    }
    const inlinePath = inlineTarget === undefined ? activeInlinePath : inlineTarget;
    if (inlinePath) {
      updateInline(inlinePath, (inner) => inner.nodes.length >= 300 ? inner : ({ ...inner, nodes: [...inner.nodes, {
        id: crypto.randomUUID(), type: "module", module: clone(source),
        x: position?.x ?? Math.max(100, ...inner.nodes.map((node) => node.x)) + 240,
        y: position?.y ?? 80 + (inner.nodes.length % 5) * 105,
      }] }));
      return;
    }
    const index = circuit.nodes.length;
    const next: Node = {
      id: crypto.randomUUID(),
      type: "module",
      module: clone(source),
      x: position?.x ?? 70 + (index % 3) * 270,
      y: 0,
    };
    next.y = position?.y ?? 90 + (Math.floor(index / 3) % 5) * 90;
    setCircuit((current) => ({ ...current, nodes: [...current.nodes, next] }));
    setSelected([next.id]);
    setMessage(`${source.name} added as a black box.`);
  };
  const insertCircuit = (source: Circuit, position: { x: number; y: number }, inlinePath?: string | null) => {
    if (!source.nodes.length) return;
    if (inlinePath) {
      updateInline(inlinePath, (inner) => {
        if (inner.nodes.length + source.nodes.length > 300 ||
          moduleInputs(inner).length + moduleInputs(source).length > 24 ||
          moduleOutputs(inner).length + moduleOutputs(source).length > 24) return inner;
        const ids = new Map(source.nodes.map((node) => [node.id, crypto.randomUUID()]));
        const minX = Math.min(...source.nodes.map((node) => node.x));
        const minY = Math.min(...source.nodes.map((node) => node.y));
        const left = position.x - (Math.max(...source.nodes.map((node) => node.x + nodeWidth(node))) - minX) / 2;
        const top = position.y - (Math.max(...source.nodes.map((node) => node.y + nodeHeight(node))) - minY) / 2;
        return { ...inner,
          nodes: [...inner.nodes, ...source.nodes.map((node) => ({ ...node,
            id: ids.get(node.id)!, x: left + node.x - minX, y: top + node.y - minY }))],
          wires: [...inner.wires, ...source.wires.map((wire) => ({ ...wire,
            id: crypto.randomUUID(), from: ids.get(wire.from)!, to: ids.get(wire.to)! }))],
          groups: [...(inner.groups ?? []), ...(source.groups ?? []).map((group) => ({
            ...group, id: crypto.randomUUID(), nodeIds: group.nodeIds.map((id) => ids.get(id)!),
          }))],
        };
      });
      return;
    }
    const minX = Math.min(...source.nodes.map((node) => node.x));
    const minY = Math.min(...source.nodes.map((node) => node.y));
    const width = Math.max(...source.nodes.map((node) => node.x)) - minX + NODE_WIDTH;
    const height = Math.max(...source.nodes.map((node) => node.y + nodeHeight(node))) - minY;
    const left = position.x - width / 2;
    const top = position.y - height / 2;
    const ids = new Map(source.nodes.map((node) => [node.id, crypto.randomUUID()]));
    setCircuit((current) => ({
      ...current,
      nodes: [
        ...current.nodes,
        ...source.nodes.map((node) => ({
          ...node,
          id: ids.get(node.id)!,
          x: left + node.x - minX,
          y: top + node.y - minY,
        })),
      ],
      wires: [
        ...current.wires,
        ...source.wires.map((wire) => ({
          ...wire,
          id: crypto.randomUUID(),
          from: ids.get(wire.from)!,
          to: ids.get(wire.to)!,
        })),
      ],
      groups: [
        ...(current.groups ?? []),
        ...(source.groups ?? []).map((group) => ({
          ...group,
          id: crypto.randomUUID(),
          nodeIds: group.nodeIds.map((id) => ids.get(id)!),
        })),
      ],
    }));
    setSelected([...ids.values()]);
    setMessage(`${source.name} added. Drag the selected circuit to move it.`);
  };
  const connect = (from: string | null, to: string, input: number, output = 0) => {
    if (!from) {
      setMessage("Choose an output first.");
      return;
    }
    if (from === to) {
      setMessage("A gate cannot wire to itself.");
      return;
    }
    const sourceColor =
      circuit.wires.find((wire) => wire.from === from)?.color ??
      defaultWireColor(from, circuit.nodes);
    setCircuit((current) => ({
      ...current,
      wires: [
        ...current.wires.filter((wire) => !(wire.to === to && wire.input === input)),
        { id: crypto.randomUUID(), from, to, input, output, color: sourceColor },
      ],
    }));
    setPending(null);
    setMessage("Wire connected.");
  };
  const connectEightBits = (sourceId: string, targetId: string, startInput: number) => {
    const source = circuit.nodes.find((item) => item.id === sourceId);
    const target = circuit.nodes.find((item) => item.id === targetId);
    if (!source || !target || sourceId === targetId || outputCount(source) !== 8 ||
        startInput + 8 > inputCount(target)) return;
    setCircuit((current) => ({
      ...current,
      wires: [
        ...current.wires.filter((wire) => wire.to !== targetId ||
          wire.input < startInput || wire.input >= startInput + 8),
        ...Array.from({ length: 8 }, (_, bit) => ({
          id: crypto.randomUUID(), from: sourceId, to: targetId,
          input: startInput + bit, output: bit,
          color: defaultWireColor(sourceId, current.nodes),
        })),
      ],
    }));
    setMessage(`Connected bits 0–7 to ${target.label || target.module?.name || LABELS[target.type]}.`);
  };
  const availablePorts = useMemo(() => wiringPorts(displayNodes.filter((node) =>
    (showVdd || node.type !== "high") && (showGround || node.type !== "ground")), portPoint),
    [displayNodes, showVdd, showGround]);
  const portWiring = usePortWiring({
    ports: availablePorts, wires: circuit.wires, zoom,
    toPoint: (x, y) => boardPoint(x, y),
    onStart: () => {
      setSelected([]); setSelectedWires([]); setMenu(null); setPending(null);
      setWireDraft(null); wireDraftRef.current = null; setActiveInlinePath(null);
    },
    onConnect: (connections) => setCircuit((current) => ({ ...current, wires: [
      ...current.wires, ...connections.map((connection) => ({ ...connection, id: crypto.randomUUID(),
        color: current.wires.find((wire) => wire.from === connection.from)?.color ??
          defaultWireColor(connection.from, current.nodes) })),
    ] })),
    onMessage: setMessage,
  });
  const clearPortSelection = portWiring.clear;
  useEffect(() => { if (activeInlinePath) clearPortSelection(); }, [activeInlinePath, clearPortSelection]);
  const startWire = (event: React.PointerEvent<HTMLButtonElement>, draft: WireDraft) => {
    if (portWiring.pointerDown(event, draftPort(draft))) return;
    if (event.button !== 0 || event.pointerType === "touch") return;
    event.stopPropagation();
    board.current?.setPointerCapture(event.pointerId);
    wireDraftRef.current = draft;
    setWireDraft(draft);
    suppressBoardClick.current = true;
    setMenu(null);
  };
  const nearestConnector = (point: { x: number; y: number }, draft: WireDraft) => {
    let best: { id: string; input?: number; output?: number; distance: number } | null = null;
    for (const node of displayNodes) {
      if (draft.from && node.id !== draft.from) {
        for (let input = 0; input < inputCount(node); input++) {
          const port = portPoint(node, input, "input");
          const distance = Math.hypot(point.x - port.x, point.y - port.y);
          if (distance < 20 && (!best || distance < best.distance))
            best = { id: node.id, input, distance };
        }
      }
      if (draft.to && node.id !== draft.to) {
        for (let output = 0; output < outputCount(node); output++) {
          const port = portPoint(node, output, "output");
          const distance = Math.hypot(point.x - port.x, point.y - port.y);
          if (distance < 20 && (!best || distance < best.distance))
            best = { id: node.id, output, distance };
        }
      }
    }
    return best;
  };
  const removeNodes = (ids = selected) => {
    if (!ids.length) return;
    const removed = new Set(ids);
    setCircuit((current) => ({
      ...current,
      nodes: current.nodes.filter((node) => !removed.has(node.id)),
      wires: current.wires.filter((wire) => !removed.has(wire.from) && !removed.has(wire.to)),
      groups: current.groups
        ?.map((group) => ({
          ...group,
          nodeIds: group.nodeIds.filter((id) => !removed.has(id)),
        }))
        .filter((group) => group.nodeIds.length),
    }));
    setSelected([]);
    setMenu(null);
  };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const editingText =
        event.target instanceof HTMLElement &&
        Boolean(event.target.closest("input, textarea, [contenteditable='true']"));
      if (editingText) return;
      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelected(circuit.nodes.map((node) => node.id));
        setSelectedWires([]);
        setMenu(null);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        travel(event.shiftKey ? "redo" : "undo");
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        travel("redo");
        return;
      }
      if (event.key === "Escape") {
        setMenu(null);
        setPending(null);
        setWireDraft(null);
        wireDraftRef.current = null;
        setSelected([]);
        setSelectedWires([]);
      }
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        (selected.length || selectedWires.length) &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        const removed = new Set(selected);
        setCircuit((current) => ({
          ...current,
          nodes: current.nodes.filter((node) => !removed.has(node.id)),
          wires: current.wires.filter(
            (wire) =>
              !removed.has(wire.from) &&
              !removed.has(wire.to) &&
              !selectedWires.includes(wire.id),
          ),
          groups: current.groups
            ?.map((group) => ({
              ...group,
              nodeIds: group.nodeIds.filter((id) => !removed.has(id)),
            }))
            .filter((group) => group.nodeIds.length),
        }));
        setSelected([]);
        setSelectedWires([]);
        setMenu(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, selectedWires, circuit, saved, viewPath]);
  const save = () => {
    const name = saveName.trim();
    if (!name) return;
    const next = { ...circuit, name: name.slice(0, 80) };
    publish({ ...history.current(), circuit: next, saved: { ...saved, [next.name]: clone(next) } });
    setMessage(`Saved “${next.name}” in this browser.`);
    setDialog(null);
  };
  const exportCircuit = () => {
    const blob = new Blob([JSON.stringify(circuit, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${circuit.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "circuit"}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importCircuit = async (file?: File) => {
    if (!file) return;
    try {
      const next = validateCircuit(JSON.parse(await file.text()));
      if (!next) throw new Error("Invalid circuit");
      load(next);
    } catch {
      setMessage("Could not import that circuit JSON file.");
    }
  };
  const gestureDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") {
      touchPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPointers.current.size === 1) touchMoved.current = false;
      if (touchPointers.current.size === 2) {
        const [first, second] = [...touchPointers.current.values()];
        pinch.current = {
          distance: Math.hypot(first.x - second.x, first.y - second.y),
          x: (first.x + second.x) / 2,
          y: (first.y + second.y) / 2,
        };
        setMarquee(null);
        if (dragRef.current) endTransaction();
        setDrag(null);
        wireDraftRef.current = null;
        setWireDraft(null);
      }
      return;
    }
    const emptyCanvas = !(event.target as Element).closest(
      `.${styles.node}, .${styles.wireHit}, .${styles.busHit}, button, input, [role="button"]`,
    );
    if (emptyCanvas && (event.button === 1 || (event.button === 0 &&
        (spaceHeld.current || (!event.shiftKey && !selectMode))))) {
      event.preventDefault();
      event.stopPropagation();
      activePan.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
      setMarquee(null);
      if (dragRef.current) endTransaction();
      setDrag(null);
    }
  };
  const gestureMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const viewport = boardViewport.current;
    if (!viewport) return;
    const pan = activePan.current;
    if (pan?.id === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
      viewport.scrollLeft -= event.clientX - pan.x;
      viewport.scrollTop -= event.clientY - pan.y;
      pan.x = event.clientX;
      pan.y = event.clientY;
      return;
    }
    if (event.pointerType !== "touch") return;
    event.stopPropagation();
    const previous = touchPointers.current.get(event.pointerId);
    if (!previous) return;
    touchPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (touchPointers.current.size === 2) {
      const [first, second] = [...touchPointers.current.values()];
      const current = {
        distance: Math.hypot(first.x - second.x, first.y - second.y),
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      };
      if (pinch.current?.distance)
        zoomAt(
          (zoomRef.current * current.distance) / pinch.current.distance,
          pinch.current.x,
          pinch.current.y,
          current.x,
          current.y,
        );
      pinch.current = current;
      touchMoved.current = true;
    } else {
      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      if (Math.abs(dx) + Math.abs(dy) > 1) {
        touchMoved.current = true;
        viewport.scrollLeft -= dx;
        viewport.scrollTop -= dy;
      }
    }
  };
  const gestureUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePan.current?.id === event.pointerId) {
      event.stopPropagation();
      activePan.current = null;
      if (event.currentTarget.hasPointerCapture?.(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (event.pointerType === "touch") {
      event.stopPropagation();
      touchPointers.current.delete(event.pointerId);
      pinch.current = null;
      if (touchPointers.current.size === 0)
        window.setTimeout(() => {
          touchMoved.current = false;
        }, 350);
    }
  };
  const boardPoint = (clientX: number, clientY: number) => {
    const rect = board.current!.getBoundingClientRect();
    return {
      x: bounds.left + ((clientX - rect.left) * canvasWidth) / rect.width,
      y: bounds.top + ((clientY - rect.top) * canvasHeight) / rect.height,
    };
  };
  const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (portWiring.pointerMove(event)) return;
    if (wireDraftRef.current) {
      const point = boardPoint(event.clientX, event.clientY);
      const next = { ...wireDraftRef.current, ...point };
      wireDraftRef.current = next;
      setWireDraft(next);
      return;
    }
    if (marquee) {
      const point = boardPoint(event.clientX, event.clientY);
      setMarquee({ ...marquee, endX: point.x, endY: point.y });
      return;
    }
    const active = dragRef.current;
    if (!active || !board.current) return;
    const rect = board.current.getBoundingClientRect();
    const dx = ((event.clientX - active.x) * canvasWidth) / rect.width;
    const dy = ((event.clientY - active.y) * canvasHeight) / rect.height;
    const boundedX = dx;
    const boundedY = dy;
    setCircuit((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        active.starts[node.id]
          ? {
              ...node,
              x: active.starts[node.id].x + boundedX,
              y: active.starts[node.id].y + boundedY,
            }
          : node,
      ),
    }));
  };
  const finishPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (portWiring.pointerUp(event)) return;
    const draft = wireDraftRef.current;
    if (draft) {
      const point = boardPoint(event.clientX, event.clientY);
      const moved = Math.hypot(point.x - draft.originX, point.y - draft.originY) > 8;
      const connector = moved ? nearestConnector(point, draft) : null;
      if (draft.from && connector?.input !== undefined)
        connect(draft.from, connector.id, connector.input, draft.output);
      else if (draft.to && connector)
        connect(connector.id, draft.to, draft.input!, connector.output);
      else if (!moved && draft.from) {
        setPending({ from: draft.from, output: draft.output ?? 0 });
        setMessage("Drag to an input, or click one to connect.");
      } else if (!moved && draft.to)
        connect(pending?.from ?? null, draft.to, draft.input!, pending?.output);
      else setMessage("Wire cancelled. Drop on a compatible connector.");
      wireDraftRef.current = null;
      setWireDraft(null);
      window.setTimeout(() => {
        suppressBoardClick.current = false;
      }, 0);
      return;
    }
    if (marquee) {
      const left = Math.min(marquee.x, marquee.endX);
      const right = Math.max(marquee.x, marquee.endX);
      const top = Math.min(marquee.y, marquee.endY);
      const bottom = Math.max(marquee.y, marquee.endY);
      setSelected(
        circuit.nodes
          .filter(
            (node) =>
              node.x < right &&
              node.x + nodeWidth(node) > left &&
              node.y < bottom &&
              node.y + nodeHeight(node) > top,
          )
          .map((node) => node.id),
      );
      setMarquee(null);
    }
    if (dragRef.current) endTransaction();
    setDrag(null);
  };
  const visibleParts = palette.filter((type) =>
    `${type} ${LABELS[type]}`.toLowerCase().includes(search.toLowerCase().trim()),
  );
  const visibleExamples = Object.values(PRESETS).filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase().trim()),
  );
  const visibleSaved = Object.values(saved).filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase().trim()),
  );
  const visibleBlueprints = Object.values(BLUEPRINTS).filter((item) =>
    item.name.endsWith(`from ${BLUEPRINT_FAMILIES[circuitFamily].suffix}`),
  );
  const hasTransistors = circuit.nodes.some((item) => item.type === "nmos" || item.type === "pmos");
  const powerVisible = (node: Node) =>
    (node.type !== "high" || showVdd) && (node.type !== "ground" || showGround);
  const renderParts = () =>
    visibleParts.map((type) => (
      <button
        type="button"
        key={type}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData("application/x-logic-gate", type);
          event.dataTransfer.effectAllowed = "copy";
        }}
        onClick={() => addNode(type)}
        title={`Drag ${LABELS[type]} onto canvas or click to add`}
        style={{ "--part-accent": partColors[type] } as React.CSSProperties}
      >
        <span className={styles.partIcon}>
          <GateSymbol type={type} />
        </span>
        <span>{LABELS[type]}</span>
      </button>
    ));
  const menuNode = menu?.kind === "node"
    ? circuit.nodes.find((node) => node.id === menu.id)
    : undefined;
  const selectedWireData = circuit.wires.filter((wire) => selectedWires.includes(wire.id));
  const draftTarget = wireDraft ? nearestConnector(wireDraft, wireDraft) : null;
  const draftStart = wireDraft?.from
    ? circuit.nodes.find((node) => node.id === wireDraft.from)
    : null;
  const draftEnd = wireDraft?.to ? circuit.nodes.find((node) => node.id === wireDraft.to) : null;
  const targetNode = draftTarget ? circuit.nodes.find((node) => node.id === draftTarget.id) : null;
  const previewStart = draftStart
    ? portPoint(draftStart, wireDraft!.output ?? 0, "output")
    : targetNode && draftTarget?.output !== undefined
      ? portPoint(targetNode, draftTarget.output, "output")
      : wireDraft ? { x: wireDraft.x, y: wireDraft.y } : null;
  const previewEnd = draftEnd
    ? portPoint(draftEnd, wireDraft!.input!, "input")
    : targetNode && draftTarget?.input !== undefined
      ? portPoint(targetNode, draftTarget.input, "input")
      : wireDraft ? { x: wireDraft.x, y: wireDraft.y } : null;
  return (
    <div className={styles.shell}>
      <CircuitToolbar
        hasClock={hasClock}
        identity={
          <>
            <div className={styles.identity}>
              <Link className={styles.eyebrow} href="/computer">
                ← ALL COMPUTER DEMOS
              </Link>
              <input
                className={styles.circuitName}
                aria-label="Circuit name"
                title="Rename circuit"
                value={nameDraft}
                maxLength={80}
                onChange={(event) => setNameDraft(event.target.value)}
                onBlur={() => {
                  if (cancelNameEdit.current) {
                    cancelNameEdit.current = false;
                    setNameDraft(circuit.name);
                    return;
                  }
                  const name = nameDraft.trim();
                  if (name && name !== circuit.name)
                    setCircuit((current) => ({ ...current, name }));
                  else setNameDraft(circuit.name);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                  if (event.key === "Escape") {
                    cancelNameEdit.current = true;
                    setNameDraft(circuit.name);
                    event.currentTarget.blur();
                  }
                }}
              />
            </div>
          </>
        }
        view={
          <>
            <button
              type="button"
              onClick={() =>
                setUnfolded(
                  new Set(
                    circuit.nodes
                      .filter(
                        (node) =>
                          node.type === "module" || GATE_NAMES.includes(node.type as LogicGate),
                      )
                      .map((node) => node.id),
                  ),
                )
              }
            >
              <ActionIcon name="unfold" /> Unfold one level
            </button>
            <button type="button" disabled={!unfolded.size} onClick={refoldCanvasLevel}>
              <ActionIcon name="fold" /> Refold one level
            </button>
            <button
              type="button"
              onClick={() => setUnfolded(new Set(collectUnfoldableIds(circuit)))}
            >
              <ActionIcon name="unfold" /> Unfold all
            </button>
            {hasTransistors && (
              <div className={styles.powerView} aria-label="Power connection display (visual only)">
                <label>
                  <input
                    type="checkbox"
                    checked={showVdd}
                    onChange={(event) => setShowVdd(event.target.checked)}
                  />{" "}
                  Show VDD
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={showGround}
                    onChange={(event) => setShowGround(event.target.checked)}
                  />{" "}
                  Show GND
                </label>
              </div>
            )}
            <ToolbarSwitch
              label="Wire paths"
              offLabel="Simple"
              onLabel="Routed"
              checked={tidyWiring}
              onChange={(routed) => {
                setTidyWiring(routed);
                if (!routed) setBusWiring(false);
              }}
            />
            <ToolbarSwitch
              label="Fan-out buses"
              offLabel="Hidden"
              onLabel="Shown"
              checked={busWiring}
              description="Shared branches use routed paths."
              onChange={(shown) => {
                setBusWiring(shown);
                if (shown) setTidyWiring(true);
                setMessage(shown
                  ? "Fan-out buses group wires from one output. Click a bus, then an input, to add a branch."
                  : "Fan-out buses hidden.");
              }}
            />
          </>
        }
        files={
          <>
            <button type="button" onClick={exportCircuit}>
              <ActionIcon name="export" /> Export JSON
            </button>
            <button type="button" onClick={() => inputFile.current?.click()}>
              <ActionIcon name="import" /> Import JSON
            </button>
            <input
              ref={inputFile}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(event) => {
                void importCircuit(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </>
        }
        save={
          <>
            <button
              type="button"
              onClick={() => {
                setSaveName(circuit.name);
                setDialog("save");
              }}
            >
              <ActionIcon name="save" /> Save
            </button>
          </>
        }
        learning={
          <>
            <ToolbarMenu label="Learning" panelClassName={styles.learningPanel}>
              <h2>Build from one kind of part</h2>
              <p>Open a gate built from transistors, NAND, or NOR.</p>
              <div className={styles.buildTabs} role="group" aria-label="Circuit construction">
                {(["transistor", "nand", "nor"] as const).map((family) => (
                  <button
                    key={family}
                    type="button"
                    aria-pressed={circuitFamily === family}
                    onClick={() => setCircuitFamily(family)}
                  >
                    {BLUEPRINT_FAMILIES[family].label}
                  </button>
                ))}
              </div>
              <div className={styles.learningList}>
                {visibleBlueprints.map((blueprint) => (
                  <div className={styles.buildEntry} key={blueprint.name}>
                    <button
                      type="button"
                      onClick={() => {
                        load(blueprint);
                      }}
                      title={`Open ${blueprint.name} blueprint`}
                    >
                      {blueprint.name.split(" ")[0]} <span>↗</span>
                    </button>
                    <small>
                      {
                        BLUEPRINT_RECIPES[circuitFamily][
                          blueprint.name.split(" ")[0].toLowerCase() as LogicGate
                        ]
                      }
                    </small>
                  </div>
                ))}
              </div>
            </ToolbarMenu>
          </>
        }
        history={
          <>
            <button
              type="button"
              onClick={() => travel("undo")}
              disabled={!history.canUndo}
              aria-label="Undo"
              title="Undo (⌘/Ctrl+Z)"
            >
              <ActionIcon name="undo" /> Undo
            </button>
            <button
              type="button"
              onClick={() => travel("redo")}
              disabled={!history.canRedo}
              aria-label="Redo"
              title="Redo (⌘/Ctrl+Shift+Z)"
            >
              <ActionIcon name="redo" /> Redo
            </button>
          </>
        }
        clear={
          <>
            <button
              type="button"
              data-tone="danger"
              onClick={() => setDialog("clear")}
              disabled={circuit.nodes.length === 0 && circuit.wires.length === 0}
            >
              <ActionIcon name="clear" /> Clear canvas
            </button>
          </>
        }
        playback={
          <>
            <button type="button" onClick={() => setRunning((value) => !value)} data-tone="primary">
              <ActionIcon name={running ? "pause" : "play"} /> {running ? "Pause" : "Run clock"}
            </button>
            <button type="button" onClick={() => advance()} disabled={running}>
              <ActionIcon name="step" /> Step ½ cycle
            </button>
          </>
        }
        clockSettings={
          <>
            <button type="button" onClick={resetRuntime}>
              <ActionIcon name="reset" /> Reset
            </button>
            <label className={styles.rate}>
              Speed{" "}
              <select value={rate} onChange={(event) => setRate(Number(event.target.value))}>
                <option value={1}>1 Hz</option>
                <option value={2}>2 Hz</option>
                <option value={5}>5 Hz</option>
                <option value={10}>10 Hz</option>
              </select>
            </label>
          </>
        }
        clockStatus={
          <>
            <div className={styles.metrics} aria-label="Clock status">
              <span>Cycle {Math.floor(tick / 2)}</span>
              <span className={clsx(styles.clock, clockHigh && styles.on)}>
                CLK {clockHigh ? "1" : "0"}
              </span>
            </div>
          </>
        }
      />
      {viewPath.length > 0 && (
        <nav className={styles.viewPath} aria-label="Circuit depth">
          <button type="button" onClick={goBack}>
            ← Back
          </button>
          <ol>
            {viewPath.map((level, index) => (
              <li key={`${index}-${level.moduleId ?? level.via}`}>
                <button type="button" onClick={() => returnToDepth(index)} aria-label={`Return to ${level.parent.name}`}>
                  {level.parent.name}
                </button>
              </li>
            ))}
            <li aria-current="page">{circuit.name}</li>
          </ol>
          <small>Level {viewPath.length + 1}</small>
        </nav>
      )}
      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="Gate palette">
          <h2>Parts</h2>
          <p>Drag onto canvas or click to add</p>
          <input
            className={styles.search}
            type="search"
            placeholder="Search parts"
            aria-label="Search parts"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className={styles.parts}>
            {visibleSaved.length > 0 && <h3 className={styles.partsSection}>Saved circuits</h3>}
            {visibleSaved.map((item) => (
              <div className={styles.savedPart} key={item.name}>
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/x-logic-module", `saved:${item.name}`);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => addSavedCircuit(item)}
                  title={`Add ${item.name} to canvas`}
                  style={{ "--part-accent": partColors.module } as React.CSSProperties}
                >
                  <span className={styles.partIcon}>
                    <GateSymbol type="module" circuitName={item.name} />
                  </span>
                  <span>{item.name}</span>
                </button>
                <button type="button" className={styles.savedOpen} onClick={() => load(item)} aria-label={`Open ${item.name}`} title="Open circuit">↗</button>
                <button
                  type="button"
                  className={styles.savedDelete}
                  aria-label={`Delete ${item.name}`}
                  title="Delete saved circuit"
                  onClick={() => setSaved((current) => {
                    const next = { ...current };
                    delete next[item.name];
                    return next;
                  })}
                >×</button>
              </div>
            ))}
            <h3 className={styles.partsSection}>Parts</h3>
            {renderParts()}
            <h3 className={styles.partsSection}>Examples and storage</h3>
            {visibleExamples.map((example) => (
              <div className={styles.savedPart} key={example.name}>
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/x-logic-module", example.name);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => addModule(example)}
                  title={
                    circuitHints[example.name] ||
                    `Drag ${example.name} black box onto canvas or click to add`
                  }
                  style={{ "--part-accent": partColors.module } as React.CSSProperties}
                >
                  <span className={styles.partIcon}>
                    <GateSymbol type="module" circuitName={example.name} />
                  </span>
                  <span>{example.name}</span>
                </button>
                <button type="button" className={styles.savedOpen} onClick={() => load(example)} aria-label={`View ${example.name} diagram`} title="View diagram">↗</button>
              </div>
            ))}
            {visibleParts.length === 0 && visibleExamples.length === 0 && visibleSaved.length === 0 && <p>No matching parts</p>}
          </div>
        </aside>
        <div ref={workspace} className={styles.workspace}>
          <div className={styles.canvasControls} role="toolbar" aria-label="Canvas view controls"
            >
            <button
              type="button"
              onClick={() => zoomFromCenter(zoomRef.current / 1.25)}
              aria-label="Zoom out"
            >
              −
            </button>
            <span aria-live="polite">{formatZoom(zoom)}</span>
            <button
              type="button"
              onClick={() => zoomFromCenter(zoomRef.current * 1.25)}
              aria-label="Zoom in"
            >
              +
            </button>
            <button type="button" onClick={fitCanvas}>
              Fit
            </button>
            <button type="button" onClick={() => zoomFromCenter(1)}>
              100%
            </button>
            <button
              type="button"
              aria-pressed={selectMode}
              onClick={() => setSelectMode((value) => !value)}
            >
              Select
            </button>
            <small>
              Shift-click or Shift-drag ports to select · Drag selected ports to wire · Scroll to zoom
            </small>
          </div>
          <div
            ref={boardViewport}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(event) => {
              event.preventDefault();
              const inlineElement = (event.target as Element).closest("[data-inline-path]");
              const inlinePath = inlineElement?.getAttribute("data-inline-path") ?? null;
              const inlineDiagram = inlineElement?.querySelector<HTMLDivElement>(":scope > [data-inline-diagram]");
              const rect = inlineDiagram?.getBoundingClientRect();
              const scale = rect && inlineDiagram ? rect.width / parseFloat(inlineDiagram.style.width) || zoom : zoom;
              const point = rect && inlineDiagram ? {
                x: (event.clientX - rect.left) / scale - Number(inlineDiagram.dataset.originX),
                y: (event.clientY - rect.top) / scale - Number(inlineDiagram.dataset.originY),
              } : boardPoint(event.clientX, event.clientY);
              const blueprint = event.dataTransfer.getData("application/x-logic-circuit");
              if (blueprint && (BLUEPRINTS[blueprint] || PRESETS[blueprint])) {
                insertCircuit(
                  BLUEPRINTS[blueprint] || PRESETS[blueprint],
                  point,
                  inlinePath,
                );
                return;
              }
              const moduleName = event.dataTransfer.getData("application/x-logic-module");
              const moduleSource = moduleName.startsWith("saved:")
                ? saved[moduleName.slice(6)]
                : BLUEPRINTS[moduleName] || PRESETS[moduleName];
              if (moduleSource) {
                if (moduleName.startsWith("saved:")) addSavedCircuit(moduleSource, point, inlinePath);
                else addModule(moduleSource, {
                  x: point.x - MODULE_WIDTH / 2,
                  y: point.y - nodeHeight({ id: "drop", type: "module", module: moduleSource, x: 0, y: 0 }) / 2,
                }, inlinePath);
                return;
              }
              const type = event.dataTransfer.getData("application/x-logic-gate") as GateType;
              if (!palette.includes(type)) return;
              addNode(type, { x: point.x - NODE_WIDTH / 2, y: point.y - (inlinePath ? 148 : NODE_HEIGHT) / 2 }, inlinePath);
            }}
            onScroll={recenterCanvas}
            className={clsx(styles.boardScroll, !selectMode && styles.panMode)}
            onPointerDownCapture={gestureDown}
            onPointerMoveCapture={gestureMove}
            onPointerUpCapture={gestureUp}
            onPointerCancelCapture={gestureUp}
            onClickCapture={(event) => {
              if (touchMoved.current) {
                event.preventDefault();
                event.stopPropagation();
                touchMoved.current = false;
              }
            }}
          >
            <div
              style={{
                width: canvasWidth * zoom,
                height: canvasHeight * zoom,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                ref={board}
                data-port-surface="main"
                className={styles.board}
                style={{
                  width: canvasWidth * boardRatio,
                  height: canvasHeight * boardRatio,
                  position: "absolute",
                  transform: `scale(${renderScale})`,
                  transformOrigin: "top left",
                }}
                role="application"
                aria-label="Circuit canvas"
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setPending(null);
                    setWireDraft(null);
                    wireDraftRef.current = null;
                    setMenu(null);
                  }
                }}
                onPointerMove={pointerMove}
                onPointerDown={(event) => {
                  if (
                    event.pointerType === "touch" ||
                    event.button !== 0 ||
                    spaceHeld.current ||
                    (!event.shiftKey && !selectMode) ||
                    (event.target as Element).closest(
                      `.${styles.node}, .${styles.wireHit}, .${styles.busHit}, button, input, [role="button"]`,
                    )
                  )
                    return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  portWiring.clear();
                  const point = boardPoint(event.clientX, event.clientY);
                  setMarquee({ ...point, endX: point.x, endY: point.y });
                  setSelected([]);
                  setMenu(null);
                }}
                onPointerUp={finishPointer}
                onPointerCancel={() => {
                  portWiring.clear();
                  if (dragRef.current) endTransaction();
                  wireDraftRef.current = null;
                  setWireDraft(null);
                  setMarquee(null);
                  setDrag(null);
                  suppressBoardClick.current = false;
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setMenu({ x: event.clientX, y: event.clientY, kind: "board" });
                }}
                onClick={() => {
                  if (portWiring.consumeClick()) return;
                  portWiring.clear();
                  if (suppressBoardClick.current) {
                    suppressBoardClick.current = false;
                    return;
                  }
                  if (pending) setPending(null);
                  setActiveInlinePath(null);
                  setMenu(null);
                }}
              >
                {circuit.groups?.map((group) => {
                  const parts = circuit.nodes.filter((item) => group.nodeIds.includes(item.id));
                  if (!parts.length) return null;
                  const left = Math.max(8, Math.min(...parts.map((item) => item.x)) - 20);
                  const top = Math.max(8, Math.min(...parts.map((item) => item.y)) - 28);
                  const right = Math.max(...parts.map((item) => item.x + nodeWidth(item))) + 20;
                  const bottom = Math.max(...parts.map((item) => item.y + nodeHeight(item))) + 18;
                  return (
                    <div
                      key={group.id}
                      className={styles.circuitGroup}
                      style={{ left: (left - bounds.left) * boardRatio,
                        top: (top - bounds.top) * boardRatio,
                        width: (right - left) * boardRatio,
                        height: (bottom - top) * boardRatio }}
                      aria-label={`${group.label} circuit boundary`}
                    >
                      <span>{group.label}</span>
                    </div>
                  );
                })}
                <svg
                  className={styles.wires}
                  viewBox={`${bounds.left} ${bounds.top} ${canvasWidth} ${canvasHeight}`}
                  preserveAspectRatio="none"
                  aria-label="Circuit wires"
                >
                  {busWiring &&
                    routes.buses.map((bus) => {
                      const from = circuit.nodes.find((node) => node.id === bus.from);
                      const color = WIRE_COLORS[defaultWireColor(bus.from, circuit.nodes)];
                      const live =
                        snapshot.outputs[bus.from]?.[bus.output] ?? snapshot.values[bus.from];
                      return (
                        <g key={bus.key} style={{ "--wire-color": color } as React.CSSProperties}>
                          <path
                            d={bus.path}
                            className={styles.busHit}
                            role="button"
                            tabIndex={0}
                            aria-label={`Add branch from ${from?.label || "output"} bus`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setPending({ from: bus.from, output: bus.output });
                              setMessage("Bus selected. Click an input to add a branch.");
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setPending({ from: bus.from, output: bus.output });
                                setMessage("Bus selected. Click an input to add a branch.");
                              }
                            }}
                          />
                          <path
                            d={bus.path}
                            className={clsx(styles.busWire, live && styles.live)}
                          />
                          {bus.crossings.map((crossing) => (
                            <circle
                              key={`${crossing.x}:${crossing.y}`}
                              cx={crossing.x}
                              cy={crossing.y}
                              r={7}
                              className={styles.busCrossing}
                            />
                          ))}
                          {bus.taps.map((tap) => (
                            <circle
                              key={tap.wireId}
                              cx={tap.x}
                              cy={tap.y}
                              r={4}
                              className={styles.busTap}
                            />
                          ))}
                        </g>
                      );
                    })}
                  {circuit.wires.map((wire) => {
                    const from = displayNodes.find((node) => node.id === wire.from);
                    const to = displayNodes.find((node) => node.id === wire.to);
                    if (!from || !to) return null;
                    if (hasTransistors && (!powerVisible(from) || !powerVisible(to))) return null;
                    const { x: x1, y: y1 } = portPoint(from, wire.output ?? 0, "output");
                    const { x: x2, y: y2 } = portPoint(to, wire.input, "input");
                    const standardPorts = outputSide(from) === "right" && inputSide(to) === "left";
                    const d = standardPorts
                      ? tidyWiring || busWiring || x2 <= x1
                        ? routes.paths[wire.id]
                        : simpleWirePath({ x: x1, y: y1 }, { x: x2, y: y2 })
                      : orientedWirePath({ x: x1, y: y1 }, { x: x2, y: y2 }, outputSide(from), inputSide(to));
                    const color =
                      WIRE_COLORS[wire.color ?? defaultWireColor(wire.from, circuit.nodes)];
                    return (
                      <g key={wire.id} style={{ "--wire-color": color } as React.CSSProperties}>
                        <path
                          d={d}
                          className={styles.wireHit}
                          role="button"
                          tabIndex={0}
                          aria-pressed={selectedWires.includes(wire.id)}
                          aria-label={`Select wire from ${from.label || LABELS[from.type]} ${outputLabel(from, wire.output ?? 0)} to ${to.label || LABELS[to.type]} ${inputLabel(to, wire.input)}`}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedWires((current) =>
                                event.shiftKey || event.metaKey || event.ctrlKey
                                  ? current.includes(wire.id)
                                    ? current.filter((id) => id !== wire.id)
                                    : [...current, wire.id]
                                  : [wire.id],
                              );
                            }
                          }}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setSelectedWires((current) => current.includes(wire.id) ? current : [wire.id]);
                            setMenu({
                              x: event.clientX,
                              y: event.clientY,
                              kind: "wire",
                              id: wire.id,
                            });
                          }}
                          onDoubleClick={(event) => {
                            event.stopPropagation();
                            setCircuit((current) => ({
                              ...current,
                              wires: current.wires.filter((item) => item.id !== wire.id),
                            }));
                            setMessage("Wire removed.");
                            setSelectedWires((current) => current.filter((id) => id !== wire.id));
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedWires((current) =>
                              event.shiftKey || event.metaKey || event.ctrlKey
                                ? current.includes(wire.id)
                                  ? current.filter((id) => id !== wire.id)
                                  : [...current, wire.id]
                                : [wire.id],
                            );
                            setSelected([]);
                            setMenu(null);
                          }}
                        />
                        <path
                          d={d}
                          className={clsx(
                            styles.wire,
                            (snapshot.outputs[wire.from]?.[wire.output ?? 0] ??
                              snapshot.values[wire.from]) &&
                              styles.live,
                            selectedWires.includes(wire.id) && styles.wireSelected,
                          )}
                        />
                      </g>
                    );
                  })}
                  <PortWirePreview wiring={portWiring} />
                  {previewStart && previewEnd && wireDraft && (
                    <path
                      d={
                        (draftStart || targetNode) && (draftEnd || targetNode) &&
                        (draftStart ? outputSide(draftStart) : targetNode ? outputSide(targetNode) : "right") !== "right" ||
                        (draftEnd ? inputSide(draftEnd) : targetNode ? inputSide(targetNode) : "left") !== "left"
                          ? orientedWirePath(previewStart, previewEnd,
                              draftStart ? outputSide(draftStart) : targetNode ? outputSide(targetNode) : "right",
                              draftEnd ? inputSide(draftEnd) : targetNode ? inputSide(targetNode) : "left")
                          : tidyWiring || previewEnd.x <= previewStart.x
                          ? wirePath(previewStart, previewEnd)
                          : simpleWirePath(previewStart, previewEnd)
                      }
                      className={styles.wirePreview}
                      style={
                        {
                          "--wire-color":
                            WIRE_COLORS[
                              wireDraft.from
                                ? defaultWireColor(wireDraft.from, circuit.nodes)
                                : draftTarget
                                  ? defaultWireColor(draftTarget.id, circuit.nodes)
                                  : "cyan"
                            ],
                        } as React.CSSProperties
                      }
                    />
                  )}
                </svg>
                {displayNodes
                  .filter((node) => !hasTransistors || powerVisible(node))
                  .map((node) => (
                    <div
                      key={node.id}
                      role="group"
                      aria-label={`${node.label || (node.type === "module" ? node.module?.name || "Module" : LABELS[node.type])} — ${node.type === "module" ? node.module?.name || "Module" : LABELS[node.type]} part`}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && event.target === event.currentTarget) {
                          event.stopPropagation();
                          setSelected([node.id]);
                        }
                      }}
                      className={clsx(
                        styles.node,
                        expandedDetails.has(node.id) && styles.expandedNode,
                        selected.includes(node.id) && styles.selected,
                        snapshot.values[node.id] && styles.active,
                        node.type === "lamp" && snapshot.values[node.id] && styles.lampLit,
                        (inputSide(node) === "top" || outputSide(node) === "top") && styles.topPorts,
                      )}
                      style={
                        {
                          "--part-accent": partColors[node.type],
                          left: `${((node.x - bounds.left) / canvasWidth) * 100}%`,
                          top: `${((node.y - bounds.top) / canvasHeight) * 100}%`,
                          width: `${(nodeWidth(node) / canvasWidth) * 100}%`,
                          height: `${(nodeHeight(node) / canvasHeight) * 100}%`,
                        } as React.CSSProperties
                      }
                      onPointerDown={(event) => {
                        if (
                          event.pointerType === "touch" ||
                          event.button !== 0 ||
                          (event.target as HTMLElement).closest("button, input")
                        )
                          return;
                        portWiring.clear();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        const ids = selected.includes(node.id) ? selected : [node.id];
                        beginTransaction();
                        setDrag({
                          x: event.clientX,
                          y: event.clientY,
                          starts: Object.fromEntries(
                            circuit.nodes
                              .filter((item) => ids.includes(item.id))
                              .map((item) => [item.id, { x: item.x, y: item.y }]),
                          ),
                        });
                        setSelected(ids);
                        setSelectedWires([]);
                        setMenu(null);
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!selected.includes(node.id)) setSelected([node.id]);
                        setMenu({ x: event.clientX, y: event.clientY, kind: "node", id: node.id });
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        if ((event.nativeEvent as PointerEvent).pointerType === "touch")
                          setSelected([node.id]);
                      }}
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        if (node.type === "module" && node.module)
                          enterCircuit(node.module, node.label || node.module.name, node.id);
                      }}
                    >
                      {Array.from({ length: inputCount(node) }, (_, input) => (
                        <div
                          key={`${node.id}-input-${input}`}
                          className={clsx(styles.portRow, inputSide(node) === "right" && styles.portOnRight)}
                          style={{
                            ...portStyle(node, input, "input"),
                          }}
                        >
                          <button
                            type="button"
                            className={styles.input}
                            data-node-id={node.id}
                            data-input={input}
                            aria-pressed={portWiring.isSelected({ nodeId: node.id, kind: "input", index: input })}
                            data-port-selected={portWiring.isSelected({ nodeId: node.id, kind: "input", index: input })}
                            data-port-invalid={portWiring.invalid && portWiring.isTarget({ nodeId: node.id, kind: "input", index: input })}
                            style={{ top: 0 }}
                            onPointerDown={(event) =>
                              startWire(event, {
                                to: node.id,
                                input,
                                ...portPoint(node, input, "input"),
                                originX: portPoint(node, input, "input").x,
                                originY: portPoint(node, input, "input").y,
                              })
                            }
                            onClick={(event) => {
                              if (portWiring.click(event, { nodeId: node.id, kind: "input", index: input })) return;
                              if (event.detail === 0)
                                connect(pending?.from ?? null, node.id, input, pending?.output);
                            }}
                            data-wire-target={Boolean(
                              portWiring.isTarget({ nodeId: node.id, kind: "input", index: input }) || wireDraft?.from &&
                                draftTarget?.id === node.id &&
                                draftTarget.input === input,
                            )}
                            aria-label={`Connect to ${node.label || LABELS[node.type]} ${inputLabel(node, input)}`}
                            title={
                              node.type === "module"
                                ? inputLabel(node, input)
                                : node.type === "dff"
                                  ? input === 0
                                    ? "D: data"
                                    : "CLK: rising edge"
                                  : node.type === "nmos" || node.type === "pmos"
                                    ? input === 0
                                      ? "Gate control"
                                      : "Source signal"
                                    : `Input ${input + 1}`
                            }
                          />
                          {node.type === "module" && !node.expanded && ["left", "right"].includes(inputSide(node)) && (
                            <span className={styles.inputPortLabel} title={inputLabel(node, input)}>
                              {inputLabel(node, input)}
                            </span>
                          )}
                        </div>
                      ))}
                      <div
                        className={clsx(
                          styles.nodeBody,
                          node.type === "module" && styles.moduleBody,
                        )}
                        style={expandedDetails.has(node.id) ? { display: "none" } : undefined}
                      >
                        <div className={styles.nodeNameRow} onPointerDown={(event) => event.stopPropagation()}>
                          {editingLabel?.id === node.id ? (
                            <input
                              autoFocus
                              className={styles.nodeNameInput}
                              aria-label="Part label"
                              maxLength={30}
                              value={editingLabel.value}
                              onChange={(event) => setEditingLabel({ id: node.id, value: event.target.value })}
                              onBlur={() => {
                                setCircuit((current) => ({
                                  ...current,
                                  nodes: current.nodes.map((item) =>
                                    item.id === node.id ? { ...item, label: editingLabel.value.trim() } : item,
                                  ),
                                }));
                                setEditingLabel(null);
                              }}
                              onKeyDown={(event) => {
                                event.stopPropagation();
                                if (event.key === "Enter") event.currentTarget.blur();
                                if (event.key === "Escape") setEditingLabel(null);
                              }}
                            />
                          ) : (
                            <>
                              {node.label && node.label !== (node.type === "module" ? node.module?.name || "Module" : LABELS[node.type]) && (
                                <span
                                  className={styles.nodeLabel}
                                  title="Double-click to edit label"
                                  onDoubleClick={(event) => {
                                    event.stopPropagation();
                                    setEditingLabel({ id: node.id, value: node.label || "" });
                                  }}
                                >{node.label}</span>
                              )}
                              <button
                                type="button"
                                className={styles.editName}
                                aria-label={`Edit ${node.label || LABELS[node.type]} label`}
                                title="Edit label"
                                onClick={() => setEditingLabel({
                                  id: node.id,
                                  value: node.label === (node.type === "module" ? node.module?.name || "Module" : LABELS[node.type])
                                    ? ""
                                    : node.label || "",
                                })}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M3 11.5V5a2 2 0 0 1 2-2h6.5a2 2 0 0 1 1.4.6l8.1 8.1a2 2 0 0 1 0 2.8l-6.5 6.5a2 2 0 0 1-2.8 0l-8.1-8.1a2 2 0 0 1-.6-1.4Z" />
                                  <circle cx="7.5" cy="7.5" r="1" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                        {!["input4", "input8", "display4", "display8"].includes(
                          node.type,
                        ) && (
                          <span className={styles.nodeSymbol}>
                            <GateSymbol type={node.type} circuitName={node.module?.name} />
                          </span>
                        )}
                        <strong className={styles.nodePartName}>
                          {node.type === "module" ? node.module?.name || "Module" : LABELS[node.type]}
                        </strong>
                        {node.type === "input4" || node.type === "input8" ? (
                          <div
                            className={styles.numberBits}
                            aria-label={`${node.label || LABELS[node.type]} binary input`}
                          >
                            {Array.from({ length: node.type === "input4" ? 4 : 8 }, (_, index) => {
                              const bit = (node.type === "input4" ? 4 : 8) - index - 1;
                              const on = Boolean(((node.numberValue ?? 0) >> bit) & 1);
                              return (
                                <button
                                  type="button"
                                  key={bit}
                                  aria-label={`Toggle bit ${bit} of ${node.label || LABELS[node.type]}`}
                                  aria-pressed={on}
                                  className={clsx(styles.numberBit, on && styles.numberBitOn)}
                                  onClick={() =>
                                    setCircuit((current) => ({
                                      ...current,
                                      nodes: current.nodes.map((item) =>
                                        item.id === node.id
                                          ? {
                                              ...item,
                                              numberValue: (item.numberValue ?? 0) ^ (1 << bit),
                                            }
                                          : item,
                                      ),
                                    }))
                                  }
                                >
                                  {on ? "1" : "0"}
                                </button>
                              );
                            })}
                          </div>
                        ) : node.type === "display4" || node.type === "display8" ? (
                          <div
                            className={styles.digitalScreen}
                            aria-label={`${node.label || LABELS[node.type]} value`}
                          >
                            <span className={styles.decimalValue}>
                              {(snapshot.outputs[node.id] ?? []).reduce(
                                (value, bit, index) => value + (bit ? 2 ** index : 0),
                                0,
                              )}
                            </span>
                            <span className={styles.binaryValue}>
                              {Array.from(
                                { length: node.type === "display4" ? 4 : 8 },
                                (_, index) =>
                                  snapshot.outputs[node.id]?.[
                                    (node.type === "display4" ? 4 : 8) - index - 1
                                  ]
                                    ? "1"
                                    : "0",
                              ).join("")}
                            </span>
                          </div>
                        ) : node.type === "lamp" ? (
                          <span className={styles.lampState}>
                            <span
                              className={clsx(styles.led, snapshot.values[node.id] && styles.ledOn)}
                              role="img"
                              aria-label={snapshot.values[node.id] ? "LED on" : "LED off"}
                            />
                            <span className={styles.bit}>{snapshot.values[node.id] ? "1" : "0"}</span>
                          </span>
                        ) : node.type === "switch" ? (
                          <button
                            type="button"
                            className={styles.toggle}
                            onClick={() =>
                              setCircuit((current) => ({
                                ...current,
                                nodes: current.nodes.map((item) =>
                                  item.id === node.id ? { ...item, value: !item.value } : item,
                                ),
                              }))
                            }
                          >
                            {node.value ? "ON" : "OFF"}
                          </button>
                        ) : node.type === "pulse" ? (
                          <button
                            type="button"
                            className={styles.toggle}
                            onClick={() => {
                              advance({ [node.id]: true }, clockRef.current);
                              window.setTimeout(() => advance({}, clockRef.current), 180);
                            }}
                          >
                            SEND
                          </button>
                        ) : node.type === "module" ? (
                          <span className={styles.moduleBits}>
                            {moduleInputs(node.module!).length} IN ·{" "}
                            {moduleOutputs(node.module!).length} OUT
                          </span>
                        ) : (
                          <span className={styles.bit}>{snapshot.values[node.id] ? "1" : "0"}</span>
                        )}
                      </div>
                      {!expandedDetails.has(node.id) && isUnfoldable(node) && (
                        <div className={styles.nodeActions}>
                          <button type="button" title={`${unfolded.has(node.id) ? "Fold" : "Unfold"} ${node.label || LABELS[node.type]} in place`}
                            aria-label={`${unfolded.has(node.id) ? "Fold" : "Unfold"} ${node.label || LABELS[node.type]} in place`}
                            onClick={(event) => { event.stopPropagation(); toggleUnfolded(node.id); }}><ActionIcon name={unfolded.has(node.id) ? "fold" : "unfold"} /></button>
                          {node.type === "module" && node.module && (
                            <button type="button" title={`Enter ${node.label || node.module.name}`}
                              aria-label={`Enter ${node.label || node.module.name}`}
                              onClick={(event) => { event.stopPropagation(); enterCircuit(node.module!, node.label || node.module!.name, node.id); }}>↗</button>
                          )}
                        </div>
                      )}
                      {expandedDetails.get(node.id) && (
                        <InlineCircuit host={node} circuit={expandedDetails.get(node.id)!.inner}
                          layout={expandedDetails.get(node.id)!.layout} unfolded={unfolded}
                          snapshot={snapshot.modules[node.id] ?? EMPTY_SNAPSHOT}
                          {...inlineActions} onActivate={setActiveInlinePath}
                          activePath={activeInlinePath} zoom={zoom} path={node.id} />
                      )}
                      {Array.from({ length: outputCount(node) }, (_, output) => (
                        <div
                          key={`${node.id}-output-${output}`}
                          className={clsx(styles.portRow, outputSide(node) === "left" && styles.portOnLeft)}
                          style={{
                            ...portStyle(node, output, "output"),
                          }}
                        >
                          {node.type === "module" && !node.expanded && ["left", "right"].includes(outputSide(node)) && (
                            <span
                              className={styles.outputPortLabel}
                              title={outputLabel(node, output)}
                            >
                              {outputLabel(node, output)}
                            </span>
                          )}
                          <button
                            type="button"
                            className={clsx(
                              styles.output,
                              pending?.from === node.id &&
                                pending.output === output &&
                                styles.pending,
                            )}
                            style={{ top: 0 }}
                            aria-pressed={portWiring.isSelected({ nodeId: node.id, kind: "output", index: output })}
                            data-port-selected={portWiring.isSelected({ nodeId: node.id, kind: "output", index: output })}
                            data-port-invalid={portWiring.invalid && portWiring.isTarget({ nodeId: node.id, kind: "output", index: output })}
                            onPointerDown={(event) =>
                              startWire(event, {
                                from: node.id,
                                output,
                                ...portPoint(node, output, "output"),
                                originX: portPoint(node, output, "output").x,
                                originY: portPoint(node, output, "output").y,
                              })
                            }
                            onClick={(event) => {
                              if (portWiring.click(event, { nodeId: node.id, kind: "output", index: output })) return;
                              if (event.detail !== 0) return;
                              setPending({ from: node.id, output });
                              setMessage(`Choose an input for ${outputLabel(node, output)}.`);
                            }}
                            data-wire-target={Boolean(
                              portWiring.isTarget({ nodeId: node.id, kind: "output", index: output }) || wireDraft?.to &&
                                draftTarget?.id === node.id &&
                                draftTarget.output === output,
                            )}
                            aria-label={`Wire from ${node.label || LABELS[node.type]} ${outputLabel(node, output)}`}
                            title={outputLabel(node, output)}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                {marquee && (
                  <div
                    className={styles.marquee}
                    style={{
                      left: (Math.min(marquee.x, marquee.endX) - bounds.left) * boardRatio,
                      top: (Math.min(marquee.y, marquee.endY) - bounds.top) * boardRatio,
                      width: Math.abs(marquee.endX - marquee.x) * boardRatio,
                      height: Math.abs(marquee.endY - marquee.y) * boardRatio,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          <div className={styles.status}>
            <span className={snapshot.unstable ? styles.warning : ""}>
              {snapshot.unstable
                ? "Feedback loop did not settle. Add a flip-flop to store state."
                : message}
            </span>
            <span>
              {canvasCounts.parts} parts · {canvasCounts.wires} wires
              {selected.length ? ` · ${selected.length} selected` : ""}
              {portWiring.selected.length ? ` · ${portWiring.selected.length} ports selected` : ""}
            </span>
          </div>
        </div>
      </div>
      {dialog && (
        <div className={styles.dialogBackdrop} onMouseDown={(event) => {
          if (event.target === event.currentTarget) setDialog(null);
        }}>
          <div
            ref={dialogRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="circuit-dialog-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") setDialog(null);
              if (event.key === "Tab") {
                const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input"));
                const first = controls[0];
                const last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                  event.preventDefault();
                  last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            {dialog === "save" ? (
              <form onSubmit={(event) => { event.preventDefault(); save(); }}>
                <h2 id="circuit-dialog-title">Save circuit</h2>
                <p>Saved circuits appear in Parts and can be placed as black boxes.</p>
                <label htmlFor="saved-circuit-name">Name</label>
                <input
                  id="saved-circuit-name"
                  required
                  maxLength={80}
                  value={saveName}
                  onChange={(event) => setSaveName(event.target.value)}
                />
                {saved[saveName.trim()] && <p className={styles.dialogWarning}>Saving will replace the existing circuit with this name.</p>}
                <div className={styles.dialogActions}>
                  <button type="button" onClick={() => setDialog(null)}>Cancel</button>
                  <button type="submit" className={styles.dialogPrimary} disabled={!saveName.trim()}>Save circuit</button>
                </div>
              </form>
            ) : (
              <div>
                <h2 id="circuit-dialog-title">Clear canvas?</h2>
                <p>Remove {canvasCounts.parts} parts and {canvasCounts.wires} wires from this canvas?</p>
                <div className={styles.dialogActions}>
                  <button type="button" onClick={() => setDialog(null)}>Cancel</button>
                  <button type="button" className={styles.dialogDanger} onClick={clearCanvas}>Clear canvas</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {menu && (
        <div
          ref={menuRef}
          className={styles.contextMenu}
          style={{
            left: Math.max(8, Math.min(menu.x, window.innerWidth - 280)),
            top: Math.max(8, Math.min(menu.y, window.innerHeight - 360)),
            maxHeight: "calc(100vh - 16px)",
            overflowY: "auto",
          }}
          role="menu"
          onContextMenu={(event) => event.preventDefault()}
        >
          {menu.kind === "node" && (
            <>
              {menuNode && (
            <div className={styles.contextDetails}>
              <strong>
                {menuNode.type === "module"
                  ? menuNode.module?.name || "Module"
                  : LABELS[menuNode.type]}
              </strong>
              <label>
                Label
                <span className={styles.contextLabelInput}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 11.5V5a2 2 0 0 1 2-2h6.5a2 2 0 0 1 1.4.6l8.1 8.1a2 2 0 0 1 0 2.8l-6.5 6.5a2 2 0 0 1-2.8 0l-8.1-8.1a2 2 0 0 1-.6-1.4Z" />
                    <circle cx="7.5" cy="7.5" r="1" />
                  </svg>
                  <input
                    value={menuNode.label || ""}
                    maxLength={30}
                    onFocus={beginTransaction}
                    onBlur={endTransaction}
                    onChange={(event) =>
                      setCircuit((current) => ({
                        ...current,
                        nodes: current.nodes.map((node) =>
                          node.id === menuNode.id ? { ...node, label: event.target.value } : node,
                        ),
                      }))
                    }
                  />
                </span>
              </label>
              {inputCount(menuNode) > 0 && <label>
                Input side
                <select
                  aria-label="Input side"
                  value={inputSide(menuNode)}
                  onChange={(event) => setCircuit((current) => ({
                    ...current,
                    nodes: current.nodes.map((node) => node.id === menuNode.id
                      ? { ...node, inputSide: event.target.value as PortSide } : node),
                  }))}
                >
                  {(["left", "top", "right", "bottom"] as const).map((side) =>
                    <option key={side} value={side}>{side}</option>)}
                </select>
              </label>}
              {menuNode.type === "module" && (
                <div className={styles.modulePorts}>
                  {circuitHints[menuNode.module!.name] && (
                    <p>{circuitHints[menuNode.module!.name]}</p>
                  )}
                  {circuit.nodes.some((node) => node.id !== menuNode.id && outputCount(node) === 8) &&
                    ["A", "B"].some((prefix) => moduleInputs(menuNode.module!).some((port) => port.label === `${prefix}0`)) && (
                    <div className={styles.bulkWiring}>
                      <span>Wire 8 bits at once</span>
                      <select aria-label="8-bit source" value={busSource}
                        onChange={(event) => setBusSource(event.target.value)}>
                        <option value="">Choose 8-bit source</option>
                        {circuit.nodes.filter((node) => node.id !== menuNode.id && outputCount(node) === 8)
                          .map((node) => <option key={node.id} value={node.id}>
                            {node.label || node.module?.name || LABELS[node.type]}
                          </option>)}
                      </select>
                      {["A", "B"].map((prefix) => {
                        const ports = moduleInputs(menuNode.module!);
                        const start = ports.findIndex((port) => port.label === `${prefix}0`);
                        if (start < 0 || !Array.from({ length: 8 }, (_, bit) =>
                          ports[start + bit]?.label === `${prefix}${bit}`).every(Boolean)) return null;
                        return <button key={prefix} type="button" disabled={!busSource}
                          onClick={() => connectEightBits(busSource, menuNode.id, start)}>
                          Wire bits 0–7 to {prefix}0–{prefix}7
                        </button>;
                      })}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      enterCircuit(
                        menuNode.module!,
                        menuNode.label || menuNode.module!.name,
                        menuNode.id,
                      )
                    }
                  >
                    Open internal wiring ↘
                  </button>
                  <span>Inputs</span>
                  {moduleInputs(menuNode.module!).map((port, index) => (
                    <small key={port.id}>
                      {index + 1}. {port.label || `Input ${index + 1}`}
                    </small>
                  ))}
                  <span>Outputs</span>
                  {moduleOutputs(menuNode.module!).map((port, index) => (
                    <small key={port.id}>
                      {index + 1}. {port.label || `Output ${index + 1}`} ={" "}
                      {snapshot.outputs[menuNode.id]?.[index] ? 1 : 0}
                    </small>
                  ))}
                </div>
              )}
              {(GATE_NAMES.includes(menuNode.type as LogicGate) ||
                (menuNode.type === "module" &&
                  blueprintGate(menuNode.module!) !== null)) && (
                <div className={styles.resolutionChoices}>
                  <span>Explore implementation</span>
                  {(["transistor", "nand", "nor"] as const).map((family) => {
                    const gate =
                      menuNode.type === "module"
                        ? blueprintGate(menuNode.module!)!
                        : (menuNode.type as LogicGate);
                    return (
                      <button
                        key={family}
                        type="button"
                        onClick={() => viewGate(gate, family, menuNode)}
                      >
                        {BLUEPRINT_FAMILIES[family].label} ↘
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
              )}
              <button type="button" role="menuitem" onClick={() => rotatePart(menu.id!, -1)}>
                <ActionIcon name="rotateLeft" /> Rotate left
              </button>
              <button type="button" role="menuitem" onClick={() => rotatePart(menu.id!, 1)}>
                <ActionIcon name="rotateRight" /> Rotate right
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() =>
                  removeNodes(selected.includes(menu.id || "") ? selected : [menu.id!])
                }
              >
                <ActionIcon name="delete" /> Delete{" "}
                {selected.length > 1 && selected.includes(menu.id || "")
                  ? `${selected.length} parts`
                  : "part"}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setCircuit((current) => ({
                    ...current,
                    wires: current.wires.filter(
                      (wire) => wire.from !== menu.id && wire.to !== menu.id,
                    ),
                  }));
                  setMenu(null);
                }}
              >
                <ActionIcon name="cut" /> Cut connected wires
              </button>
            </>
          )}
          {menu.kind === "wire" && (
            <>
              <span className={styles.contextLabel}>Color {selectedWireData.length > 1 && selectedWires.includes(menu.id || "") ? `${selectedWireData.length} wires` : "wire"}</span>
              <div className={styles.contextColors} aria-label="Wire color">
                {wireColorNames.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={styles.colorSwatch}
                    style={{ backgroundColor: WIRE_COLORS[color] }}
                    aria-label={`Color wire ${color}`}
                    title={color}
                    onClick={() => {
                      setCircuit((current) => ({
                        ...current,
                        wires: current.wires.map((wire) =>
                          (selectedWireData.length > 1 && selectedWires.includes(menu.id || "")
                            ? selectedWires.includes(wire.id) : wire.id === menu.id)
                            ? { ...wire, color } : wire,
                        ),
                      }));
                      setMenu(null);
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setCircuit((current) => ({
                    ...current,
                    wires: current.wires.filter((wire) => !(selectedWireData.length > 1 && selectedWires.includes(menu.id || "")
                      ? selectedWires.includes(wire.id) : wire.id === menu.id)),
                  }));
                  setSelectedWires([]);
                  setMenu(null);
                }}
              >
                <ActionIcon name="cut" /> Cut {selectedWireData.length > 1 && selectedWires.includes(menu.id || "") ? "selected wires" : "wire"}
              </button>
            </>
          )}
          {menu.kind === "board" && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setSelected(circuit.nodes.map((node) => node.id));
                  setMenu(null);
                }}
              >
                <ActionIcon name="selectAll" /> Select all parts
              </button>
              <button type="button" role="menuitem" onClick={() => setMenu(null)}>
                <ActionIcon name="close" /> Close menu
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
