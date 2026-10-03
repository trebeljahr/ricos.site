import Link from "next/link";
import clsx from "clsx";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useHistoryState } from "../../hooks/useHistoryState";
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
import { collectUnfoldableIds } from "../../lib/computer/implementation";
import { MEMORY_HINTS } from "../../lib/computer/memoryCircuits";
import { routeCircuitWires, simpleWirePath, wirePath } from "../../lib/computer/wireRouting";
import { ActionIcon } from "./ActionIcon";
import { GateSymbol } from "./GateSymbol";
import { UnfoldedCanvas } from "./UnfoldedCanvas";
import styles from "./LogicBuilder.module.css";

const STORAGE = "ricos-computer-circuits-v1";
const WIDTH = 900;
const HEIGHT = 520;
const NODE_WIDTH = 132;
const MODULE_WIDTH = 236;
const nodeWidth = (node: Node) =>
  node.type === "module" ? MODULE_WIDTH :
  ["input8", "display8"].includes(node.type) ? 212 :
  ["input4", "display4"].includes(node.type) ? 156 : NODE_WIDTH;
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
const NODE_HEIGHT = 116;
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
type ViewportState = { zoom: number; left: number; top: number };
type ViewLevel = { parent: Circuit; snapshot: Snapshot; via: string; moduleId?: string; unfolded: string[]; viewport?: ViewportState; unfoldedViewport?: ViewportState };
type BuilderDocument = { circuit: Circuit; saved: Record<string, Circuit>; viewPath: ViewLevel[] };
const withUpdatedModule = (parent: Circuit, moduleId: string, inner: Circuit): Circuit => ({
  ...parent,
  nodes: parent.nodes.map((item) =>
    item.id === moduleId ? { ...item, module: clone(inner) } : item,
  ),
});
const nodeHeight = (node: Node) =>
  node.type === "module"
    ? Math.max(NODE_HEIGHT, 92 + Math.max(inputCount(node), outputCount(node)) * 25)
    : ["input4", "input8", "display4", "display8"].includes(node.type)
      ? Math.max(node.type.startsWith("display") ? 142 : NODE_HEIGHT, 92 + Math.max(inputCount(node), outputCount(node)) * 24)
      : ["lamp", "switch", "pulse"].includes(node.type)
        ? 126
      : NODE_HEIGHT;
type PortSide = NonNullable<Node["inputSide"]>;
const portSides: PortSide[] = ["top", "right", "bottom", "left"];
const rotatedSide = (side: PortSide, direction: -1 | 1): PortSide =>
  portSides[(portSides.indexOf(side) + direction + portSides.length) % portSides.length];
const inputSide = (node: Node): PortSide => node.inputSide ??
  (["display4", "display8"].includes(node.type) ? "top" : "left");
const outputSide = (node: Node): PortSide => node.outputSide ??
  (["switch", "pulse", "clock", "high", "ground", "input4", "input8"].includes(node.type)
    ? "bottom" : "right");
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
const portPoint = (node: Node, index: number, kind: "input" | "output") => {
  const side = kind === "input" ? inputSide(node) : outputSide(node);
  const count = kind === "input" ? inputCount(node) : outputCount(node);
  const horizontal = side === "top" || side === "bottom";
  const length = horizontal ? nodeWidth(node) : nodeHeight(node);
  const bitRow = ["input4", "input8", "display4", "display8"].includes(node.type);
  const orderedIndex = horizontal && bitRow ? count - index - 1 : index;
  const edge = node.type === "module" && !horizontal ? 42 : 16;
  const offset = count === 1 ? length / 2 : edge + orderedIndex * ((length - edge - 24) / (count - 1));
  return {
    x: node.x + (horizontal ? offset : side === "left" ? 0 : nodeWidth(node)),
    y: node.y + (horizontal ? side === "top" ? 0 : nodeHeight(node) : offset),
  };
};
const portStyle = (node: Node, index: number, kind: "input" | "output") => {
  const point = portPoint(node, index, kind);
  return {
    left: `${((point.x - node.x) / nodeWidth(node)) * 100}%`,
    top: `${((point.y - node.y) / nodeHeight(node)) * 100}%`,
  };
};

export function LogicBuilder() {
  const history = useHistoryState<BuilderDocument>(() => ({
    circuit: clone(PRESETS["Half adder"]),
    saved: {},
    viewPath: [],
  }));
  const { circuit, saved, viewPath } = history.state;
  const [snapshot, setSnapshot] = useState<Snapshot>(initialSnapshot);
  const [clockHigh, setClockHigh] = useState(false);
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);
  const [rate, setRate] = useState(2);
  const [pending, setPending] = useState<{ from: string; output: number } | null>(null);
  const [wireDraft, setWireDraft] = useState<WireDraft | null>(null);
  const [selectedWires, setSelectedWires] = useState<string[]>([]);
  const [tidyWiring, setTidyWiring] = useState(true);
  const [busWiring, setBusWiring] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [busSource, setBusSource] = useState("");
  const [editingLabel, setEditingLabel] = useState<{ id: string; value: string } | null>(null);
  const [search, setSearch] = useState("");
  const [circuitFamily, setCircuitFamily] = useState<BlueprintFamily>("transistor");
  const [showVdd, setShowVdd] = useState(true);
  const [showGround, setShowGround] = useState(true);
  const [unfolded, setUnfolded] = useState<ReadonlySet<string>>(() => new Set());
  const [unfoldedRestore, setUnfoldedRestore] = useState<ViewportState | undefined>();
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    kind: "node" | "wire" | "board";
    id?: string;
  } | null>(null);
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
    "Drag from an output to an input to wire. Click a wire to set its color.",
  );
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [selectMode, setSelectMode] = useState(false);
  const [bounds, setBounds] = useState({ left: -2000, top: -2000, right: 3000, bottom: 2500 });
  const canvasWidth = bounds.right - bounds.left;
  const canvasHeight = bounds.bottom - bounds.top;
  const previousBounds = useRef(bounds);
  useEffect(() => {
    if (!circuit.nodes.length) return;
    const left = Math.min(...circuit.nodes.map((node) => node.x)) - 300;
    const top = Math.min(...circuit.nodes.map((node) => node.y)) - 300;
    const right = Math.max(...circuit.nodes.map((node) => node.x + nodeWidth(node))) + 300;
    const bottom = Math.max(...circuit.nodes.map((node) => node.y + nodeHeight(node))) + 300;
    setBounds((current) => left >= current.left && top >= current.top &&
      right <= current.right && bottom <= current.bottom ? current : {
        left: Math.min(current.left, left),
        top: Math.min(current.top, top),
        right: Math.max(current.right, right),
        bottom: Math.max(current.bottom, bottom),
      });
  }, [circuit.nodes]);
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
                  start: portPoint(from, wire.output ?? 0, "output"),
                  end: portPoint(to, wire.input, "input"),
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
        busWiring && circuit.wires.every((wire) => {
          const from = circuit.nodes.find((node) => node.id === wire.from);
          const to = circuit.nodes.find((node) => node.id === wire.to);
          return from && to && outputSide(from) === "right" && inputSide(to) === "left";
        }),
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
  const captureViewport = (): ViewportState => ({
    zoom: zoomRef.current,
    left: (boardViewport.current?.scrollLeft ?? 0) + bounds.left * zoomRef.current,
    top: (boardViewport.current?.scrollTop ?? 0) + bounds.top * zoomRef.current,
  });
  const restoreViewport = (state?: ViewportState) => {
    const next = state ?? { zoom: 1, left: 0, top: 0 };
    zoomRef.current = next.zoom;
    setZoom(next.zoom);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (boardViewport.current) {
        boardViewport.current.scrollLeft = next.left - bounds.left * next.zoom;
        boardViewport.current.scrollTop = next.top - bounds.top * next.zoom;
      }
    }));
  };
  useLayoutEffect(() => {
    const previous = previousBounds.current;
    const viewport = boardViewport.current;
    if (viewport && previous !== bounds) {
      viewport.scrollLeft += (previous.left - bounds.left) * zoomRef.current;
      viewport.scrollTop += (previous.top - bounds.top) * zoomRef.current;
    }
    previousBounds.current = bounds;
  }, [bounds]);
  const growCanvas = () => {
    const viewport = boardViewport.current;
    if (!viewport || unfolded.size) return;
    const margin = 500;
    const step = 2000;
    setBounds((current) => ({
      left: viewport.scrollLeft < margin ? current.left - step : current.left,
      top: viewport.scrollTop < margin ? current.top - step : current.top,
      right: viewport.scrollWidth - viewport.clientWidth - viewport.scrollLeft < margin ? current.right + step : current.right,
      bottom: viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop < margin ? current.bottom + step : current.bottom,
    }));
  };
  const queuedScroll = useRef<{ left: number; top: number } | null>(null);
  const zoomFrame = useRef<number | null>(null);
  const spaceHeld = useRef(false);
  const activePan = useRef<{ id: number; x: number; y: number } | null>(null);
  const touchPointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; x: number; y: number } | null>(null);
  const touchMoved = useRef(false);
  const inputFile = useRef<HTMLInputElement>(null);
  const learningMenu = useRef<HTMLDetailsElement>(null);
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
    const left = Math.min(0, ...circuit.nodes.map((node) => node.x)) - 40;
    const top = Math.min(0, ...circuit.nodes.map((node) => node.y)) - 40;
    const right = Math.max(WIDTH, ...circuit.nodes.map((node) => node.x + nodeWidth(node))) + 40;
    const bottom = Math.max(HEIGHT, ...circuit.nodes.map((node) => node.y + nodeHeight(node))) + 40;
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM,
      (viewport.clientWidth - 24) / (right - left),
      (viewport.clientHeight - 24) / (bottom - top)));

    zoomRef.current = next;
    setZoom(next);
    if (zoomFrame.current !== null) cancelAnimationFrame(zoomFrame.current);
    zoomFrame.current = requestAnimationFrame(() => {
      viewport.scrollLeft = (left - bounds.left) * next - (viewport.clientWidth - (right - left) * next) / 2;
      viewport.scrollTop = (top - bounds.top) * next - (viewport.clientHeight - (bottom - top) * next) / 2;
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
    const copy = clone(next);
    setUnfolded(new Set());
    circuitRef.current = copy;
    publish({ ...history.current(), circuit: copy, viewPath: [] });
    setPending(null);
    setWireDraft(null);
    wireDraftRef.current = null;
    setSelectedWires([]);
    setSelected([]);
    resetRuntime();
    setMessage(`${copy.name} loaded.`);
  };
  const enterCircuit = (next: Circuit, via: string, moduleId?: string) => {
    const parentSnapshot = snapshotRef.current;
    const nextPath = [
      ...viewPath,
      { parent: clone(circuit), snapshot: parentSnapshot, via, moduleId, unfolded: [...unfolded], viewport: captureViewport() },
    ];
    setUnfolded(new Set());
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
    publish({ ...history.current(), circuit: copy, viewPath: nextPath }, false);
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
    setUnfolded(childUnfolded);
    setUnfoldedRestore(level.unfoldedViewport);
    restoreViewport(level.viewport);
    circuitRef.current = parent;
    publish({ ...history.current(), circuit: parent, viewPath: viewPath.slice(0, depth) }, false);
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
    setUnfolded(new Set([...unfolded].filter((entry) => entry.startsWith(`${path}/`))
      .map((entry) => entry.slice(path.length + 1))));
    setUnfoldedRestore(undefined);
    restoreViewport();
    const copy = clone(source);
    moduleInputs(copy).forEach((input) => { input.value = Boolean(innerSnapshot.values[input.id]); });
    circuitRef.current = copy;
    publish({ ...history.current(), circuit: copy, viewPath: [...viewPath, ...levels] }, false);
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
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
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
      x: position?.x ?? 110 + (index % 5) * 155,
      y: position?.y ?? 90 + (Math.floor(index / 5) % 5) * 90,
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
      x: position?.x ?? 70 + (index % 3) * 270,
      y: 0,
    };
    next.y = position?.y ?? 90 + (Math.floor(index / 3) % 5) * 90;
    setCircuit((current) => ({ ...current, nodes: [...current.nodes, next] }));
    setSelected([next.id]);
    setMessage(`${source.name} added as a black box.`);
  };
  const insertCircuit = (source: Circuit, position: { x: number; y: number }) => {
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
    const emptyCanvas = !(event.target as Element).closest(`.${styles.node}, .${styles.wireHit}`);
    if (event.button === 1 || (event.button === 0 &&
        (spaceHeld.current || (emptyCanvas && !event.shiftKey && !selectMode)))) {
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
  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!learningMenu.current?.contains(event.target as globalThis.Node)) {
        learningMenu.current?.removeAttribute("open");
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") learningMenu.current?.removeAttribute("open");
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);
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
      <div className={styles.toolbar}>
        <div className={styles.identity}>
          <Link className={styles.eyebrow} href="/computer">← ALL COMPUTER DEMOS</Link>
          <strong>{circuit.name}</strong>
        </div>
        <div className={styles.transport}>
          <details className={styles.learningMenu} ref={learningMenu}>
            <summary>Learning <svg aria-hidden="true" viewBox="0 0 12 12"><path d="m2 4 4 4 4-4" /></svg></summary>
            <div className={styles.learningPanel}>
              <h2>Build from one kind of part</h2>
              <p>Open a gate built from transistors, NAND, or NOR.</p>
              <div className={styles.buildTabs} role="group" aria-label="Circuit construction">
                {(["transistor", "nand", "nor"] as const).map((family) => (
                  <button key={family} type="button" aria-pressed={circuitFamily === family} onClick={() => setCircuitFamily(family)}>
                    {BLUEPRINT_FAMILIES[family].label}
                  </button>
                ))}
              </div>
              <div className={styles.learningList}>
                {visibleBlueprints.map((blueprint) => (
                  <div className={styles.buildEntry} key={blueprint.name}>
                    <button type="button" onClick={() => { load(blueprint); learningMenu.current?.removeAttribute("open"); }} title={`Open ${blueprint.name} blueprint`}>
                      {blueprint.name.split(" ")[0]} <span>↗</span>
                    </button>
                    <small>{BLUEPRINT_RECIPES[circuitFamily][blueprint.name.split(" ")[0].toLowerCase() as LogicGate]}</small>
                  </div>
                ))}
              </div>
            </div>
          </details>
          <div className={styles.toolGroup} role="group" aria-label="Edit circuit">
            <span className={styles.toolGroupLabel}>Edit</span>
          <button
            type="button"
            className={styles.clearCanvas}
            onClick={() => setDialog("clear")}
            disabled={circuit.nodes.length === 0 && circuit.wires.length === 0}
          >
            <ActionIcon name="clear" /> Clear canvas
          </button>
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
          </div>
          <div className={styles.toolGroup} role="group" aria-label="Simulation">
            <span className={styles.toolGroupLabel}>Simulate</span>
          <button
            type="button"
            onClick={() => setRunning((value) => !value)}
            className={styles.primary}
          >
            <ActionIcon name={running ? "pause" : "play"} /> {running ? "Pause" : "Run clock"}
          </button>
          <button type="button" onClick={() => advance()} disabled={running}>
            <ActionIcon name="step" /> Step ½ cycle
          </button>
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
          </div>
          <div className={styles.toolGroup} role="group" aria-label="Circuit view">
            <span className={styles.toolGroupLabel}>View</span>
          <button type="button" onClick={() => setUnfolded(new Set(collectUnfoldableIds(circuit)))}>
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
          <button
            type="button"
            aria-pressed={tidyWiring}
            onClick={() => {
              const next = !tidyWiring;
              setTidyWiring(next);
              setBusWiring(next);
            }}
          >
            <ActionIcon name="wiring" /> {tidyWiring ? "Simple wiring" : "Clean up wiring"}
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
            <ActionIcon name="bus" /> {busWiring ? "Hide buses" : "Fan-out buses"}
          </button>
          </div>
          <div className={styles.toolGroup} role="group" aria-label="Circuit files">
            <span className={styles.toolGroupLabel}>File</span>
          <button
            type="button"
            className={styles.saveAction}
            onClick={() => {
              setSaveName(circuit.name);
              setDialog("save");
            }}
          >
            <ActionIcon name="save" /> Save
          </button>
          <button type="button" onClick={exportCircuit}><ActionIcon name="export" /> Export JSON</button>
          <button type="button" onClick={() => inputFile.current?.click()}><ActionIcon name="import" /> Import JSON</button>
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
      <div className={clsx(styles.layout, (selectedWireData.length > 0 || selected.length > 0) && styles.layoutWithInspector)}>
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
                  onClick={() => addModule(item)}
                  title={`Add ${item.name} as a black box`}
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
          <div className={styles.sidebarFoot}>
            Wire output → input
            <br />
            One wire per input
            <br />
            Unwired inputs read 0
          </div>
        </aside>
        <div ref={workspace} className={styles.workspace}>
          <div className={styles.canvasControls} role="toolbar" aria-label="Canvas view controls"
            style={{ display: unfolded.size ? "none" : undefined }}>
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
              aria-pressed={selectMode}
              onClick={() => setSelectMode((value) => !value)}
            >
              Select
            </button>
            <small>
              Drag empty space to pan · Shift+drag to select · Pinch to zoom
            </small>
          </div>
          <div
            ref={boardViewport}
            onScroll={growCanvas}
            className={clsx(styles.boardScroll, !selectMode && !unfolded.size && styles.panMode)}
            onPointerDownCapture={unfolded.size ? undefined : gestureDown}
            onPointerMoveCapture={unfolded.size ? undefined : gestureMove}
            onPointerUpCapture={unfolded.size ? undefined : gestureUp}
            onPointerCancelCapture={unfolded.size ? undefined : gestureUp}
            onClickCapture={(event) => {
              if (touchMoved.current) {
                event.preventDefault();
                event.stopPropagation();
                touchMoved.current = false;
              }
            }}
          >
            {unfolded.size > 0 && (
              <UnfoldedCanvas circuit={circuit} unfolded={unfolded}
                restoreView={unfoldedRestore}
                onToggle={toggleUnfolded}
                onUnfoldAll={(ids) => setUnfolded(new Set(ids))}
                onFoldAll={() => setUnfolded(new Set())}
                onEnter={enterModulePath}
                snapshot={snapshot}
                onToggleSwitch={(id) => setCircuit((current) => ({ ...current,
                  nodes: current.nodes.map((item) => item.id === id ? { ...item, value: !item.value } : item),
                }))}
                showVdd={showVdd} showGround={showGround}
                onVddChange={setShowVdd} onGroundChange={setShowGround} />
            )}
            <div
              style={{
                width: canvasWidth * zoom,
                height: canvasHeight * zoom,
                position: "relative",
                overflow: "hidden",
                display: unfolded.size ? "none" : undefined,
              }}
            >
              <div
                ref={board}
                className={styles.board}
                style={{
                  backgroundPosition: `${-bounds.left}px ${-bounds.top}px`,
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
                    spaceHeld.current ||
                    (!event.shiftKey && !selectMode) ||
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
                  if (dragRef.current) endTransaction();
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
                  const moduleSource = moduleName.startsWith("saved:")
                    ? saved[moduleName.slice(6)]
                    : BLUEPRINTS[moduleName] || PRESETS[moduleName];
                  if (moduleSource) {
                    const point = boardPoint(event.clientX, event.clientY);
                    addModule(moduleSource, {
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
                      style={{ left: left - bounds.left, top: top - bounds.top, width: right - left, height: bottom - top }}
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
                    const from = circuit.nodes.find((node) => node.id === wire.from);
                    const to = circuit.nodes.find((node) => node.id === wire.to);
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
                            setSelectedWires([wire.id]);
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
                          className={styles.portRow}
                          style={{
                            ...portStyle(node, input, "input"),
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
                                ...portPoint(node, input, "input"),
                                originX: portPoint(node, input, "input").x,
                                originY: portPoint(node, input, "input").y,
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
                      <div
                        className={clsx(
                          styles.nodeBody,
                          node.type === "module" && styles.moduleBody,
                        )}
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
                      {(node.type === "module" || ["dff", "srlatch", "dlatch", "dramcell"].includes(node.type) || GATE_NAMES.includes(node.type as LogicGate)) && (
                        <div className={styles.nodeActions}>
                          <button type="button" title={`Unfold ${node.label || LABELS[node.type]} in place`}
                            aria-label={`Unfold ${node.label || LABELS[node.type]} in place`}
                            onClick={(event) => { event.stopPropagation(); toggleUnfolded(node.id); }}>▣</button>
                          {node.type === "module" && node.module && (
                            <button type="button" title={`Enter ${node.label || node.module.name}`}
                              aria-label={`Enter ${node.label || node.module.name}`}
                              onClick={(event) => { event.stopPropagation(); enterCircuit(node.module!, node.label || node.module!.name, node.id); }}>↗</button>
                          )}
                        </div>
                      )}
                      {Array.from({ length: outputCount(node) }, (_, output) => (
                        <div
                          key={`${node.id}-output-${output}`}
                          className={styles.portRow}
                          style={{
                            ...portStyle(node, output, "output"),
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
                                ...portPoint(node, output, "output"),
                                originX: portPoint(node, output, "output").x,
                                originY: portPoint(node, output, "output").y,
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
                      left: Math.min(marquee.x, marquee.endX) - bounds.left,
                      top: Math.min(marquee.y, marquee.endY) - bounds.top,
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
        {(selectedWireData.length > 0 || selected.length > 0) && <aside className={styles.inspector} aria-label="Selection controls">
          <h2>Selected wires</h2>
          {selectedWireData.length ? (
            <div className={styles.wireInspector}>
              <p>{selectedWireData.length} wire{selectedWireData.length === 1 ? "" : "s"} selected. Shift-click or Command/Ctrl-click to add or remove wires.</p>
              <span>Signal color</span>
              <div className={styles.colorSwatches}>
                {wireColorNames.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={clsx(
                      styles.colorSwatch,
                      selectedWireData.every((wire) =>
                        (wire.color ?? defaultWireColor(wire.from, circuit.nodes)) === color,
                      ) && styles.colorSelected,
                    )}
                    style={{ backgroundColor: WIRE_COLORS[color] }}
                    aria-label={`Color selected wires ${color}`}
                    title={color}
                    onClick={() =>
                      setCircuit((current) => ({
                        ...current,
                        wires: current.wires.map((wire) =>
                          selectedWires.includes(wire.id) ? { ...wire, color } : wire,
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
                    wires: current.wires.filter((wire) => !selectedWires.includes(wire.id)),
                  }));
                  setSelectedWires([]);
                }}
              >
                Cut selected wires
              </button>
            </div>
          ) : (
            <p>Click a wire to set its color. Shift-click to select more.</p>
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
                  onFocus={beginTransaction}
                  onBlur={endTransaction}
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
              {inputCount(selectedNode) > 0 && <label>
                Input side
                <select
                  aria-label="Input side"
                  value={inputSide(selectedNode)}
                  onChange={(event) => setCircuit((current) => ({
                    ...current,
                    nodes: current.nodes.map((node) => node.id === selectedNode.id
                      ? { ...node, inputSide: event.target.value as PortSide } : node),
                  }))}
                >
                  {(["left", "top", "right", "bottom"] as const).map((side) =>
                    <option key={side} value={side}>{side}</option>)}
                </select>
              </label>}
              {outputCount(selectedNode) > 0 && <label>
                Output side
                <select
                  aria-label="Output side"
                  value={outputSide(selectedNode)}
                  onChange={(event) => setCircuit((current) => ({
                    ...current,
                    nodes: current.nodes.map((node) => node.id === selectedNode.id
                      ? { ...node, outputSide: event.target.value as PortSide } : node),
                  }))}
                >
                  {(["left", "top", "right", "bottom"] as const).map((side) =>
                    <option key={side} value={side}>{side}</option>)}
                </select>
              </label>}
              {selectedNode.type === "module" && (
                <div className={styles.modulePorts}>
                  {circuitHints[selectedNode.module!.name] && (
                    <p>{circuitHints[selectedNode.module!.name]}</p>
                  )}
                  {circuit.nodes.some((node) => node.id !== selectedNode.id && outputCount(node) === 8) &&
                    ["A", "B"].some((prefix) => moduleInputs(selectedNode.module!).some((port) => port.label === `${prefix}0`)) && (
                    <div className={styles.bulkWiring}>
                      <span>Wire 8 bits at once</span>
                      <select aria-label="8-bit source" value={busSource}
                        onChange={(event) => setBusSource(event.target.value)}>
                        <option value="">Choose 8-bit source</option>
                        {circuit.nodes.filter((node) => node.id !== selectedNode.id && outputCount(node) === 8)
                          .map((node) => <option key={node.id} value={node.id}>
                            {node.label || node.module?.name || LABELS[node.type]}
                          </option>)}
                      </select>
                      {["A", "B"].map((prefix) => {
                        const ports = moduleInputs(selectedNode.module!);
                        const start = ports.findIndex((port) => port.label === `${prefix}0`);
                        if (start < 0 || !Array.from({ length: 8 }, (_, bit) =>
                          ports[start + bit]?.label === `${prefix}${bit}`).every(Boolean)) return null;
                        return <button key={prefix} type="button" disabled={!busSource}
                          onClick={() => connectEightBits(busSource, selectedNode.id, start)}>
                          Wire bits 0–7 to {prefix}0–{prefix}7
                        </button>;
                      })}
                    </div>
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
                  {(["transistor", "nand", "nor"] as const).map((family) => {
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
                <ActionIcon name="delete" /> Delete part
              </button>
            </div>
          ) : selected.length > 1 ? (
            <div className={styles.selectedPart}>
              <strong>{selected.length} parts selected</strong>
              <button type="button" onClick={() => removeNodes()}>
                <ActionIcon name="delete" /> Delete selected parts
              </button>
            </div>
          ) : (
            <p>Click a part to inspect it. Drag a rectangle to select several.</p>
          )}
        </aside>}
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
                <p>Remove {circuit.nodes.length} parts and {circuit.wires.length} wires from this canvas?</p>
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
          className={styles.contextMenu}
          style={{
            left: Math.min(menu.x, window.innerWidth - 190),
            top: Math.max(0, Math.min(menu.y, window.innerHeight - 220)),
          }}
          role="menu"
          onContextMenu={(event) => event.preventDefault()}
        >
          {menu.kind === "node" && (
            <>
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
                  setSelectedWires([]);
                  setMenu(null);
                }}
              >
                <ActionIcon name="cut" /> Cut wire
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
