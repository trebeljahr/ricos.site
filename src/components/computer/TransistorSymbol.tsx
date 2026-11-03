import type { Node, Snapshot, Wire } from "../../lib/computer/logic";
import styles from "./LogicBuilder.module.css";

/** The drawn leads end at the builder's actual G, S and D wiring targets. */
export function TransistorSymbol({
  node,
  snapshot,
  wires,
}: {
  node: Node;
  snapshot: Snapshot;
  wires: Wire[];
}) {
  const control = wires.find((wire) => wire.to === node.id && wire.input === 0);
  const high = control
    ? Boolean(
        snapshot.outputs[control.from]?.[control.output ?? 0] ?? snapshot.values[control.from],
      )
    : false;
  const on = node.type === "pmos" ? !high : high;
  const turns = ["left", "top", "right", "bottom"].indexOf(node.inputSide ?? "left");
  const type = node.type.toUpperCase();
  // The drawing turns with the part; its text moves with it but stays upright.
  const upright = (x: number, y: number) => {
    let point = { x, y };
    for (let turn = 0; turn < turns; turn++) point = { x: 132 - point.y, y: point.x };
    return point;
  };
  return (
    <svg
      className={styles.transistorSymbol}
      viewBox="0 0 132 132"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={`${type} ideal switch, ${on ? "conducting" : "open"}; gate, source and drain`}
    >
      <g transform={`rotate(${turns * 90} 66 66)`}>
        <path
          d={`M0 66 H${node.type === "pmos" ? 38 : 50} M50 42 V90 M88 0 V42 H70 M70 90 H88 V132`}
        />
        {node.type === "pmos" && <circle cx="44" cy="66" r="6" />}
        <path
          d="M70 42 V90"
          stroke={on ? "currentColor" : "#71829b"}
          strokeWidth={on ? 4 : 2.5}
          opacity={on ? 1 : 0.6}
        />
      </g>
      <g
        fill="currentColor"
        stroke="none"
        fontSize="14"
        fontFamily="ui-monospace, monospace"
        textAnchor="middle"
        dominantBaseline="central"
      >
        <text {...upright(20, 54)}>G</text>
        <text {...upright(102, 20)}>{node.type === "pmos" ? "S" : "D"}</text>
        <text {...upright(102, 112)}>{node.type === "pmos" ? "D" : "S"}</text>
        {/* A custom label takes the box's title line, as the part's own name row. */}
        <text
          {...(node.label && node.label.toUpperCase() !== type
            ? upright(110, 66)
            : upright(26, 16))}
          fontSize="10"
        >
          {type}
        </text>
        <text {...upright(26, 114)} fontSize="11">
          {on ? "ON" : "OFF"}
        </text>
      </g>
    </svg>
  );
}
