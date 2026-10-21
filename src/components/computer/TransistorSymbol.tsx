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
  const rotation = ["left", "top", "right", "bottom"].indexOf(node.inputSide ?? "left") * 90;
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
      aria-label={`${node.type.toUpperCase()} ideal switch, ${on ? "conducting" : "open"}; gate, source and drain`}
    >
      <g transform={`rotate(${rotation} 66 66)`}>
        <path
          d={`M0 66 H${node.type === "pmos" ? 38 : 50} M50 42 V90 M88 0 V42 H70 M70 90 H88 V132`}
        />
        {node.type === "pmos" && <circle cx="44" cy="66" r="6" />}
        <path
          d="M70 42 V90"
          stroke={on ? "currentColor" : "#71829b"}
          strokeWidth={on ? 4 : 2.5}
          opacity={on ? 1 : 0.4}
        />
        <g fill="currentColor" stroke="none" fontSize="16" fontFamily="ui-monospace, monospace">
          <text x="12" y="55">
            G
          </text>
          <text x="99" y="20">
            {node.type === "pmos" ? "S" : "D"}
          </text>
          <text x="99" y="124">
            {node.type === "pmos" ? "D" : "S"}
          </text>
          <text x="90" y="69" fontSize="10">
            {node.type.toUpperCase()}
          </text>
          <text x="8" y="96" fontSize="12">
            {on ? "ON" : "OFF"}
          </text>
        </g>
      </g>
    </svg>
  );
}
