import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Circuit,
  BLUEPRINTS,
  BLUEPRINT_FAMILIES,
  BLUEPRINT_RECIPES,
  type BlueprintFamily,
  GATE_NAMES,
  type LogicGate,
  type GateType,
  INPUTS,
  initialSnapshot,
  LABELS,
  type Node,
  PRESETS,
  type Snapshot,
  step,
  validateCircuit,
  WIRE_COLORS,
  type WireColor,
} from "../../lib/computer/logic";
import { wirePath } from "../../lib/computer/wireRouting";
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
  nmos: "#69e2e0",
  pmos: "#b7a1ff",
  junction: "#7cb8ff",
  not: "#7cb8ff",
  and: "#69e2e0",
  or: "#69e2e0",
  xor: "#b7a1ff",
  nand: "#ff8f87",
  nor: "#ff8f87",
  dff: "#b9e976",
};
type WireDraft = {
  from?: string;
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
  "nmos",
  "pmos",
  "junction",
  "not",
  "and",
  "or",
  "xor",
  "nand",
  "nor",
  "dff",
];
const clone = (circuit: Circuit): Circuit => JSON.parse(JSON.stringify(circuit));
const portY = (node: Node, input: number) =>
  node.y + (INPUTS[node.type] === 2 ? (input === 0 ? 24 : 54) : NODE_HEIGHT / 2);

export function LogicBuilder() {
  const [circuit, setCircuit] = useState<Circuit>(() => clone(PRESETS["Half adder"]));
  const [snapshot, setSnapshot] = useState<Snapshot>(initialSnapshot);
  const [clockHigh, setClockHigh] = useState(false);
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);
  const [rate, setRate] = useState(2);
  const [pending, setPending] = useState<string | null>(null);
  const [wireDraft, setWireDraft] = useState<WireDraft | null>(null);
  const [selectedWire, setSelectedWire] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [circuitSearch, setCircuitSearch] = useState("");
  const [circuitFamily, setCircuitFamily] = useState<BlueprintFamily | "examples">("transistor");
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
      localStorage.setItem(STORAGE, JSON.stringify({ current: circuit, saved }));
    } catch {
      setMessage("Browser storage is full. Export this circuit to keep it.");
    }
  }, [circuit, saved, ready]);

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
  const addNode = (type: GateType, position?: { x: number; y: number }) => {
    const index = circuit.nodes.length;
    const next: Node = {
      id: crypto.randomUUID(),
      type,
      x: Math.max(0, Math.min(WIDTH - NODE_WIDTH, position?.x ?? 110 + (index % 5) * 155)),
      y: Math.max(
        0,
        Math.min(HEIGHT - NODE_HEIGHT, position?.y ?? 90 + (Math.floor(index / 5) % 5) * 90),
      ),
      label: LABELS[type],
      value: false,
    };
    setCircuit((current) => ({ ...current, nodes: [...current.nodes, next] }));
    setSelected([next.id]);
    setPending(null);
  };
  const insertCircuit = (source: Circuit, position: { x: number; y: number }) => {
    const minX = Math.min(...source.nodes.map((node) => node.x));
    const minY = Math.min(...source.nodes.map((node) => node.y));
    const width = Math.max(...source.nodes.map((node) => node.x)) - minX + NODE_WIDTH;
    const height = Math.max(...source.nodes.map((node) => node.y)) - minY + NODE_HEIGHT;
    const left = Math.max(0, Math.min(WIDTH - width, position.x - width / 2));
    const top = Math.max(0, Math.min(HEIGHT - height, position.y - height / 2));
    const ids = new Map(source.nodes.map((node) => [node.id, crypto.randomUUID()]));
    setCircuit((current) => ({
      ...current,
      nodes: [...current.nodes, ...source.nodes.map((node) => ({
        ...node, id: ids.get(node.id)!, x: left + node.x - minX, y: top + node.y - minY,
      }))],
      wires: [...current.wires, ...source.wires.map((wire) => ({
        ...wire, id: crypto.randomUUID(), from: ids.get(wire.from)!, to: ids.get(wire.to)!,
      }))],
    }));
    setSelected([...ids.values()]);
    setMessage(`${source.name} added. Drag the selected circuit to move it.`);
  };
  const connect = (from: string | null, to: string, input: number) => {
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
        { id: crypto.randomUUID(), from, to, input, color: sourceColor },
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
    let best: { id: string; input?: number; distance: number } | null = null;
    for (const node of circuitRef.current.nodes) {
      if (draft.from && node.id !== draft.from) {
        for (let input = 0; input < INPUTS[node.type]; input++) {
          const distance = Math.hypot(point.x - node.x, point.y - portY(node, input));
          if (distance < 20 && (!best || distance < best.distance))
            best = { id: node.id, input, distance };
        }
      }
      if (draft.to && node.id !== draft.to && node.type !== "lamp") {
        const distance = Math.hypot(
          point.x - node.x - NODE_WIDTH,
          point.y - node.y - NODE_HEIGHT / 2,
        );
        if (distance < 20 && (!best || distance < best.distance)) best = { id: node.id, distance };
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
      x: ((clientX - rect.left) * WIDTH) / rect.width,
      y: ((clientY - rect.top) * HEIGHT) / rect.height,
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
    const dx = ((event.clientX - active.x) * WIDTH) / rect.width;
    const dy = ((event.clientY - active.y) * HEIGHT) / rect.height;
    const starts = Object.values(active.starts);
    const boundedX = Math.max(
      -Math.min(...starts.map((p) => p.x)),
      Math.min(WIDTH - NODE_WIDTH - Math.max(...starts.map((p) => p.x)), dx),
    );
    const boundedY = Math.max(
      -Math.min(...starts.map((p) => p.y)),
      Math.min(HEIGHT - NODE_HEIGHT - Math.max(...starts.map((p) => p.y)), dy),
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
        connect(draft.from, connector.id, connector.input);
      else if (draft.to && connector) connect(connector.id, draft.to, draft.input!);
      else if (!moved && draft.from) {
        setPending(draft.from);
        setMessage("Drag to an input, or click one to connect.");
      } else if (!moved && draft.to) connect(pending, draft.to, draft.input!);
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
              node.y + NODE_HEIGHT > top,
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
  const library = circuitFamily === "examples" ? PRESETS : Object.fromEntries(
    Object.entries(BLUEPRINTS).filter(([name]) =>
      name.endsWith(`from ${BLUEPRINT_FAMILIES[circuitFamily].suffix}`),
    ),
  );
  const visibleCircuits = Object.values(library).filter((item) =>
    item.name.toLowerCase().includes(circuitSearch.toLowerCase().trim()),
  );
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
    ? { x: draftStart.x + NODE_WIDTH, y: draftStart.y + NODE_HEIGHT / 2 }
    : draftTarget && wireDraft?.to
      ? {
          x: circuit.nodes.find((node) => node.id === draftTarget.id)!.x + NODE_WIDTH,
          y: circuit.nodes.find((node) => node.id === draftTarget.id)!.y + NODE_HEIGHT / 2,
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
                  insertCircuit(BLUEPRINTS[blueprint] || PRESETS[blueprint], boardPoint(event.clientX, event.clientY));
                  return;
                }
                const blackBox = event.dataTransfer.getData("application/x-logic-black-box") as LogicGate;
                if (GATE_NAMES.includes(blackBox)) {
                  const point = boardPoint(event.clientX, event.clientY);
                  addNode(blackBox, { x: point.x - NODE_WIDTH / 2, y: point.y - NODE_HEIGHT / 2 });
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
              <svg
                className={styles.wires}
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                preserveAspectRatio="none"
                aria-label="Circuit wires"
              >
                {circuit.wires.map((wire, index) => {
                  const from = circuit.nodes.find((node) => node.id === wire.from);
                  const to = circuit.nodes.find((node) => node.id === wire.to);
                  if (!from || !to) return null;
                  const x1 = from.x + NODE_WIDTH,
                    y1 = from.y + NODE_HEIGHT / 2,
                    x2 = to.x,
                    y2 = portY(to, wire.input);
                  const d = wirePath(
                    { x: x1, y: y1 },
                    { x: x2, y: y2 },
                    circuit.nodes
                      .filter((node) => node.id !== from.id && node.id !== to.id)
                      .map((node) => ({
                        x: node.x,
                        y: node.y,
                        width: NODE_WIDTH,
                        height: NODE_HEIGHT,
                      })),
                    ((index % 5) - 2) * 10,
                  );
                  const color = WIRE_COLORS[wire.color ?? defaultWireColor(wire.from)];
                  return (
                    <g key={wire.id} style={{ "--wire-color": color } as React.CSSProperties}>
                      <path
                        d={d}
                        className={styles.wireHit}
                        role="button"
                        tabIndex={0}
                        aria-label={`Select wire from ${from.label || LABELS[from.type]} to ${to.label || LABELS[to.type]}`}
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
                          snapshot.values[wire.from] && styles.live,
                          selectedWire === wire.id && styles.wireSelected,
                        )}
                      />
                    </g>
                  );
                })}
                {previewStart && previewEnd && wireDraft && (
                  <path
                    d={wirePath(previewStart, previewEnd)}
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
              {circuit.nodes.map((node) => (
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
                      left: `${(node.x / WIDTH) * 100}%`,
                      top: `${(node.y / HEIGHT) * 100}%`,
                      width: `${(NODE_WIDTH / WIDTH) * 100}%`,
                      height: `${(NODE_HEIGHT / HEIGHT) * 100}%`,
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
                >
                  {Array.from({ length: INPUTS[node.type] }, (_, input) => (
                    <button
                      type="button"
                      key={`${node.id}-input-${input}`}
                      className={styles.input}
                      data-node-id={node.id}
                      data-input={input}
                      style={{ top: `${((portY(node, input) - node.y) / NODE_HEIGHT) * 100}%` }}
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
                        if (event.detail === 0) connect(pending, node.id, input);
                      }}
                      data-wire-target={Boolean(
                        wireDraft?.from &&
                          draftTarget?.id === node.id &&
                          draftTarget.input === input,
                      )}
                      aria-label={`Connect to ${node.label || LABELS[node.type]} input ${input + 1}`}
                      title={
                        node.type === "dff"
                          ? input === 0
                            ? "D: data"
                            : "CLK: rising edge"
                          : node.type === "nmos" || node.type === "pmos"
                            ? input === 0 ? "Gate control" : "Source signal"
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
                    ) : (
                      <span className={styles.bit}>{snapshot.values[node.id] ? "1" : "0"}</span>
                    )}
                  </div>
                  {node.type !== "lamp" && (
                    <button
                      type="button"
                      className={clsx(styles.output, pending === node.id && styles.pending)}
                      onPointerDown={(event) =>
                        startWire(event, {
                          from: node.id,
                          x: node.x + NODE_WIDTH,
                          y: node.y + NODE_HEIGHT / 2,
                          originX: node.x + NODE_WIDTH,
                          originY: node.y + NODE_HEIGHT / 2,
                        })
                      }
                      onClick={(event) => {
                        if (event.detail !== 0) return;
                        setPending(node.id);
                        setMessage(`Choose an input for ${node.label || LABELS[node.type]}.`);
                      }}
                      data-wire-target={Boolean(wireDraft?.to && draftTarget?.id === node.id)}
                      aria-label={`Wire from ${node.label || LABELS[node.type]} output`}
                      title="Output"
                    />
                  )}
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
          <p>Click to open a blueprint. Drag to add the full circuit. Gate blueprints also have black box parts.</p>
          <div className={styles.familyTabs} role="group" aria-label="Circuit construction">
            {(Object.keys(BLUEPRINT_FAMILIES) as BlueprintFamily[]).map((family) => (
              <button key={family} type="button" aria-pressed={circuitFamily === family} onClick={() => setCircuitFamily(family)}>{BLUEPRINT_FAMILIES[family].label}</button>
            ))}
            <button type="button" aria-pressed={circuitFamily === "examples"} onClick={() => setCircuitFamily("examples")}>Examples</button>
          </div>
          <p className={styles.libraryNote}>{circuitFamily === "examples" ? "Open a larger example circuit to explore its wiring." : BLUEPRINT_FAMILIES[circuitFamily].note}</p>
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
                <button type="button" draggable onDragStart={(event) => {
                  event.dataTransfer.setData("application/x-logic-circuit", preset.name);
                  event.dataTransfer.effectAllowed = "copy";
                }} onClick={() => load(preset)} title={`Open ${preset.name} blueprint`}>
                  {preset.name}<span>↗</span>
                </button>
                {circuitFamily !== "examples" && <span className={styles.recipe}>{BLUEPRINT_RECIPES[circuitFamily][preset.name.split(" ")[0].toLowerCase() as LogicGate]}</span>}
                {circuitFamily !== "examples" && (
                  <button type="button" className={styles.blackBox} draggable onDragStart={(event) => {
                    event.dataTransfer.setData("application/x-logic-black-box", preset.name.split(" ")[0].toLowerCase());
                    event.dataTransfer.effectAllowed = "copy";
                  }} onClick={() => addNode(preset.name.split(" ")[0].toLowerCase() as LogicGate)} title="Add this gate as a black box">▣ Black box</button>
                )}
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
                {circuit.nodes.find((node) => node.id === selectedWireData.from)?.label || "Output"}{" "}
                → {circuit.nodes.find((node) => node.id === selectedWireData.to)?.label || "Input"}
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
