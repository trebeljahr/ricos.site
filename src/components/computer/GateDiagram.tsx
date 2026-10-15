import clsx from "clsx";
import type { TruthGate } from "src/lib/computer/gateLogic";
import styles from "./GateDemos.module.css";

// SVG pieces for the chapter-sized gate and adder diagrams. Shapes follow
// GateSymbol (the circuit editor's palette icons) in the same 64 × 42 box:
// inputs enter on the left at y 13 and 29 (y 21 for NOT), the output leaves on
// the right at y 21.

const BODY: Record<"and" | "or" | "xor" | "not", string> = {
  and: "M13 5 H30 C50 5 50 37 30 37 H13 Z",
  or: "M12 5 Q25 21 12 37 Q34 37 49 21 Q34 5 12 5 Z",
  xor: "M14 5 Q27 21 14 37 Q36 37 51 21 Q36 5 14 5 Z",
  not: "M13 5 V37 L48 21 Z",
};
const BASE: Record<TruthGate, keyof typeof BODY> = {
  and: "and",
  nand: "and",
  or: "or",
  nor: "or",
  xor: "xor",
  xnor: "xor",
  not: "not",
};
// Where the input stubs meet the body, and where the body (or its bubble) ends.
const INPUT_END: Record<keyof typeof BODY, number> = { and: 13, or: 17, xor: 13, not: 13 };
const OUTPUT_START: Record<TruthGate, number> = {
  and: 45,
  or: 49,
  xor: 51,
  not: 57,
  nand: 57,
  nor: 57,
  xnor: 57,
};

export const GATE_BOX = { width: 64, height: 42 };

/** Port positions of a gate drawn at (x, y) with `scale`, in diagram units. */
export function gatePorts(gate: TruthGate, x: number, y: number, scale = 1) {
  const at = (px: number, py: number) => ({ x: x + px * scale, y: y + py * scale });
  return {
    inputs: gate === "not" ? [at(0, 21)] : [at(0, 13), at(0, 29)],
    output: at(64, 21),
  };
}

export function GateShape({
  gate,
  x,
  y,
  scale = 1,
  inputs,
  output,
  label,
}: {
  gate: TruthGate;
  x: number;
  y: number;
  scale?: number;
  inputs: readonly boolean[];
  output: boolean;
  /** Text inside the body, e.g. "XOR". Omitted, the shape speaks for itself. */
  label?: string;
}) {
  const base = BASE[gate];
  const bubble = gate === "nand" || gate === "nor" || gate === "xnor" || gate === "not";
  const ys = gate === "not" ? [21] : [13, 29];
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {ys.map((py, index) => (
        <path
          key={py}
          d={`M0 ${py} H${INPUT_END[base]}`}
          className={clsx(styles.wire, inputs[index] && styles.wireOn)}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path
        d={`M${OUTPUT_START[gate]} 21 H64`}
        className={clsx(styles.wire, output && styles.wireOn)}
        vectorEffect="non-scaling-stroke"
      />
      {base === "xor" && (
        <path d="M8 5 Q21 21 8 37" className={styles.gateLine} vectorEffect="non-scaling-stroke" />
      )}
      <path
        d={BODY[base]}
        className={clsx(styles.gateBody, output && styles.gateBodyOn)}
        vectorEffect="non-scaling-stroke"
      />
      {bubble && (
        <circle
          cx="53"
          cy="21"
          r="4"
          className={clsx(styles.gateBody, output && styles.gateBodyOn)}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {label && (
        <text
          x={base === "not" ? 24 : base === "and" ? 28 : 30}
          y="21"
          className={styles.gateLabel}
          fontSize={base === "not" ? 8 : 9}
        >
          {label}
        </text>
      )}
    </g>
  );
}

/** A wire through `points`, lit when it carries a 1. */
export function WirePath({
  points,
  on,
  dot = [],
}: {
  points: readonly { x: number; y: number }[];
  on: boolean;
  /** Indexes of points that are junctions, drawn as a dot. */
  dot?: readonly number[];
}) {
  const d = points.map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`).join(" ");
  return (
    <>
      <path d={d} className={clsx(styles.wire, on && styles.wireOn)} />
      {dot.map((index) => (
        <circle
          key={index}
          cx={points[index].x}
          cy={points[index].y}
          r="2.6"
          className={clsx(styles.junction, on && styles.junctionOn)}
        />
      ))}
    </>
  );
}

/** A lamp at the end of a wire, with its name and value beside it. */
export function LampMark({
  x,
  y,
  on,
  name,
  side = "right",
}: {
  x: number;
  y: number;
  on: boolean;
  name: string;
  side?: "right" | "below";
}) {
  return (
    <g>
      <circle cx={x} cy={y} r="8" className={clsx(styles.lampMark, on && styles.lampMarkOn)} />
      <text
        x={side === "right" ? x + 14 : x}
        y={side === "right" ? y : y + 20}
        className={styles.portName}
        textAnchor={side === "right" ? "start" : "middle"}
      >
        {name} {on ? "1" : "0"}
      </text>
    </g>
  );
}

/** An input's name and value where its wire starts. */
export function InputMark({ x, y, on, name }: { x: number; y: number; on: boolean; name: string }) {
  return (
    <g>
      <text x={x - 6} y={y} className={styles.portName} textAnchor="end">
        {name} {on ? "1" : "0"}
      </text>
      <circle cx={x} cy={y} r="3" className={clsx(styles.junction, on && styles.junctionOn)} />
    </g>
  );
}
