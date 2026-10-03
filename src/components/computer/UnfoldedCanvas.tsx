import { useMemo, useRef, useState } from "react";
import { buildImplementation, collectUnfoldableIds } from "../../lib/computer/implementation";
import { type Circuit, LABELS, type Snapshot } from "../../lib/computer/logic";
import styles from "./UnfoldedCanvas.module.css";

const NODE_WIDTH = 140;
const NODE_HEIGHT = 64;

type Props = {
  circuit: Circuit;
  unfolded: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onUnfoldAll: (ids: string[]) => void;
  onFoldAll: () => void;
  onEnter: (path: string) => void;
  snapshot: Snapshot;
  onToggleSwitch: (id: string) => void;
  showVdd: boolean;
  showGround: boolean;
  onVddChange: (visible: boolean) => void;
  onGroundChange: (visible: boolean) => void;
};

export function UnfoldedCanvas({
  circuit,
  unfolded,
  onToggle,
  onUnfoldAll,
  onFoldAll,
  onEnter,
  snapshot,
  onToggleSwitch,
  showVdd,
  showGround,
  onVddChange,
  onGroundChange,
}: Props) {
  const diagram = useMemo(() => buildImplementation(circuit, unfolded), [circuit, unfolded]);
  const [zoom, setZoom] = useState(0.45);
  const [selected, setSelected] = useState<string | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const nodes = useMemo(() => new Map(diagram.nodes.map((node) => [node.id, node])), [diagram]);
  const boxes = useMemo(() => new Map(diagram.boxes.map((box) => [box.id, box])), [diagram]);
  const groups = useMemo(
    () =>
      diagram.groups
        .map((group) => {
          const parts = group.nodeIds
            .map((id) => nodes.get(id))
            .filter((node) => node !== undefined);
          if (!parts.length) return null;
          const x = Math.min(...parts.map((node) => node.x)) - 18;
          const y = Math.min(...parts.map((node) => node.y)) - 36;
          return {
            ...group,
            x,
            y,
            width: Math.max(...parts.map((node) => node.x + NODE_WIDTH)) - x + 18,
            height: Math.max(...parts.map((node) => node.y + NODE_HEIGHT)) - y + 18,
          };
        })
        .filter((group) => group !== null),
    [diagram, nodes],
  );
  const connected = useMemo(
    () =>
      new Set(
        diagram.wires
          .filter((wire) => wire.from === selected || wire.to === selected)
          .map((wire) => wire.id),
      ),
    [diagram, selected],
  );

  return (
    <section className={styles.view} aria-label="Unfolded circuit canvas">
      <div className={styles.toolbar}>
        <strong>{circuit.name}</strong>
        <button type="button" onClick={() => onUnfoldAll(collectUnfoldableIds(circuit))}>
          Unfold all
        </button>
        <button type="button" onClick={onFoldAll}>
          Fold all
        </button>
        <span>
          {diagram.boxes.filter((box) => box.expanded).length} boxes unfolded ·{" "}
          {diagram.transistorCount.toLocaleString()} transistors visible
        </span>
        <small>Unfold to inspect; enter a box to edit its wiring.</small>
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
              Choose a block
            </option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.label} · {group.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          Zoom{" "}
          <input
            type="range"
            min="0.2"
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
      </div>
      <div className={styles.scroll} ref={scroll}>
        <svg
          width={diagram.width * zoom}
          height={diagram.height * zoom}
          viewBox={`0 0 ${diagram.width} ${diagram.height}`}
          role="img"
          aria-label={`Circuit with ${unfolded.size} unfolded boxes`}
        >
          <g className={styles.groups}>
            {groups.map((group) => {
              const id = group.id.endsWith("/group") ? group.id.slice(0, -6) : "";
              return (
                <g key={group.id}>
                  <rect x={group.x} y={group.y} width={group.width} height={group.height} rx="12" />
                  <text x={group.x + 12} y={group.y + 22}>
                    {group.label}
                  </text>
                  {id && boxes.has(id) && (
                    <text
                      className={styles.action}
                      x={group.x + group.width - 65}
                      y={group.y + 22}
                      role="button"
                      tabIndex={0}
                      aria-label={`Fold ${boxes.get(id)!.label}`}
                      onClick={() => onToggle(id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onToggle(id);
                        }
                      }}
                    >
                      − Fold
                    </text>
                  )}
                  {id && boxes.get(id)?.type === "module" && (
                    <text
                      className={styles.action}
                      x={group.x + group.width - 145}
                      y={group.y + 22}
                      role="button"
                      tabIndex={0}
                      aria-label={`Enter ${boxes.get(id)!.label}`}
                      onClick={() => onEnter(id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onEnter(id);
                        }
                      }}
                    >
                      ↗ Enter
                    </text>
                  )}
                </g>
              );
            })}
          </g>
          <g className={styles.wires}>
            {diagram.wires.map((wire) => {
              const from = nodes.get(wire.from);
              const to = nodes.get(wire.to);
              if (!from || !to) return null;
              if (
                (!showVdd && (from.type === "high" || to.type === "high")) ||
                (!showGround && (from.type === "ground" || to.type === "ground"))
              )
                return null;
              const x1 = from.x + NODE_WIDTH;
              const y1 = from.y + NODE_HEIGHT / 2 + (wire.output ?? 0) * 5;
              const x2 = to.x;
              const y2 = to.y + 15 + wire.input * 11;
              const delta = Math.max(30, Math.abs(x2 - x1) * 0.35);
              return (
                <path
                  key={wire.id}
                  className={
                    selected === null
                      ? undefined
                      : connected.has(wire.id)
                        ? styles.highlight
                        : styles.dim
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
            {diagram.nodes
              .filter(
                (node) =>
                  (showVdd || node.type !== "high") && (showGround || node.type !== "ground"),
              )
              .map((node) => {
                const box = boxes.get(node.id);
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x},${node.y})`}
                    className={selected === node.id ? styles.selected : undefined}
                  >
                    <title>
                      {node.label || LABELS[node.type]} · {node.id}
                    </title>
                    <rect
                      width={NODE_WIDTH}
                      height={NODE_HEIGHT}
                      rx="6"
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
                      onClick={() => setSelected(selected === node.id ? null : node.id)}
                    />
                    <text x={NODE_WIDTH / 2} y={20}>
                      {node.schematicKind === "capacitor"
                        ? "CAPACITOR"
                        : node.schematicKind === "floating-gate"
                          ? "FLOATING GATE MOS"
                          : node.label && !["pmos", "nmos", "junction"].includes(node.type)
                            ? node.label.slice(0, 19)
                            : LABELS[node.type]}
                    </text>
                    {box ? (
                      <>
                        <text
                          className={styles.action}
                          x={box.type === "module" ? 40 : NODE_WIDTH / 2}
                          y={47}
                          role="button"
                          tabIndex={0}
                          aria-label={`Unfold ${box.label}`}
                          onClick={() => onToggle(box.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onToggle(box.id);
                            }
                          }}
                        >
                          + Unfold
                        </text>
                        {box.type === "module" && (
                          <text
                            className={styles.action}
                            x={110}
                            y={47}
                            role="button"
                            tabIndex={0}
                            aria-label={`Enter ${box.label}`}
                            onClick={() => onEnter(box.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                onEnter(box.id);
                              }
                            }}
                          >
                            ↗ Enter
                          </text>
                        )}
                      </>
                    ) : node.type === "switch" && !node.id.includes("/") ? (
                      <text
                        className={styles.action}
                        x={NODE_WIDTH / 2}
                        y={47}
                        role="button"
                        tabIndex={0}
                        aria-label={`Toggle ${node.label || node.id}`}
                        onClick={() => onToggleSwitch(node.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onToggleSwitch(node.id);
                          }
                        }}
                      >
                        {snapshot.values[node.id] ? "ON · toggle" : "OFF · toggle"}
                      </text>
                    ) : (
                      <text className={styles.id} x={NODE_WIDTH / 2} y={47}>
                        {node.id.split("/").at(-1)}
                      </text>
                    )}
                  </g>
                );
              })}
          </g>
        </svg>
      </div>
    </section>
  );
}
