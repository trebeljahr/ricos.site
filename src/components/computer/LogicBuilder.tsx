import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Circuit,
  type GateType,
  INPUTS,
  initialSnapshot,
  LABELS,
  type Node,
  PRESETS,
  type Snapshot,
  step,
  validateCircuit,
} from "../../lib/computer/logic";
import { GateSymbol } from "./GateSymbol";
import styles from "./LogicBuilder.module.css";

const STORAGE = "ricos-computer-circuits-v1";
const WIDTH = 900;
const HEIGHT = 520;
const NODE_WIDTH = 132;
const NODE_HEIGHT = 78;
const palette: GateType[] = [
  "switch",
  "pulse",
  "clock",
  "lamp",
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
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
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
    "Click an output, then an input to draw a wire. Drag gates to move them.",
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
  const connect = (to: string, input: number) => {
    if (!pending) {
      setMessage("Choose an output first.");
      return;
    }
    if (pending === to) {
      setMessage("A gate cannot wire to itself.");
      return;
    }
    setCircuit((current) => ({
      ...current,
      wires: [
        ...current.wires.filter((wire) => !(wire.to === to && wire.input === input)),
        { id: crypto.randomUUID(), from: pending, to, input },
      ],
    }));
    setPending(null);
    setMessage("Wire connected.");
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
  const finishPointer = () => {
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
      >
        <span className={styles.partIcon}>
          <GateSymbol type={type} />
        </span>
        <span>{LABELS[type]}</span>
      </button>
    ));
  const selectedNode =
    selected.length === 1 ? circuit.nodes.find((node) => node.id === selected[0]) : undefined;
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
              onPointerCancel={finishPointer}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(event) => {
                event.preventDefault();
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
                {circuit.wires.map((wire) => {
                  const from = circuit.nodes.find((node) => node.id === wire.from);
                  const to = circuit.nodes.find((node) => node.id === wire.to);
                  if (!from || !to) return null;
                  const x1 = from.x + NODE_WIDTH,
                    y1 = from.y + NODE_HEIGHT / 2,
                    x2 = to.x,
                    y2 = portY(to, wire.input);
                  const d = `M ${x1} ${y1} C ${x1 + Math.max(45, (x2 - x1) / 2)} ${y1}, ${x2 - Math.max(45, (x2 - x1) / 2)} ${y2}, ${x2} ${y2}`;
                  return (
                    <g key={wire.id}>
                      <path
                        d={d}
                        className={styles.wireHit}
                        role="button"
                        tabIndex={0}
                        aria-label="Cut wire"
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === "Delete") {
                            setCircuit((current) => ({
                              ...current,
                              wires: current.wires.filter((item) => item.id !== wire.id),
                            }));
                          }
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
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
                        }}
                      />
                      <path
                        d={d}
                        className={clsx(styles.wire, snapshot.values[wire.from] && styles.live)}
                      />
                    </g>
                  );
                })}
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
                  style={{
                    left: `${(node.x / WIDTH) * 100}%`,
                    top: `${(node.y / HEIGHT) * 100}%`,
                    width: `${(NODE_WIDTH / WIDTH) * 100}%`,
                    height: `${(NODE_HEIGHT / HEIGHT) * 100}%`,
                  }}
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
                      style={{ top: `${((portY(node, input) - node.y) / NODE_HEIGHT) * 100}%` }}
                      onClick={() => connect(node.id, input)}
                      aria-label={`Connect to ${node.label || LABELS[node.type]} input ${input + 1}`}
                      title={
                        node.type === "dff"
                          ? input === 0
                            ? "D: data"
                            : "CLK: rising edge"
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
                      onClick={() => {
                        setPending(node.id);
                        setMessage(`Choose an input for ${node.label || LABELS[node.type]}.`);
                      }}
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
        <aside className={styles.inspector} aria-label="Circuit controls">
          <h2>Parts library</h2>
          <p>Drag from either side</p>
          <input
            className={styles.search}
            type="search"
            placeholder="Search parts"
            aria-label="Search parts in right library"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className={styles.parts}>
            {renderParts()}
            {visibleParts.length === 0 && <p>No matching parts</p>}
          </div>
          <div className={styles.divider} />
          <h2>Circuits</h2>
          <p>Ready to explore</p>
          <div className={styles.presetList}>
            {Object.values(PRESETS).map((preset) => (
              <button type="button" key={preset.name} onClick={() => load(preset)}>
                {preset.name}
                <span>↗</span>
              </button>
            ))}
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
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setCircuit((current) => ({
                  ...current,
                  wires: current.wires.filter((wire) => wire.id !== menu.id),
                }));
                setMenu(null);
              }}
            >
              Cut wire
            </button>
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
