import { type KeyboardEvent, type PointerEvent, useMemo, useRef, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import {
  determinant2,
  type Mat,
  radians,
  rotate2,
  scale2,
  shear2,
  transform,
  translate2,
} from "src/lib/computer/graphics/matrix";
import styles from "./Graphics.module.css";
import { Bay, Choice, fixed, GraphicsPanel, MatrixGrid, VectorColumn } from "./GraphicsParts";
import {
  TransformChain,
  type TransformKind,
  TransformProgress,
  TransformStackEditor,
  useTransformStack,
} from "./TransformStack";

const degrees = (value: number) => `${Math.round(value)}°`;

const KINDS: readonly TransformKind[] = [
  {
    name: "SCALE",
    label: "SCALE",
    parameters: [
      { key: "x", label: "X", min: -2, max: 2, step: 0.05, start: 1.5, rest: 1 },
      { key: "y", label: "Y", min: -2, max: 2, step: 0.05, start: 1.5, rest: 1 },
    ],
    matrix: ({ x, y }) => scale2(x, y),
  },
  {
    name: "ROTATE",
    label: "ROTATE",
    parameters: [
      {
        key: "angle",
        label: "ANGLE",
        min: -180,
        max: 180,
        step: 1,
        start: 30,
        rest: 0,
        format: degrees,
      },
    ],
    matrix: ({ angle }) => rotate2(radians(angle)),
  },
  {
    name: "SHEAR",
    label: "SHEAR",
    parameters: [
      { key: "x", label: "X", min: -2, max: 2, step: 0.05, start: 0.5, rest: 0 },
      { key: "y", label: "Y", min: -2, max: 2, step: 0.05, start: 0, rest: 0 },
    ],
    matrix: ({ x, y }) => shear2(x, y),
  },
  {
    name: "MOVE",
    label: "MOVE",
    parameters: [
      { key: "x", label: "X", min: -4, max: 4, step: 0.05, start: 2, rest: 0 },
      { key: "y", label: "Y", min: -4, max: 4, step: 0.05, start: 1, rest: 0 },
    ],
    matrix: ({ x, y }) => translate2(x, y),
  },
];

const FIRST_STEPS = [
  { kind: "SCALE" },
  { kind: "ROTATE" },
  { kind: "MOVE", values: { x: 1.5, y: -1 } },
];

const WIDTH = 480;
const HEIGHT = 360;
const UNIT = 36;
const toX = (x: number) => WIDTH / 2 + x * UNIT;
const toY = (y: number) => HEIGHT / 2 - y * UNIT;

const SHAPE: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.5, 0],
  [0.5, 1],
  [1.25, 1],
  [1.25, 1.5],
  [0.5, 1.5],
  [0.5, 2],
  [1.5, 2],
  [1.5, 2.5],
  [0, 2.5],
];

const COLORS = {
  x: "#ff6b7a",
  y: "#5ef0a0",
  t: "#c9a6ff",
  shape: "#7c8cff",
  grid: "#2c3652",
  warp: "#3f5fb0",
};

const path = (points: readonly (readonly [number, number])[]) =>
  `${points.map(([x, y], i) => `${i ? "L" : "M"}${toX(x).toFixed(1)} ${toY(y).toFixed(1)}`).join(" ")} Z`;

const place = (m: Mat, [x, y]: readonly [number, number]) => {
  const [a, b] = transform(m, [x, y, 1]);
  return [a, b] as const;
};

function Arrow({
  from,
  to,
  color,
  label,
}: {
  from: readonly [number, number];
  to: readonly [number, number];
  color: string;
  label: string;
}) {
  const x0 = toX(from[0]);
  const y0 = toY(from[1]);
  const x1 = toX(to[0]);
  const y1 = toY(to[1]);
  const angle = Math.atan2(y1 - y0, x1 - x0);
  const near = Math.hypot(x1 - x0, y1 - y0) < 3;
  const head = (spread: number) =>
    `${(x1 - 11 * Math.cos(angle + spread)).toFixed(1)} ${(y1 - 11 * Math.sin(angle + spread)).toFixed(1)}`;
  return (
    <g>
      <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={color} strokeWidth={3} />
      {!near && (
        <path
          d={`M${x1.toFixed(1)} ${y1.toFixed(1)} L${head(0.45)} L${head(-0.45)} Z`}
          fill={color}
        />
      )}
      <text x={x1 + 8} y={y1 - 7} fill={color} fontSize={14} fontWeight={700}>
        {label}
      </text>
    </g>
  );
}

const PRESETS: readonly { label: string; matrix: Mat }[] = [
  { label: "IDENTITY", matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1] },
  { label: "TURN 45°", matrix: rotate2(radians(45)) },
  { label: "TURN 90°", matrix: rotate2(radians(90)) },
  { label: "MIRROR", matrix: scale2(-1, 1) },
  { label: "SHEAR", matrix: shear2(1, 0) },
  { label: "FLATTEN", matrix: [1, 1, 0, 0.5, 0.5, 0, 0, 0, 1] },
];

type Handle = "x" | "y" | "t";

const snap = (value: number) => Math.round(value * 20) / 20;

/** A shape, a grid and a 3×3 matrix: drag where the axes land, or stack up transforms. */
export function MatrixPlayground() {
  const sound = usePanelSound();
  const [mode, setMode] = useState<"stack" | "drag">("stack");
  const [free, setFree] = useState<Mat>(PRESETS[0].matrix);
  const [picked, setPicked] = useState(8);
  const held = useRef<Handle | null>(null);
  const stack = useTransformStack(KINDS, 3, FIRST_STEPS);
  const matrix = mode === "drag" ? free : stack.current;

  const lattice = useMemo(() => {
    const lines: string[] = [];
    for (let i = -10; i <= 10; i++) {
      const a = place(matrix, [i, -10]);
      const b = place(matrix, [i, 10]);
      const c = place(matrix, [-10, i]);
      const d = place(matrix, [10, i]);
      lines.push(
        `M${toX(a[0]).toFixed(1)} ${toY(a[1]).toFixed(1)} L${toX(b[0]).toFixed(1)} ${toY(b[1]).toFixed(1)}`,
        `M${toX(c[0]).toFixed(1)} ${toY(c[1]).toFixed(1)} L${toX(d[0]).toFixed(1)} ${toY(d[1]).toFixed(1)}`,
      );
    }
    return lines.join(" ");
  }, [matrix]);

  const origin = place(matrix, [0, 0]);
  const tipX = place(matrix, [1, 0]);
  const tipY = place(matrix, [0, 1]);
  const determinant = determinant2(matrix);
  const point = SHAPE[picked];
  const landed = transform(matrix, [point[0], point[1], 1]);

  const moveHandle = (handle: Handle, x: number, y: number) => {
    setFree((m) => {
      if (handle === "t") return [m[0], m[1], x, m[3], m[4], y, 0, 0, 1];
      if (handle === "x") return [x - m[2], m[1], m[2], y - m[5], m[4], m[5], 0, 0, 1];
      return [m[0], x - m[2], m[2], m[3], y - m[5], m[5], 0, 0, 1];
    });
  };

  const pointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!held.current) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * WIDTH;
    const y = ((event.clientY - box.top) / box.height) * HEIGHT;
    moveHandle(held.current, snap((x - WIDTH / 2) / UNIT), snap((HEIGHT / 2 - y) / UNIT));
  };

  const handleProps = (handle: Handle, label: string, at: readonly [number, number]) => ({
    role: "slider",
    tabIndex: 0,
    "aria-label": label,
    "aria-valuetext": `${fixed(at[0])}, ${fixed(at[1])}`,
    className: styles.handle,
    onPointerDown: (event: PointerEvent<SVGGElement>) => {
      held.current = handle;
      event.currentTarget.ownerSVGElement?.setPointerCapture?.(event.pointerId);
      event.stopPropagation();
    },
    onKeyDown: (event: KeyboardEvent<SVGGElement>) => {
      const step = {
        ArrowLeft: [-0.25, 0],
        ArrowRight: [0.25, 0],
        ArrowUp: [0, 0.25],
        ArrowDown: [0, -0.25],
      }[event.key];
      if (!step) return;
      event.preventDefault();
      moveHandle(handle, snap(at[0] + step[0]), snap(at[1] + step[1]));
    },
  });

  const ghostProgress = useMemo(
    () => (mode === "stack" ? stack.steps.map((_, i) => stack.matrixAt(i + 1)).slice(0, -1) : []),
    [mode, stack.steps, stack.matrixAt],
  );

  const [m00, m01, m02, m10, m11, m12] = matrix;

  return (
    <GraphicsPanel title="MATRIX PLAYGROUND" sound={sound}>
      <Bay>
        <div className={styles.screen}>
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className={styles.plane}
            role="img"
            aria-label={`Grid and shape after the matrix. Area times ${fixed(Math.abs(determinant))}${determinant < 0 ? ", flipped" : ""}.`}
            onPointerMove={pointerMove}
            onPointerUp={() => {
              held.current = null;
            }}
            onPointerCancel={() => {
              held.current = null;
            }}
          >
            <rect width={WIDTH} height={HEIGHT} fill="#0a0c12" />
            {Array.from({ length: 21 }, (_, i) => i - 10).map((i) => (
              <g key={i} stroke={COLORS.grid} strokeWidth={i === 0 ? 1.4 : 0.6} opacity={0.55}>
                <line x1={toX(i)} y1={0} x2={toX(i)} y2={HEIGHT} />
                <line x1={0} y1={toY(i)} x2={WIDTH} y2={toY(i)} />
              </g>
            ))}
            <path d={lattice} stroke={COLORS.warp} strokeWidth={0.9} fill="none" opacity={0.75} />
            <path
              d={path(SHAPE)}
              fill="none"
              stroke="#8fa3ff"
              strokeWidth={1}
              strokeDasharray="4 3"
              opacity={0.7}
            />
            {ghostProgress.map((ghost, i) => (
              <path
                key={i}
                d={path(SHAPE.map((p) => place(ghost, p)))}
                fill="none"
                stroke={COLORS.shape}
                strokeWidth={1}
                strokeDasharray="2 3"
                opacity={0.65}
              />
            ))}
            <path
              d={path(SHAPE.map((p) => place(matrix, p)))}
              fill={COLORS.shape}
              fillOpacity={0.82}
              stroke={COLORS.shape}
              strokeWidth={1.5}
            />
            <Arrow from={origin} to={tipX} color={COLORS.x} label="x" />
            <Arrow from={origin} to={tipY} color={COLORS.y} label="y" />
            {SHAPE.map((p, i) => {
              const [x, y] = place(matrix, p);
              return (
                <circle
                  key={i}
                  cx={toX(x)}
                  cy={toY(y)}
                  r={i === picked ? 6 : 3.5}
                  fill={i === picked ? "#fff" : "#0a0c12"}
                  stroke={i === picked ? "#0a0c12" : "#fff"}
                  strokeWidth={1.5}
                  style={{ cursor: "pointer" }}
                  onPointerDown={() => setPicked(i)}
                />
              );
            })}
            {mode === "drag" && (
              <>
                <g {...handleProps("x", "Where the x axis lands", tipX)}>
                  <circle cx={toX(tipX[0])} cy={toY(tipX[1])} r={18} fill="transparent" />
                  <circle
                    cx={toX(tipX[0])}
                    cy={toY(tipX[1])}
                    r={7}
                    fill={COLORS.x}
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                </g>
                <g {...handleProps("y", "Where the y axis lands", tipY)}>
                  <circle cx={toX(tipY[0])} cy={toY(tipY[1])} r={18} fill="transparent" />
                  <circle
                    cx={toX(tipY[0])}
                    cy={toY(tipY[1])}
                    r={7}
                    fill={COLORS.y}
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                </g>
                <g {...handleProps("t", "Where the origin lands", origin)}>
                  <circle cx={toX(origin[0])} cy={toY(origin[1])} r={18} fill="transparent" />
                  <circle
                    cx={toX(origin[0])}
                    cy={toY(origin[1])}
                    r={7}
                    fill={COLORS.t}
                    stroke="#fff"
                    strokeWidth={1.5}
                  />
                </g>
              </>
            )}
          </svg>
        </div>
        <Choice
          label="BUILD IT"
          value={mode}
          options={[
            { value: "stack", label: "STACK STEPS" },
            { value: "drag", label: "DRAG AXES" },
          ]}
          onChange={(next) => {
            if (next === "drag") setFree(stack.current);
            setMode(next);
            sound.playButton();
          }}
        />
        {mode === "stack" && <TransformProgress stack={stack} />}
        {mode === "drag" && (
          <fieldset className={styles.choice}>
            <legend>SET TO</legend>
            <div className={styles.choiceRow}>
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className={styles.button}
                  onClick={() => {
                    setFree(preset.matrix);
                    sound.playButton();
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </fieldset>
        )}
      </Bay>

      {mode === "stack" && (
        <Bay head="STEPS · FIRST TO LAST" aside={`${stack.steps.length} / 6`}>
          <TransformStackEditor kinds={KINDS} stack={stack} onClick={sound.playButton} />
          <TransformChain kinds={KINDS} stack={stack} />
        </Bay>
      )}

      <Bay head="ONE POINT × THE MATRIX">
        <div className={styles.equation}>
          <MatrixGrid matrix={matrix} axes label="M" />
          <span>×</span>
          <VectorColumn values={[point[0], point[1], 1]} label="POINT" />
          <span>=</span>
          <VectorColumn values={landed} label="LANDS AT" />
        </div>
        <ol className={styles.work}>
          <li>
            x′ = {fixed(m00)}×{fixed(point[0])} + {fixed(m01)}×{fixed(point[1])} + {fixed(m02)}×1 ={" "}
            {fixed(landed[0])}
          </li>
          <li>
            y′ = {fixed(m10)}×{fixed(point[0])} + {fixed(m11)}×{fixed(point[1])} + {fixed(m12)}×1 ={" "}
            {fixed(landed[1])}
          </li>
        </ol>
        <div className={styles.choiceRow}>
          {SHAPE.map((corner, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.button} ${styles.iconButton}`}
              aria-pressed={i === picked}
              aria-label={`Point ${fixed(corner[0])}, ${fixed(corner[1])}`}
              onClick={() => setPicked(i)}
            >
              {i}
            </button>
          ))}
        </div>
        <dl className={styles.counts}>
          <div>
            <dt>AREA ×</dt>
            <dd>{fixed(Math.abs(determinant))}</dd>
          </div>
          <div>
            <dt>FACING</dt>
            <dd className={determinant < 0 ? styles.alert : undefined}>
              {Math.abs(determinant) < 1e-6 ? "FLAT" : determinant < 0 ? "FLIPPED" : "SAME"}
            </dd>
          </div>
        </dl>
      </Bay>
    </GraphicsPanel>
  );
}
