import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BLUEPRINT_FAMILIES,
  BLUEPRINT_RECIPES,
  BLUEPRINTS,
  type BlueprintFamily,
  blueprintGate,
  type Circuit,
  GATE_NAMES,
  type GateType,
  gateBlueprint,
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
  PRESETS,
  type Snapshot,
  step,
  validateCircuit,
  WIRE_COLORS,
  type WireColor,
} from "../../lib/computer/logic";
import { MEMORY_HINTS } from "../../lib/computer/memoryCircuits";
import { routeCircuitWires, simpleWirePath, wirePath } from "../../lib/computer/wireRouting";
import { GateSymbol } from "./GateSymbol";
import { ImplementationView } from "./ImplementationView";
import styles from "./LogicBuilder.module.css";

const STORAGE = "ricos-computer-circuits-v1";
const WIDTH = 900;
const HEIGHT = 520;
const NODE_WIDTH = 132;
const MODULE_WIDTH = 236;
const nodeWidth = (node: Node) => (node.type === "module" ? MODULE_WIDTH : NODE_WIDTH);
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
const NODE_HEIGHT = 78;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 4;
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
type ViewLevel = { parent: Circuit; snapshot: Snapshot; via: string; moduleId?: string };
const withUpdatedModule = (parent: Circuit, moduleId: string, inner: Circuit): Circuit => ({
  ...parent,
  nodes: parent.nodes.map((item) =>
    item.id === moduleId ? { ...item, module: clone(inner) } : item,
  ),
});
const nodeHeight = (node: Node) =>
  node.type === "module"
    ? Math.max(NODE_HEIGHT, 30 + Math.max(inputCount(node), outputCount(node)) * 25)
    : ["input4", "input8", "display4", "display8"].includes(node.type)
      ? Math.max(NODE_HEIGHT, 54 + Math.max(inputCount(node), outputCount(node)) * 24)
      : node.type === "switch" && node.label
        ? 96
      : NODE_HEIGHT;
const portY = (node: Node, input: number) =>
  node.y +
  (inputCount(node) === 1
    ? nodeHeight(node) / 2
    : 16 + input * ((nodeHeight(node) - 32) / Math.max(1, inputCount(node) - 1)));
const outY = (node: Node, output: number) =>
  node.y +
  (outputCount(node) === 1
    ? nodeHeight(node) / 2
    : 16 + output * ((nodeHeight(node) - 32) / Math.max(1, outputCount(node) - 1)));

export function LogicBuilder() {
  const [circuit, setCircuit] = useState<Circuit>(() => clone(PRESETS["Half adder"]));
  const [viewPath, setViewPath] = useState<ViewLevel[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot>(initialSnapshot);
  const [clockHigh, setClockHigh] = useState(false);
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);
  const [rate, setRate] = useState(2);
  const [pending, setPending] = useState<{ from: string; output: number } | null>(null);
  const [wireDraft, setWireDraft] = useState<WireDraft | null>(null);
  const [selectedWire, setSelectedWire] = useState<string | null>(null);
  const [tidyWiring, setTidyWiring] = useState(true);
  const [busWiring, setBusWiring] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [editingLabel, setEditingLabel] = useState<{ id: string; value: string } | null>(null);
  const [search, setSearch] = useState("");
  const [circuitSearch, setCircuitSearch] = useState("");
  const [circuitFamily, setCircuitFamily] = useState<BlueprintFamily | "examples" | "storage">(
    "transistor",
  );
  const [showVdd, setShowVdd] = useState(true);
  const [showGround, setShowGround] = useState(true);
  const [implementationMode, setImplementationMode] = useState(false);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    kind: "node" | "wire" | "board";
    id?: string;
  } | null>(null);
  const [marquee, setMarquee] = useState<{
    x: number;
    y: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [saved, setSaved] = useState<Record<string, Circuit>>({});
  const [message, setMessage] = useState(
    "Drag from an output to an input to wire. Click a wire to set its color.",
  );
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [panMode, setPanMode] = useState(false);
  const canvasWidth = Math.max(
    WIDTH,
    ...circuit.nodes.map((item) => item.x + nodeWidth(item) + 50),
  );
  const canvasHeight = Math.max(
    HEIGHT,
    ...circuit.nodes.map((item) => item.y + nodeHeight(item) + 50),
  );
  const routes = useMemo(
    () =>
      routeCircuitWires(
        circuit.wires.flatMap((wire) => {
          const from = circuit.nodes.find((node) => node.id === wire.from);
          const to = circuit.nodes.find((node) => node.id === wire.to);
          return from && to
            ? [
                {
                  id: wire.id,
                  from: wire.from,
                  to: wire.to,
                  output: wire.output ?? 0,
                  start: { x: from.x + nodeWidth(from), y: outY(from, wire.output ?? 0) },
                  end: { x: to.x, y: portY(to, wire.input) },
                },
              ]
            : [];
        }),
        circuit.nodes.map((node) => ({
          id: node.id,
          x: node.x,
          y: node.y,
          width: nodeWidth(node),
          height: nodeHeight(node),
        })),
        busWiring,
      ),
    [circuit.nodes, circuit.wires, busWiring],
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
  const queuedScroll = useRef<{ left: number; top: number } | null>(null);
  const zoomFrame = useRef<number | null>(null);
  const spaceHeld = useRef(false);
  const activePan = useRef<{ id: number; x: number; y: number } | null>(null);
  const touchPointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; x: number; y: number } | null>(null);
  const touchMoved = useRef(false);
  const inputFile = useRef<HTMLInputElement>(null);
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
      const pointX = (anchorX - rect.left + left) / old;
      const pointY = (anchorY - rect.top + top) / old;
      const target = {
        left: pointX * next - (destinationX - rect.left),
        top: pointY * next - (destinationY - rect.top),
      };
      zoomRef.current = next;
      setZoom(next);
      queuedScroll.current = target;
      if (zoomFrame.current !== null) cancelAnimationFrame(zoomFrame.current);
      zoomFrame.current = requestAnimationFrame(() => {
        viewport.scrollLeft = target.left;
        viewport.scrollTop = target.top;
        queuedScroll.current = null;
        zoomFrame.current = null;
      });
    },
    [],
  );
  const zoomFromCenter = (next: number) => {
    const rect = boardViewport.current?.getBoundingClientRect();
    if (!rect) return;
    zoomAt(next, rect.left + rect.width / 2, rect.top + rect.height / 2);
  };
  const fitCanvas = () => {
    const viewport = boardViewport.current;
    if (!viewport) return;
    const next = Math.max(
      MIN_ZOOM,
      Math.min(
        MAX_ZOOM,
        (viewport.clientWidth - 24) / canvasWidth,
        (viewport.clientHeight - 24) / canvasHeight,
      ),
    );
    zoomRef.current = next;
    setZoom(next);
    if (zoomFrame.current !== null) cancelAnimationFrame(zoomFrame.current);
    zoomFrame.current = requestAnimationFrame(() => {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
      queuedScroll.current = null;
      zoomFrame.current = null;
    });
  };
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
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const anchor = gestureAnchor(event);
      zoomAt(zoomRef.current * Math.exp(-event.deltaY * 0.01), anchor.x, anchor.y);
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
    workspaceElement.addEventListener("wheel", onWheel, { capture: true, passive: false });
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
      workspaceElement.removeEventListener("wheel", onWheel, true);
      workspaceElement.removeEventListener("gesturestart", onGestureStart, true);
      workspaceElement.removeEventListener("gesturechange", onGestureChange, true);
      workspaceElement.removeEventListener("gestureend", onGestureEnd, true);
      viewport.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      if (zoomFrame.current !== null) cancelAnimationFrame(zoomFrame.current);
    };
  }, [zoomAt]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const parsed = JSON.parse(raw) as { current?: unknown; saved?: Record<string, unknown> };
        const restored = validateCircuit(parsed.current);
        if (restored) setCircuit(restored);
        if (parsed.saved && typeof parsed.saved === "object") {
          const valid: Record<string, Circuit> = {};
          for (const [name, value] of Object.entries(parsed.saved)) {
            const item = validateCircuit(value);
            if (item) valid[name] = item;
          }
          setSaved(valid);
        }
      }
    } catch {
      setMessage("Saved circuits could not be loaded. Starter circuit is ready.");
    }
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
    if (!circuit.nodes.length && !circuit.wires.length) return;
    if (!window.confirm(`Clear all ${circuit.nodes.length} parts and ${circuit.wires.length} wires from this canvas?`)) return;
    const empty = { ...circuit, nodes: [], wires: [] };
    circuitRef.current = empty;
    setCircuit(empty);
    setPending(null);
    setWireDraft(null);
    wireDraftRef.current = null;
    setSelectedWire(null);
    setSelected([]);
    setMarquee(null);
    setDrag(null);
    setMenu(null);
    resetRuntime();
    setMessage("Canvas cleared.");
  };
  const load = (next: Circuit) => {
    const copy = clone(next);
    setViewPath([]);
    circuitRef.current = copy;
    setCircuit(copy);
    setPending(null);
    setWireDraft(null);
    wireDraftRef.current = null;
    setSelectedWire(null);
    setSelected([]);
    resetRuntime();
    setMessage(`${copy.name} loaded.`);
  };
  const enterCircuit = (next: Circuit, via: string, moduleId?: string) => {
    const parentSnapshot = snapshotRef.current;
    setViewPath((current) => [
      ...current,
      { parent: clone(circuit), snapshot: parentSnapshot, via, moduleId },
    ]);
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
    setCircuit(copy);
    setRunning(false);
    setSelected([]);
    setSelectedWire(null);
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
  const goBack = () => {
    const level = viewPath.at(-1);
    if (!level) return;
    const parent = level.moduleId
      ? withUpdatedModule(level.parent, level.moduleId, circuit)
      : level.parent;
    setViewPath((current) => current.slice(0, -1));
    circuitRef.current = parent;
    setCircuit(parent);
    setRunning(false);
    setSelected(level.moduleId ? [level.moduleId] : []);
    setSelectedWire(null);
    setPending(null);
    const parentSnapshot = level.moduleId
      ? {
          ...level.snapshot,
          modules: { ...level.snapshot.modules, [level.moduleId]: snapshotRef.current },
        }
      : level.snapshot;
    const restored = step(parent, parentSnapshot, clockRef.current);
    snapshotRef.current = restored;
    setSnapshot(restored);
    setMessage(`Back to ${parent.name}.`);
  };
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
  const addNode = (type: GateType, position?: { x: number; y: number }) => {
    const index = circuit.nodes.length;
    const next: Node = {
      id: crypto.randomUUID(),
      type,
      x: Math.max(0, Math.min(canvasWidth - NODE_WIDTH, position?.x ?? 110 + (index % 5) * 155)),
      y: Math.max(
        0,
        Math.min(canvasHeight - NODE_HEIGHT, position?.y ?? 90 + (Math.floor(index / 5) % 5) * 90),
      ),
      value: false,
      ...(type === "input4" || type === "input8" ? { numberValue: 0 } : {}),
    };
    setCircuit((current) => ({ ...current, nodes: [...current.nodes, next] }));
    setSelected([next.id]);
    setPending(null);
  };
  const addModule = (source: Circuit, position?: { x: number; y: number }) => {
    if (
      !moduleOutputs(source).length ||
      moduleInputs(source).length > 24 ||
      moduleOutputs(source).length > 24
    ) {
      setMessage("This circuit needs 1–24 outputs and at most 24 inputs to become a black box.");
      return;
    }
    const index = circuit.nodes.length;
    const next: Node = {
      id: crypto.randomUUID(),
      type: "module",
      module: clone(source),
      x: Math.max(0, Math.min(canvasWidth - MODULE_WIDTH, position?.x ?? 70 + (index % 3) * 270)),
      y: 0,
    };
    next.y = Math.max(
      0,
      Math.min(
        canvasHeight - nodeHeight(next),
        position?.y ?? 90 + (Math.floor(index / 3) % 5) * 90,
      ),
    );
    setCircuit((current) => ({ ...current, nodes: [...current.nodes, next] }));
    setSelected([next.id]);
    setMessage(`${source.name} added as a black box.`);
  };
  const insertCircuit = (source: Circuit, position: { x: number; y: number }) => {
    const minX = Math.min(...source.nodes.map((node) => node.x));
    const minY = Math.min(...source.nodes.map((node) => node.y));
    const width = Math.max(...source.nodes.map((node) => node.x)) - minX + NODE_WIDTH;
    const height = Math.max(...source.nodes.map((node) => node.y + nodeHeight(node))) - minY;
    const left = Math.max(0, Math.min(canvasWidth - width, position.x - width / 2));
    const top = Math.max(0, Math.min(canvasHeight - height, position.y - height / 2));
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
  const startWire = (event: React.PointerEvent<HTMLButtonElement>, draft: WireDraft) => {
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
    for (const node of circuitRef.current.nodes) {
      if (draft.from && node.id !== draft.from) {
        for (let input = 0; input < inputCount(node); input++) {
          const distance = Math.hypot(point.x - node.x, point.y - portY(node, input));
          if (distance < 20 && (!best || distance < best.distance))
            best = { id: node.id, input, distance };
        }
      }
      if (draft.to && node.id !== draft.to) {
        for (let output = 0; output < outputCount(node); output++) {
          const distance = Math.hypot(
            point.x - node.x - nodeWidth(node),
            point.y - outY(node, output),
          );
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
      if (event.key === "Escape") {
        setMenu(null);
        setPending(null);
        setWireDraft(null);
        wireDraftRef.current = null;
        setSelected([]);
      }
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        selected.length &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        const removed = new Set(selected);
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
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected]);
  const save = () => {
    const name = window.prompt("Name this circuit", circuit.name)?.trim();
    if (!name) return;
    const next = { ...circuit, name: name.slice(0, 80) };
    setCircuit(next);
    setSaved((current) => ({ ...current, [next.name]: clone(next) }));
    setMessage(`Saved “${next.name}” in this browser.`);
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
        setDrag(null);
        wireDraftRef.current = null;
        setWireDraft(null);
      }
      return;
    }
    if (event.button === 1 || (event.button === 0 && (panMode || spaceHeld.current))) {
      event.preventDefault();
      event.stopPropagation();
      activePan.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
      setMarquee(null);
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
      x: ((clientX - rect.left) * canvasWidth) / rect.width,
      y: ((clientY - rect.top) * canvasHeight) / rect.height,
    };
  };
  const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
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
    const starts = Object.values(active.starts);
    const boundedX = Math.max(
      -Math.min(...starts.map((p) => p.x)),
      Math.min(
        canvasWidth -
          Math.max(
            ...Object.entries(active.starts).map(
              ([id, point]) =>
                point.x + nodeWidth(circuitRef.current.nodes.find((node) => node.id === id)!),
            ),
          ),
        dx,
      ),
    );
    const boundedY = Math.max(
      -Math.min(...starts.map((p) => p.y)),
      Math.min(
        canvasHeight -
          Math.max(
            ...Object.entries(active.starts).map(
              ([id, point]) =>
                point.y + nodeHeight(circuitRef.current.nodes.find((node) => node.id === id)!),
            ),
          ),
        dy,
      ),
    );
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
    setDrag(null);
  };
  const visibleParts = palette.filter((type) =>
    `${type} ${LABELS[type]}`.toLowerCase().includes(search.toLowerCase().trim()),
  );
  const visibleExamples = Object.values(PRESETS).filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase().trim()),
  );
  const library =
    circuitFamily === "examples"
      ? PRESETS
      : circuitFamily === "storage"
        ? Object.fromEntries(
            Object.entries(PRESETS).filter(([name]) =>
              /latch|flip-flop|register|counter|SRAM|DRAM|flash memory/i.test(name),
            ),
          )
        : Object.fromEntries(
            Object.entries(BLUEPRINTS).filter(([name]) =>
              name.endsWith(`from ${BLUEPRINT_FAMILIES[circuitFamily].suffix}`),
            ),
          );
  const visibleCircuits = Object.values(library).filter((item) =>
    item.name.toLowerCase().includes(circuitSearch.toLowerCase().trim()),
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
  const selectedNode =
    selected.length === 1 ? circuit.nodes.find((node) => node.id === selected[0]) : undefined;
  const selectedWireData = circuit.wires.find((wire) => wire.id === selectedWire);
  const draftTarget = wireDraft ? nearestConnector(wireDraft, wireDraft) : null;
  const draftStart = wireDraft?.from
    ? circuit.nodes.find((node) => node.id === wireDraft.from)
    : null;
  const draftEnd = wireDraft?.to ? circuit.nodes.find((node) => node.id === wireDraft.to) : null;
  const previewStart = draftStart
    ? { x: draftStart.x + nodeWidth(draftStart), y: outY(draftStart, wireDraft!.output ?? 0) }
    : draftTarget && wireDraft?.to
      ? {
          x:
            circuit.nodes.find((node) => node.id === draftTarget.id)!.x +
            nodeWidth(circuit.nodes.find((node) => node.id === draftTarget.id)!),
          y: outY(
            circuit.nodes.find((node) => node.id === draftTarget.id)!,
            draftTarget.output ?? 0,
          ),
        }
      : wireDraft
        ? { x: wireDraft.x, y: wireDraft.y }
        : null;
  const previewEnd = draftEnd
    ? { x: draftEnd.x, y: portY(draftEnd, wireDraft!.input!) }
    : draftTarget && wireDraft?.from
      ? {
          x: circuit.nodes.find((node) => node.id === draftTarget.id)!.x,
          y: portY(circuit.nodes.find((node) => node.id === draftTarget.id)!, draftTarget.input!),
        }
      : wireDraft
        ? { x: wireDraft.x, y: wireDraft.y }
        : null;
  if (implementationMode)
    return (
      <ImplementationView
        circuit={circuit}
        onClose={() => setImplementationMode(false)}
        showVdd={showVdd}
        showGround={showGround}
        onVddChange={setShowVdd}
        onGroundChange={setShowGround}
      />
    );
  return (
    <div className={styles.shell}>
      <div className={styles.toolbar}>
        <div className={styles.identity}>
          <span className={styles.eyebrow}>DIGITAL LOGIC LAB</span>
          <strong>{circuit.name}</strong>
        </div>
        <div className={styles.transport}>
          <button
            type="button"
            onClick={() => {
              setRunning(false);
              setImplementationMode(true);
            }}
          >
            Full CMOS diagram
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
          <button
            type="button"
            onClick={() => setRunning((value) => !value)}
            className={styles.primary}
          >
            {running ? "Pause" : "Run clock"}
          </button>
          <button type="button" onClick={() => advance()} disabled={running}>
            Step ½ cycle
          </button>
          <button type="button" onClick={resetRuntime}>
            Reset
          </button>
          <button
            type="button"
            className={styles.clearCanvas}
            onClick={clearCanvas}
            disabled={circuit.nodes.length === 0 && circuit.wires.length === 0}
          >
            Clear canvas
          </button>
          <button
            type="button"
            aria-pressed={tidyWiring}
            onClick={() => {
              const next = !tidyWiring;
              setTidyWiring(next);
              setBusWiring(next);
            }}
          >
            {tidyWiring ? "Simple wiring" : "Clean up wiring"}
          </button>
          <button
            type="button"
            aria-pressed={busWiring}
            title="Group connections from one output. Click a bus, then an input, to add a branch."
            onClick={() => {
              const next = !busWiring;
              setBusWiring(next);
              setTidyWiring(true);
              setMessage(
                next
                  ? "Fan-out buses group wires from one output. Click a bus, then an input, to add a branch."
                  : "Buses hidden. Clean wiring remains on.",
              );
            }}
          >
            {busWiring ? "Hide buses" : "Fan-out buses"}
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
        </div>
        <div className={styles.metrics}>
          <span>Cycle {Math.floor(tick / 2)}</span>
          <span className={clsx(styles.clock, clockHigh && styles.on)}>
            CLK {clockHigh ? "1" : "0"}
          </span>
        </div>
      </div>
      {viewPath.length > 0 && (
        <nav className={styles.viewPath} aria-label="Circuit depth">
          <button type="button" onClick={goBack}>
            ← Back
          </button>
          <span>
            {viewPath.map((level) => level.parent.name).join(" / ")} / {circuit.name}
          </span>
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
            {renderParts()}
            {visibleExamples.map((example) => (
              <button
                type="button"
                key={example.name}
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
            ))}
            {visibleParts.length === 0 && visibleExamples.length === 0 && <p>No matching parts</p>}
          </div>
          <div className={styles.sidebarFoot}>
            Wire output → input
            <br />
            One wire per input
            <br />
            Unwired inputs read 0
          </div>
        </aside>
        <div ref={workspace} className={styles.workspace}>
          <div className={styles.canvasControls} role="toolbar" aria-label="Canvas view controls">
            <button
              type="button"
              onClick={() => zoomFromCenter(zoomRef.current / 1.25)}
              aria-label="Zoom out"
            >
              −
            </button>
            <span aria-live="polite">{Math.round(zoom * 100)}%</span>
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
              aria-pressed={panMode}
              onClick={() => setPanMode((value) => !value)}
            >
              Pan
            </button>
            <small>
              Drag empty space to select · Pan: Space+drag, middle drag, or touch · Pinch to zoom
            </small>
          </div>
          <div
            ref={boardViewport}
            className={clsx(styles.boardScroll, panMode && styles.panMode)}
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
                className={styles.board}
                style={{
                  width: canvasWidth,
                  height: canvasHeight,
                  position: "absolute",
                  transform: `scale(${zoom})`,
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
                    (event.target as Element).closest(`.${styles.node}`) ||
                    (event.target as Element).closest(`.${styles.wireHit}`)
                  )
                    return;
                  event.currentTarget.setPointerCapture(event.pointerId);
                  const point = boardPoint(event.clientX, event.clientY);
                  setMarquee({ ...point, endX: point.x, endY: point.y });
                  setSelected([]);
                  setMenu(null);
                }}
                onPointerUp={finishPointer}
                onPointerCancel={() => {
                  wireDraftRef.current = null;
                  setWireDraft(null);
                  setMarquee(null);
                  setDrag(null);
                  suppressBoardClick.current = false;
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const blueprint = event.dataTransfer.getData("application/x-logic-circuit");
                  if (blueprint && (BLUEPRINTS[blueprint] || PRESETS[blueprint])) {
                    insertCircuit(
                      BLUEPRINTS[blueprint] || PRESETS[blueprint],
                      boardPoint(event.clientX, event.clientY),
                    );
                    return;
                  }
                  const moduleName = event.dataTransfer.getData("application/x-logic-module");
                  if (
                    moduleName &&
                    (BLUEPRINTS[moduleName] || PRESETS[moduleName] || saved[moduleName])
                  ) {
                    const point = boardPoint(event.clientX, event.clientY);
                    addModule(BLUEPRINTS[moduleName] || PRESETS[moduleName] || saved[moduleName], {
                      x: point.x - MODULE_WIDTH / 2,
                      y: point.y - NODE_HEIGHT / 2,
                    });
                    return;
                  }
                  const type = event.dataTransfer.getData("application/x-logic-gate") as GateType;
                  if (!palette.includes(type)) return;
                  const point = boardPoint(event.clientX, event.clientY);
                  addNode(type, { x: point.x - NODE_WIDTH / 2, y: point.y - NODE_HEIGHT / 2 });
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setMenu({ x: event.clientX, y: event.clientY, kind: "board" });
                }}
                onClick={() => {
                  if (suppressBoardClick.current) {
                    suppressBoardClick.current = false;
                    return;
                  }
                  if (pending) setPending(null);
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
                      style={{ left, top, width: right - left, height: bottom - top }}
                      aria-label={`${group.label} circuit boundary`}
                    >
                      <span>{group.label}</span>
                    </div>
                  );
                })}
                <svg
                  className={styles.wires}
                  viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
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
                    const from = circuit.nodes.find((node) => node.id === wire.from);
                    const to = circuit.nodes.find((node) => node.id === wire.to);
                    if (!from || !to) return null;
                    if (hasTransistors && (!powerVisible(from) || !powerVisible(to))) return null;
                    const x1 = from.x + nodeWidth(from),
                      y1 = outY(from, wire.output ?? 0),
                      x2 = to.x,
                      y2 = portY(to, wire.input);
                    const d =
                      tidyWiring || busWiring || x2 <= x1
                        ? routes.paths[wire.id]
                        : simpleWirePath({ x: x1, y: y1 }, { x: x2, y: y2 });
                    const color =
                      WIRE_COLORS[wire.color ?? defaultWireColor(wire.from, circuit.nodes)];
                    return (
                      <g key={wire.id} style={{ "--wire-color": color } as React.CSSProperties}>
                        <path
                          d={d}
                          className={styles.wireHit}
                          role="button"
                          tabIndex={0}
                          aria-label={`Select wire from ${from.label || LABELS[from.type]} ${outputLabel(from, wire.output ?? 0)} to ${to.label || LABELS[to.type]} ${inputLabel(to, wire.input)}`}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") setSelectedWire(wire.id);
                            if (event.key === "Delete") {
                              setCircuit((current) => ({
                                ...current,
                                wires: current.wires.filter((item) => item.id !== wire.id),
                              }));
                            }
                          }}
                          onContextMenu={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setSelectedWire(wire.id);
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
                            setSelectedWire(null);
                          }}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedWire(wire.id);
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
                            selectedWire === wire.id && styles.wireSelected,
                          )}
                        />
                      </g>
                    );
                  })}
                  {previewStart && previewEnd && wireDraft && (
                    <path
                      d={
                        tidyWiring || previewEnd.x <= previewStart.x
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
                {circuit.nodes
                  .filter((node) => !hasTransistors || powerVisible(node))
                  .map((node) => (
                    <div
                      key={node.id}
                      role="group"
                      aria-label={`${node.label || (node.type === "module" ? node.module?.name || "Module" : LABELS[node.type])} — ${node.type === "module" ? node.module?.name || "Module" : LABELS[node.type]} part`}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.stopPropagation();
                          setSelected([node.id]);
                        }
                      }}
                      className={clsx(
                        styles.node,
                        selected.includes(node.id) && styles.selected,
                        snapshot.values[node.id] && styles.active,
                        node.type === "lamp" && snapshot.values[node.id] && styles.lampLit,
                      )}
                      style={
                        {
                          "--part-accent": partColors[node.type],
                          left: `${(node.x / canvasWidth) * 100}%`,
                          top: `${(node.y / canvasHeight) * 100}%`,
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
                        event.currentTarget.setPointerCapture(event.pointerId);
                        const ids = selected.includes(node.id) ? selected : [node.id];
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
                        setSelectedWire(null);
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
                          className={styles.portRow}
                          style={{
                            top: `${((portY(node, input) - node.y) / nodeHeight(node)) * 100}%`,
                          }}
                        >
                          <button
                            type="button"
                            className={styles.input}
                            data-node-id={node.id}
                            data-input={input}
                            style={{ top: 0 }}
                            onPointerDown={(event) =>
                              startWire(event, {
                                to: node.id,
                                input,
                                x: node.x,
                                y: portY(node, input),
                                originX: node.x,
                                originY: portY(node, input),
                              })
                            }
                            onClick={(event) => {
                              if (event.detail === 0)
                                connect(pending?.from ?? null, node.id, input, pending?.output);
                            }}
                            data-wire-target={Boolean(
                              wireDraft?.from &&
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
                          {node.type === "module" && (
                            <span className={styles.inputPortLabel} title={inputLabel(node, input)}>
                              {inputLabel(node, input)}
                            </span>
                          )}
                        </div>
                      ))}
                      {editingLabel?.id !== node.id && (
                        <button
                          type="button"
                          className={styles.editName}
                          aria-label={`Edit ${node.label || LABELS[node.type]} label`}
                          title="Edit label"
                          onClick={() => setEditingLabel({ id: node.id, value: node.label || "" })}
                        >✎</button>
                      )}
                      <div
                        className={clsx(
                          styles.nodeBody,
                          node.type === "module" && styles.moduleBody,
                        )}
                      >
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
                        {(editingLabel?.id === node.id || (node.label && node.label !== (node.type === "module" ? node.module?.name || "Module" : LABELS[node.type]))) && <div className={styles.nodeNameRow}>
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
                          ) : node.label ? (
                            <span
                              className={styles.nodeLabel}
                              title="Double-click to edit label"
                              onDoubleClick={(event) => {
                                event.stopPropagation();
                                setEditingLabel({ id: node.id, value: node.label || "" });
                              }}
                            >{node.label}</span>
                          ) : null}
                        </div>}
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
                      {Array.from({ length: outputCount(node) }, (_, output) => (
                        <div
                          key={`${node.id}-output-${output}`}
                          className={styles.portRow}
                          style={{
                            top: `${((outY(node, output) - node.y) / nodeHeight(node)) * 100}%`,
                          }}
                        >
                          {node.type === "module" && (
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
                            onPointerDown={(event) =>
                              startWire(event, {
                                from: node.id,
                                output,
                                x: node.x + nodeWidth(node),
                                y: outY(node, output),
                                originX: node.x + nodeWidth(node),
                                originY: outY(node, output),
                              })
                            }
                            onClick={(event) => {
                              if (event.detail !== 0) return;
                              setPending({ from: node.id, output });
                              setMessage(`Choose an input for ${outputLabel(node, output)}.`);
                            }}
                            data-wire-target={Boolean(
                              wireDraft?.to &&
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
                      left: Math.min(marquee.x, marquee.endX),
                      top: Math.min(marquee.y, marquee.endY),
                      width: Math.abs(marquee.endX - marquee.x),
                      height: Math.abs(marquee.endY - marquee.y),
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
              {circuit.nodes.length} parts · {circuit.wires.length} wires
              {selected.length ? ` · ${selected.length} selected` : ""}
            </span>
          </div>
        </div>
        <aside className={styles.inspector} aria-label="Circuit library and controls">
          <h2>Circuitry library</h2>
          <p>
            Click to open a blueprint. Drag to add the full circuit. Use Black box to place an
            expandable part, including storage circuits.
          </p>
          <div className={styles.familyTabs} role="group" aria-label="Circuit construction">
            {(Object.keys(BLUEPRINT_FAMILIES) as BlueprintFamily[]).map((family) => (
              <button
                key={family}
                type="button"
                aria-pressed={circuitFamily === family}
                onClick={() => setCircuitFamily(family)}
              >
                {BLUEPRINT_FAMILIES[family].label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={circuitFamily === "examples"}
              onClick={() => setCircuitFamily("examples")}
            >
              Examples
            </button>
            <button
              type="button"
              aria-pressed={circuitFamily === "storage"}
              onClick={() => setCircuitFamily("storage")}
            >
              Storage
            </button>
          </div>
          <p className={styles.libraryNote}>
            {circuitFamily === "examples"
              ? "Open a larger example circuit to explore its wiring."
              : circuitFamily === "storage"
                ? "Place a storage black box, then double-click it to inspect and edit its circuit."
                : BLUEPRINT_FAMILIES[circuitFamily].note}
          </p>
          <input
            className={styles.search}
            type="search"
            placeholder="Search circuits"
            aria-label="Search circuits"
            value={circuitSearch}
            onChange={(event) => setCircuitSearch(event.target.value)}
          />
          <div className={styles.presetList}>
            {visibleCircuits.map((preset) => (
              <div className={styles.circuitEntry} key={preset.name}>
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/x-logic-circuit", preset.name);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => load(preset)}
                  title={`Open ${preset.name} blueprint`}
                >
                  {preset.name}
                  <span>↗</span>
                </button>
                {circuitFamily !== "examples" && circuitFamily !== "storage" && (
                  <span className={styles.recipe}>
                    {
                      BLUEPRINT_RECIPES[circuitFamily][
                        preset.name.split(" ")[0].toLowerCase() as LogicGate
                      ]
                    }
                  </span>
                )}
                {MEMORY_HINTS[preset.name] && (
                  <span className={styles.recipe}>{MEMORY_HINTS[preset.name]}</span>
                )}
                <button
                  type="button"
                  className={styles.blackBox}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/x-logic-module", preset.name);
                    event.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => addModule(preset)}
                  title={`Add ${preset.name} as a black box`}
                >
                  ▣ Black box
                </button>
              </div>
            ))}
            {visibleCircuits.length === 0 && <p>No matching circuits</p>}
          </div>
          <div className={styles.divider} />
          <h2>My circuits</h2>
          <div className={styles.actions}>
            <button type="button" onClick={save}>
              Save snapshot
            </button>
            <button type="button" onClick={exportCircuit}>
              Export JSON
            </button>
            <button type="button" onClick={() => inputFile.current?.click()}>
              Import JSON
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
          </div>
          {Object.values(saved).length > 0 && (
            <div className={styles.savedList}>
              {Object.values(saved).map((item) => (
                <div key={item.name}>
                  <button type="button" onClick={() => load(item)}>
                    {item.name}
                  </button>
                  <button
                    type="button"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("application/x-logic-module", item.name);
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => addModule(item)}
                    title={`Add ${item.name} as a black box`}
                  >
                    ▣
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${item.name}`}
                    onClick={() =>
                      setSaved((current) => {
                        const next = { ...current };
                        delete next[item.name];
                        return next;
                      })
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className={styles.divider} />
          <h2>Selected wire</h2>
          {selectedWireData ? (
            <div className={styles.wireInspector}>
              <p>
                {circuit.nodes.find((node) => node.id === selectedWireData.from)?.label || "Output"}
                {" · "}
                {outputLabel(
                  circuit.nodes.find((node) => node.id === selectedWireData.from)!,
                  selectedWireData.output ?? 0,
                )}
                {" → "}
                {circuit.nodes.find((node) => node.id === selectedWireData.to)?.label || "Input"}
                {" · "}
                {inputLabel(
                  circuit.nodes.find((node) => node.id === selectedWireData.to)!,
                  selectedWireData.input,
                )}
              </p>
              <span>Signal color</span>
              <div className={styles.colorSwatches}>
                {wireColorNames.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={clsx(
                      styles.colorSwatch,
                      (selectedWireData.color ??
                        defaultWireColor(selectedWireData.from, circuit.nodes)) === color &&
                        styles.colorSelected,
                    )}
                    style={{ backgroundColor: WIRE_COLORS[color] }}
                    aria-label={`Color wire ${color}`}
                    title={color}
                    onClick={() =>
                      setCircuit((current) => ({
                        ...current,
                        wires: current.wires.map((wire) =>
                          wire.id === selectedWire ? { ...wire, color } : wire,
                        ),
                      }))
                    }
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setCircuit((current) => ({
                    ...current,
                    wires: current.wires.filter((wire) => wire.id !== selectedWire),
                  }));
                  setSelectedWire(null);
                }}
              >
                Cut wire
              </button>
            </div>
          ) : (
            <p>Click a wire to set its color.</p>
          )}
          <div className={styles.divider} />
          <h2>Selected part</h2>
          {selectedNode ? (
            <div className={styles.selectedPart}>
              <strong>
                {selectedNode.type === "module"
                  ? selectedNode.module?.name || "Module"
                  : LABELS[selectedNode.type]}
              </strong>
              <label>
                Represents
                <input
                  value={selectedNode.label || ""}
                  maxLength={30}
                  onChange={(event) =>
                    setCircuit((current) => ({
                      ...current,
                      nodes: current.nodes.map((node) =>
                        node.id === selected[0] ? { ...node, label: event.target.value } : node,
                      ),
                    }))
                  }
                />
              </label>
              {selectedNode.type === "module" && (
                <div className={styles.modulePorts}>
                  {circuitHints[selectedNode.module!.name] && (
                    <p>{circuitHints[selectedNode.module!.name]}</p>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      enterCircuit(
                        selectedNode.module!,
                        selectedNode.label || selectedNode.module!.name,
                        selectedNode.id,
                      )
                    }
                  >
                    Open internal wiring ↘
                  </button>
                  <span>Inputs</span>
                  {moduleInputs(selectedNode.module!).map((port, index) => (
                    <small key={port.id}>
                      {index + 1}. {port.label || `Input ${index + 1}`}
                    </small>
                  ))}
                  <span>Outputs</span>
                  {moduleOutputs(selectedNode.module!).map((port, index) => (
                    <small key={port.id}>
                      {index + 1}. {port.label || `Output ${index + 1}`} ={" "}
                      {snapshot.outputs[selectedNode.id]?.[index] ? 1 : 0}
                    </small>
                  ))}
                </div>
              )}
              {(GATE_NAMES.includes(selectedNode.type as LogicGate) ||
                (selectedNode.type === "module" &&
                  blueprintGate(selectedNode.module!) !== null)) && (
                <div className={styles.resolutionChoices}>
                  <span>Explore implementation</span>
                  {(Object.keys(BLUEPRINT_FAMILIES) as BlueprintFamily[]).map((family) => {
                    const gate =
                      selectedNode.type === "module"
                        ? blueprintGate(selectedNode.module!)!
                        : (selectedNode.type as LogicGate);
                    return (
                      <button
                        key={family}
                        type="button"
                        onClick={() => viewGate(gate, family, selectedNode)}
                      >
                        {BLUEPRINT_FAMILIES[family].label} ↘
                      </button>
                    );
                  })}
                </div>
              )}
              <button type="button" onClick={() => removeNodes()}>
                Delete part
              </button>
            </div>
          ) : selected.length > 1 ? (
            <div className={styles.selectedPart}>
              <strong>{selected.length} parts selected</strong>
              <button type="button" onClick={() => removeNodes()}>
                Delete selected parts
              </button>
            </div>
          ) : (
            <p>Click a part to inspect it. Drag a rectangle to select several.</p>
          )}
        </aside>
      </div>
      {menu && (
        <div
          className={styles.contextMenu}
          style={{
            left: Math.min(menu.x, window.innerWidth - 190),
            top: Math.min(menu.y, window.innerHeight - 160),
          }}
          role="menu"
          onContextMenu={(event) => event.preventDefault()}
        >
          {menu.kind === "node" && (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() =>
                  removeNodes(selected.includes(menu.id || "") ? selected : [menu.id!])
                }
              >
                Delete{" "}
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
                Cut connected wires
              </button>
            </>
          )}
          {menu.kind === "wire" && (
            <>
              <span className={styles.contextLabel}>Color wire</span>
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
                          wire.id === menu.id ? { ...wire, color } : wire,
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
                    wires: current.wires.filter((wire) => wire.id !== menu.id),
                  }));
                  setSelectedWire(null);
                  setMenu(null);
                }}
              >
                Cut wire
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
                Select all parts
              </button>
              <button type="button" role="menuitem" onClick={() => setMenu(null)}>
                Close menu
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
