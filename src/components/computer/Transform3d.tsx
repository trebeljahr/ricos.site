import { useMemo, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import {
  radians,
  rotateX,
  rotateY,
  rotateZ,
  scale3,
  transform,
  transformPoint,
  translate3,
  type Vec3,
} from "src/lib/computer/graphics/matrix";
import { house } from "src/lib/computer/graphics/meshes";
import {
  clearScene,
  drawAxes,
  drawGrid,
  drawLine,
  drawPolygons,
  sceneCamera,
  shadeFace,
} from "src/lib/computer/graphics/sceneDrawing";
import styles from "./Graphics.module.css";
import { Bay, fixed, GraphicsPanel, MatrixGrid, SceneCanvas, VectorColumn } from "./GraphicsParts";
import {
  TransformChain,
  type TransformKind,
  TransformProgress,
  TransformStackEditor,
  useTransformStack,
} from "./TransformStack";

const degrees = (value: number) => `${Math.round(value)}°`;
const angle = (start: number) =>
  [
    { key: "angle", label: "ANGLE", min: -180, max: 180, step: 1, start, rest: 0, format: degrees },
  ] as const;
const axes = (start: Vec3, rest: number, min: number, max: number) =>
  (["x", "y", "z"] as const).map((key, i) => ({
    key,
    label: key.toUpperCase(),
    min,
    max,
    step: 0.05,
    start: start[i],
    rest,
  }));

const KINDS: readonly TransformKind[] = [
  {
    name: "SCALE",
    label: "SCALE",
    parameters: axes([1.5, 1.5, 1.5], 1, -2, 2),
    matrix: ({ x, y, z }) => scale3(x, y, z),
  },
  {
    name: "TURN X",
    label: "TURN X",
    parameters: angle(30),
    matrix: ({ angle: a }) => rotateX(radians(a)),
  },
  {
    name: "TURN Y",
    label: "TURN Y",
    parameters: angle(40),
    matrix: ({ angle: a }) => rotateY(radians(a)),
  },
  {
    name: "TURN Z",
    label: "TURN Z",
    parameters: angle(30),
    matrix: ({ angle: a }) => rotateZ(radians(a)),
  },
  {
    name: "MOVE",
    label: "MOVE",
    parameters: axes([2, 0, 0], 0, -4, 4),
    matrix: ({ x, y, z }) => translate3(x, y, z),
  },
];

const FIRST_STEPS = [{ kind: "TURN Y" }, { kind: "MOVE" }];

/** The same steps as the 2D playground with one more row and column: an object and a 4×4 matrix. */
export function Transform3d() {
  const sound = usePanelSound();
  const stack = useTransformStack(KINDS, 4, FIRST_STEPS);
  const [yaw, setYaw] = useState(30);
  const [pitch, setPitch] = useState(24);
  const [picked, setPicked] = useState(9);
  const mesh = useMemo(() => house(), []);
  const matrix = stack.current;

  const point = mesh.positions[picked];
  const landed = transform(matrix, [point[0], point[1], point[2], 1]);

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    clearScene(ctx, width, height);
    const camera = sceneCamera(yaw, pitch, 15, [0, 0, 0], width, height);
    drawGrid(ctx, camera, 5, -1.5);
    drawAxes(ctx, camera, [0, 0, 0], [5, 0, 0], [0, 4, 0], [0, 0, 5], 1);
    // Where it started, as an outline.
    for (const [a, b, c] of mesh.triangles) {
      drawLine(ctx, camera, mesh.positions[a], mesh.positions[b], "#8fa3ff44");
      drawLine(ctx, camera, mesh.positions[b], mesh.positions[c], "#8fa3ff44");
      drawLine(ctx, camera, mesh.positions[c], mesh.positions[a], "#8fa3ff44");
    }
    const placed = mesh.positions.map((p) => transformPoint(matrix, p));
    // A mirrored object winds the other way, so it cannot rely on winding to hide its back.
    drawPolygons(
      ctx,
      camera,
      mesh.triangles.map(([a, b, c], id) => {
        const points = [placed[a], placed[b], placed[c]];
        return {
          id,
          points,
          color: shadeFace(mesh.faceColors?.[id] ?? [200, 200, 200], points, camera.eye),
        };
      }),
      { cull: false },
    );
    const origin = transformPoint(matrix, [0, 0, 0]);
    drawAxes(
      ctx,
      camera,
      origin,
      transformPoint(matrix, [1.5, 0, 0]),
      transformPoint(matrix, [0, 1.5, 0]),
      transformPoint(matrix, [0, 0, 1.5]),
      3,
    );
  };

  return (
    <GraphicsPanel title="MATRICES IN 3D" sound={sound}>
      <Bay>
        <div className={styles.screen}>
          <SceneCanvas
            label={`A house after the matrix, at ${fixed(landed[0])}, ${fixed(landed[1])}, ${fixed(landed[2])} for the picked vertex.`}
            draw={draw}
            onDrag={(dx, dy) => {
              setYaw((value) => value - dx * 0.5);
              setPitch((value) => Math.max(-85, Math.min(85, value + dy * 0.5)));
            }}
          />
        </div>
        <TransformProgress stack={stack} />
      </Bay>
      <Bay head="STEPS · FIRST TO LAST" aside={`${stack.steps.length} / 6`}>
        <TransformStackEditor kinds={KINDS} stack={stack} onClick={sound.playButton} />
        <TransformChain kinds={KINDS} stack={stack} digits={1} />
      </Bay>
      <Bay head="ONE VERTEX × THE MATRIX">
        <div className={styles.equation}>
          <MatrixGrid matrix={matrix} axes label="M" />
          <span>×</span>
          <VectorColumn values={[point[0], point[1], point[2], 1]} label="VERTEX" />
          <span>=</span>
          <VectorColumn values={landed} label="LANDS AT" />
        </div>
        <div className={styles.stopPick}>
          <button
            type="button"
            className={`${styles.button} ${styles.iconButton}`}
            aria-label="Previous vertex"
            onClick={() =>
              setPicked((value) => (value + mesh.positions.length - 1) % mesh.positions.length)
            }
          >
            ‹
          </button>
          <span>VERTEX {picked}</span>
          <button
            type="button"
            className={`${styles.button} ${styles.iconButton}`}
            aria-label="Next vertex"
            onClick={() => setPicked((value) => (value + 1) % mesh.positions.length)}
          >
            ›
          </button>
        </div>
      </Bay>
    </GraphicsPanel>
  );
}
