import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { simpleWirePath, wirePath } from "../../lib/computer/wireRouting";
import { GateSymbol } from "./GateSymbol";
import styles from "./LogicBuilder.module.css";

const STORAGE = "ricos-computer-circuits-v1";
const WIDTH = 900;
const HEIGHT = 520;
const NODE_WIDTH = 132;
const NODE_HEIGHT = 78;
const wireColorNames = Object.keys(WIRE_COLORS) as WireColor[];
const partColors: Record<GateType, string> = {
  switch: "#ffc76a",
  pulse: "#ff8f87",
  clock: "#b7a1ff",
  lamp: "#b9e976",
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
const defaultWireColor = (id: string): WireColor =>
  wireColorNames[
    [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % wireColorNames.length
  ];
const palette: GateType[] = [
  "switch",
  "pulse",
  "clock",
  "lamp",
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
];
const clone = (circuit: Circuit): Circuit => JSON.parse(JSON.stringify(circuit));
type ViewLevel = { parent: Circuit; via: string; moduleId?: string };
const withUpdatedModule = (parent: Circuit, moduleId: string, inner: Circuit): Circuit => ({
  ...parent,
  nodes: parent.nodes.map((item) =>
    item.id === moduleId ? { ...item, module: clone(inner) } : item,
  ),
});
const nodeHeight = (node: Node) =>
  node.type === "module"
    ? Math.max(NODE_HEIGHT, 30 + Math.max(inputCount(node), outputCount(node)) * 25)
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
  const [tidyWiring, setTidyWiring] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [circuitSearch, setCircuitSearch] = useState("");
  const [circuitFamily, setCircuitFamily] = useState<BlueprintFamily | "examples">("transistor");
  const [showVdd, setShowVdd] = useState(true);
  const [showGround, setShowGround] = useState(true);
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
  const canvasWidth = Math.max(WIDTH, ...circuit.nodes.map((item) => item.x + NODE_WIDTH + 50));
  const canvasHeight = Math.max(HEIGHT, ...circuit.nodes.map((item) => item.y + NODE_HEIGHT + 50));
  const [drag, setDrag] = useState<{
    x: number;
    y: number;
    starts: Record<string, { x: number; y: number }>;
  } | null>(null);
  const board = useRef<HTMLDivElement>(null);
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
    setViewPath((current) => [...current, { parent: clone(circuit), via, moduleId }]);
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
    setSelected([]);
    setSelectedWire(null);
    setPending(null);
    resetRuntime();
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
    setSelected(level.moduleId ? [level.moduleId] : []);
    setSelectedWire(null);
    setPending(null);
    resetRuntime();
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
      label: LABELS[type],
      value: false,
    };
    setCircuit((current) => ({ ...current, nodes: [...current.nodes, next] }));
    setSelected([next.id]);
    setPending(null);
  };
  const addModule = (source: Circuit, position?: { x: number; y: number }) => {
    if (
      !moduleOutputs(source).length ||
      moduleInputs(source).length > 8 ||
      moduleOutputs(source).length > 8
    ) {
      setMessage("This circuit needs 1–8 outputs and at most 8 inputs to become a black box.");
      return;
    }
    const index = circuit.nodes.length;
    const next: Node = {
      id: crypto.randomUUID(),
      type: "module",
      module: clone(source),
      label: source.name,
      x: Math.max(0, Math.min(canvasWidth - NODE_WIDTH, position?.x ?? 110 + (index % 5) * 155)),
      y: 0,
    };
    next.y = Math.max(
      0,
      Math.min(
        canvasHeight - nodeHeight(next),
        position?.y ?? 90 + (Math.floor(index / 5) % 5) * 90,
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
      circuit.wires.find((wire) => wire.from === from)?.color ?? defaultWireColor(from);
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
    if (event.button !== 0) return;
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
          const distance = Math.hypot(point.x - node.x - NODE_WIDTH, point.y - outY(node, output));
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
      Math.min(canvasWidth - NODE_WIDTH - Math.max(...starts.map((p) => p.x)), dx),
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
              node.x + NODE_WIDTH > left &&
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
  const library =
    circuitFamily === "examples"
      ? PRESETS
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
    ? { x: draftStart.x + NODE_WIDTH, y: outY(draftStart, wireDraft!.output ?? 0) }
    : draftTarget && wireDraft?.to
      ? {
          x: circuit.nodes.find((node) => node.id === draftTarget.id)!.x + NODE_WIDTH,
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
  return (
    <div className={styles.shell}>
      <div className={styles.toolbar}>
        <div className={styles.identity}>
          <span className={styles.eyebrow}>DIGITAL LOGIC LAB</span>
          <strong>{circuit.name}</strong>
        </div>
        <div className={styles.transport}>
          {hasTransistors && (
            <div className={styles.powerView} aria-label="Power connection display (visual only)">
              <label><input type="checkbox" checked={showVdd} onChange={(event) => setShowVdd(event.target.checked)} /> Show VDD</label>
              <label><input type="checkbox" checked={showGround} onChange={(event) => setShowGround(event.target.checked)} /> Show GND</label>
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
            aria-pressed={tidyWiring}
            onClick={() => setTidyWiring((value) => !value)}
          >
            {tidyWiring ? "Simple wiring" : "Clean up wiring"}
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
            {visibleParts.length === 0 && <p>No matching parts</p>}
          </div>
          <div className={styles.sidebarFoot}>
            Wire output → input
            <br />
            One wire per input
            <br />
            Unwired inputs read 0
          </div>
        </aside>
        <div className={styles.workspace}>
          <div className={styles.boardScroll}>
            <div
              ref={board}
              className={styles.board}
              style={{ width: canvasWidth, height: canvasHeight }}
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
                    x: point.x - NODE_WIDTH / 2,
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
                const right = Math.max(...parts.map((item) => item.x + NODE_WIDTH)) + 20;
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
                {circuit.wires.map((wire, index) => {
                  const from = circuit.nodes.find((node) => node.id === wire.from);
                  const to = circuit.nodes.find((node) => node.id === wire.to);
                  if (!from || !to) return null;
                  if (hasTransistors && (!powerVisible(from) || !powerVisible(to))) return null;
                  const x1 = from.x + NODE_WIDTH,
                    y1 = outY(from, wire.output ?? 0),
                    x2 = to.x,
                    y2 = portY(to, wire.input);
                  const d = tidyWiring
                    ? wirePath(
                        { x: x1, y: y1 },
                        { x: x2, y: y2 },
                        circuit.nodes
                          .filter((node) => node.id !== from.id && node.id !== to.id)
                          .map((node) => ({
                            x: node.x,
                            y: node.y,
                            width: NODE_WIDTH,
                            height: nodeHeight(node),
                          })),
                        ((index % 5) - 2) * 10,
                      )
                    : simpleWirePath({ x: x1, y: y1 }, { x: x2, y: y2 });
                  const color = WIRE_COLORS[wire.color ?? defaultWireColor(wire.from)];
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
                      tidyWiring
                        ? wirePath(previewStart, previewEnd)
                        : simpleWirePath(previewStart, previewEnd)
                    }
                    className={styles.wirePreview}
                    style={
                      {
                        "--wire-color":
                          WIRE_COLORS[
                            wireDraft.from
                              ? defaultWireColor(wireDraft.from)
                              : draftTarget
                                ? defaultWireColor(draftTarget.id)
                                : "cyan"
                          ],
                      } as React.CSSProperties
                    }
                  />
                )}
              </svg>
              {circuit.nodes.filter((node) => !hasTransistors || powerVisible(node)).map((node) => (
                <div
                  key={node.id}
                  role="group"
                  aria-label={`${node.label || LABELS[node.type]} part`}
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
                  )}
                  style={
                    {
                      "--part-accent": partColors[node.type],
                      left: `${(node.x / canvasWidth) * 100}%`,
                      top: `${(node.y / canvasHeight) * 100}%`,
                      width: `${(NODE_WIDTH / canvasWidth) * 100}%`,
                      height: `${(nodeHeight(node) / canvasHeight) * 100}%`,
                    } as React.CSSProperties
                  }
                  onPointerDown={(event) => {
                    if (event.button !== 0 || (event.target as HTMLElement).closest("button"))
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
                  onClick={(event) => event.stopPropagation()}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    if (node.type === "module" && node.module)
                      enterCircuit(node.module, node.label || node.module.name, node.id);
                  }}
                >
                  {Array.from({ length: inputCount(node) }, (_, input) => (
                    <button
                      type="button"
                      key={`${node.id}-input-${input}`}
                      className={styles.input}
                      data-node-id={node.id}
                      data-input={input}
                      style={{
                        top: `${((portY(node, input) - node.y) / nodeHeight(node)) * 100}%`,
                      }}
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
                  ))}
                  <div className={styles.nodeBody}>
                    <span className={styles.nodeSymbol}>
                      <GateSymbol type={node.type} />
                    </span>
                    <strong>{node.label || LABELS[node.type]}</strong>
                    {node.type === "switch" ? (
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
                        {moduleOutputs(node.module!)
                          .map(
                            (port, index) =>
                              `${port.label || `OUT ${index + 1}`}:${snapshot.outputs[node.id]?.[index] ? 1 : 0}`,
                          )
                          .join("  ")}
                      </span>
                    ) : (
                      <span className={styles.bit}>{snapshot.values[node.id] ? "1" : "0"}</span>
                    )}
                  </div>
                  {Array.from({ length: outputCount(node) }, (_, output) => (
                    <button
                      type="button"
                      key={`${node.id}-output-${output}`}
                      className={clsx(
                        styles.output,
                        pending?.from === node.id && pending.output === output && styles.pending,
                      )}
                      style={{
                        top: `${((outY(node, output) - node.y) / nodeHeight(node)) * 100}%`,
                      }}
                      onPointerDown={(event) =>
                        startWire(event, {
                          from: node.id,
                          output,
                          x: node.x + NODE_WIDTH,
                          y: outY(node, output),
                          originX: node.x + NODE_WIDTH,
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
            Click to open a blueprint. Drag to add the full circuit. Gate blueprints also have black
            box parts.
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
          </div>
          <p className={styles.libraryNote}>
            {circuitFamily === "examples"
              ? "Open a larger example circuit to explore its wiring."
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
                {circuitFamily !== "examples" && (
                  <span className={styles.recipe}>
                    {
                      BLUEPRINT_RECIPES[circuitFamily][
                        preset.name.split(" ")[0].toLowerCase() as LogicGate
                      ]
                    }
                  </span>
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
                      (selectedWireData.color ?? defaultWireColor(selectedWireData.from)) ===
                        color && styles.colorSelected,
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
              <strong>{LABELS[selectedNode.type]}</strong>
              <label>
                Name
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
