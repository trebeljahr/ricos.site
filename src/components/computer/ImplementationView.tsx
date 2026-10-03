import { useMemo, useRef, useState } from "react";
import { buildImplementation } from "../../lib/computer/implementation";
import { type Circuit, LABELS } from "../../lib/computer/logic";
import styles from "./ImplementationView.module.css";

const NODE_WIDTH = 94;
const NODE_HEIGHT = 42;

export function ImplementationView({
  circuit,
  onClose,
  showVdd,
  showGround,
  onVddChange,
  onGroundChange,
}: {
  circuit: Circuit;
  onClose: () => void;
  showVdd: boolean;
  showGround: boolean;
  onVddChange: (visible: boolean) => void;
  onGroundChange: (visible: boolean) => void;
}) {
  const implementation = useMemo(() => buildImplementation(circuit), [circuit]);
  const [zoom, setZoom] = useState(0.65);
  const [selected, setSelected] = useState<string | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const nodes = useMemo(
    () => new Map(implementation.nodes.map((item) => [item.id, item])),
    [implementation],
  );
  const connected = useMemo(
    () =>
      new Set(
        implementation.wires
          .filter((wire) => wire.from === selected || wire.to === selected)
          .map((wire) => wire.id),
      ),
    [implementation, selected],
  );
  const groups = useMemo(
    () =>
      implementation.groups
        .map((group) => {
          const parts = group.nodeIds
            .map((id) => nodes.get(id))
            .filter((item) => item !== undefined);
          if (!parts.length) return null;
          const x = Math.min(...parts.map((item) => item.x)) - 18;
          const y = Math.min(...parts.map((item) => item.y)) - 32;
          return {
            ...group,
            x,
            y,
            width: Math.max(...parts.map((item) => item.x + NODE_WIDTH)) - x + 18,
            height: Math.max(...parts.map((item) => item.y + NODE_HEIGHT)) - y + 18,
          };
        })
        .filter((group) => group !== null),
    [implementation, nodes],
  );

  return (
    <section className={styles.view} aria-label="Full CMOS implementation">
      <header className={styles.toolbar}>
        <button type="button" onClick={onClose}>
          ← Circuit builder
        </button>
        <div>
          <strong>{circuit.name} · full implementation</strong>
          <span>
            {implementation.transistorCount.toLocaleString()} transistors ·{" "}
            {implementation.groups.length.toLocaleString()} labeled groups
          </span>
        </div>
        <label>
          Jump to group{" "}
          <select
            defaultValue=""
            onChange={(event) => {
              const group = groups.find((item) => item.id === event.target.value);
              if (group && scroll.current)
                scroll.current.scrollTo({
                  left: Math.max(0, group.x * zoom - 30),
                  top: Math.max(0, group.y * zoom - 30),
                  behavior: "smooth",
                });
            }}
          >
            <option value="" disabled>
              Choose a gate or block
            </option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.label} · {group.id}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.zoom}>
          Zoom{" "}
          <input
            type="range"
            min="0.3"
            max="1.25"
            step="0.05"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />{" "}
          {Math.round(zoom * 100)}%
        </label>
        <label>
          <input
            type="checkbox"
            checked={showVdd}
            onChange={(event) => onVddChange(event.target.checked)}
          />{" "}
          VDD
        </label>
        <label>
          <input
            type="checkbox"
            checked={showGround}
            onChange={(event) => onGroundChange(event.target.checked)}
          />{" "}
          GND
        </label>
      </header>
      <p className={styles.note}>
        Standard static CMOS gates; positive-edge flip-flops use two NAND latches. Colored lines
        show all signal and power connections. Click a part to trace its wires. This is a read-only
        schematic; the builder remains the simulation.
      </p>
      <div className={styles.scroll} ref={scroll}>
        <svg
          width={implementation.width * zoom}
          height={implementation.height * zoom}
          viewBox={`0 0 ${implementation.width} ${implementation.height}`}
          role="img"
          aria-label={`Expanded transistor wiring for ${circuit.name}`}
        >
          <g className={styles.groups}>
            {groups.map((group) => (
              <g key={group.id}>
                <rect x={group.x} y={group.y} width={group.width} height={group.height} rx="12" />
                <text x={group.x + 12} y={group.y + 20}>
                  {group.label}
                </text>
              </g>
            ))}
          </g>
          <g className={styles.wires}>
            {implementation.wires.map((wire) => {
              const from = nodes.get(wire.from);
              const to = nodes.get(wire.to);
              if (!from || !to) return null;
              if (
                (!showVdd && (from.type === "high" || to.type === "high")) ||
                (!showGround && (from.type === "ground" || to.type === "ground"))
              )
                return null;
              const x1 = from.x + NODE_WIDTH;
              const y1 = from.y + NODE_HEIGHT / 2;
              const x2 = to.x;
              const y2 = to.y + 11 + wire.input * 20;
              const delta = Math.max(30, Math.abs(x2 - x1) * 0.35);
              const selectedWire = selected !== null && connected.has(wire.id);
              return (
                <path
                  key={wire.id}
                  className={
                    selected === null ? undefined : selectedWire ? styles.highlight : styles.dim
                  }
                  d={`M ${x1} ${y1} C ${x1 + delta} ${y1}, ${x2 - delta} ${y2}, ${x2} ${y2}`}
                  stroke={
                    from.type === "high"
                      ? "#ffc76a"
                      : from.type === "ground"
                        ? "#7cb8ff"
                        : "#69e2e0"
                  }
                >
                  <title>
                    {from.label || from.id} → {to.label || to.id}
                  </title>
                </path>
              );
            })}
          </g>
          <g className={styles.nodes}>
            {implementation.nodes
              .filter(
                (node) =>
                  (showVdd || node.type !== "high") && (showGround || node.type !== "ground"),
              )
              .map((node) => (
              <g
                key={node.id}
                role="button"
                  tabIndex={0}
                  aria-label={`Trace wires for ${node.label || LABELS[node.type]}`}
                  className={selected === node.id ? styles.selected : undefined}
                  transform={`translate(${node.x},${node.y})`}
                  onClick={() => setSelected(selected === node.id ? null : node.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelected(selected === node.id ? null : node.id);
                    }
                  }}
                >
                  <title>
                    {node.label || LABELS[node.type]} · {node.id}
                  </title>
                  <rect
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    rx="5"
                    fill={
                      node.type === "pmos"
                        ? "#3f3559"
                        : node.type === "nmos"
                          ? "#23464a"
                          : node.type === "high"
                            ? "#59462d"
                            : node.type === "ground"
                              ? "#2b405b"
                              : "#29384d"
                    }
                  />
                  <text x={NODE_WIDTH / 2} y={17}>
                    {node.label && !["pmos", "nmos", "junction"].includes(node.type)
                      ? node.label.slice(0, 15)
                      : LABELS[node.type]}
                  </text>
                  <text className={styles.id} x={NODE_WIDTH / 2} y={32}>
                    {node.id.split("/").at(-1)}
                  </text>
                </g>
              ))}
          </g>
        </svg>
      </div>
    </section>
  );
}
