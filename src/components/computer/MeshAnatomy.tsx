import clsx from "clsx";
import { useMemo, useRef, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import { add, scaled, type Vec3 } from "src/lib/computer/graphics/matrix";
import {
  completeMesh,
  floatBytes,
  house,
  type Mesh,
  meshBytes,
  meshEdges,
  pyramid,
  quadMesh,
  sharedCube,
  sphere,
  splitCube,
  torus,
  triangleMesh,
} from "src/lib/computer/graphics/meshes";
import {
  clearScene,
  type DrawnPolygon,
  drawArrow,
  drawDot,
  drawLine,
  drawPolygons,
  drawText,
  pointInPolygon,
  project,
  type SceneCamera,
  sceneCamera,
  shadeFace,
} from "src/lib/computer/graphics/sceneDrawing";
import styles from "./Graphics.module.css";
import { Bay, Choice, fixed, GraphicsPanel, SceneCanvas, Slider, Toggle } from "./GraphicsParts";

const SHAPES = {
  triangle: { label: "TRIANGLE", build: () => triangleMesh() },
  quad: { label: "SQUARE", build: () => quadMesh() },
  pyramid: { label: "PYRAMID", build: () => pyramid() },
  cube: { label: "CUBE · 8V", build: () => sharedCube() },
  splitCube: { label: "CUBE · 24V", build: () => splitCube() },
  house: { label: "HOUSE", build: () => house() },
  sphere: { label: "SPHERE", build: (detail: number) => sphere(detail * 2, detail) },
  torus: { label: "TORUS", build: (detail: number) => torus(detail * 2, detail) },
} as const;
type ShapeName = keyof typeof SHAPES;
const SHAPE_NAMES = Object.keys(SHAPES) as ShapeName[];
const hasDetail = (shape: ShapeName) => shape === "sphere" || shape === "torus";

const hex = (byte: number) => byte.toString(16).toUpperCase().padStart(2, "0");
const COORDINATE_NAMES = ["X", "Y", "Z"] as const;

const FALLBACK_COLORS: Vec3[] = [
  [108, 184, 255],
  [84, 156, 226],
];

type Selection = { kind: "vertex" | "triangle"; index: number } | null;

/** One mesh, its two lists of numbers, and what those numbers cost in memory. */
export function MeshAnatomy() {
  const sound = usePanelSound();
  const [shape, setShape] = useState<ShapeName>("cube");
  const [detail, setDetail] = useState(6);
  const [moved, setMoved] = useState<Record<number, Vec3>>({});
  const [selection, setSelection] = useState<Selection>({ kind: "vertex", index: 2 });
  const [showPoints, setShowPoints] = useState(true);
  const [showEdges, setShowEdges] = useState(true);
  const [showFaces, setShowFaces] = useState(true);
  const [showNormals, setShowNormals] = useState(false);
  const [cull, setCull] = useState(true);
  const [yaw, setYaw] = useState(32);
  const [pitch, setPitch] = useState(24);
  const lastDraw = useRef<{ camera: SceneCamera; polygons: DrawnPolygon[] } | null>(null);
  const positionsOnScreen = useRef<[number, number, number][]>([]);
  const [drawnCount, setDrawnCount] = useState(0);

  const base = useMemo(() => SHAPES[shape].build(detail), [shape, detail]);
  const mesh: Mesh = useMemo(() => {
    const edits = Object.keys(moved);
    if (edits.length === 0) return base;
    return completeMesh({
      positions: base.positions.map((position, i) => moved[i] ?? position),
      uvs: base.uvs,
      triangles: base.triangles,
      faceColors: base.faceColors,
    });
  }, [base, moved]);
  const edges = useMemo(() => meshEdges(mesh), [mesh]);
  const bytes = meshBytes(mesh);

  const selectedVertex = selection?.kind === "vertex" ? selection.index : null;
  const selectedTriangle = selection?.kind === "triangle" ? mesh.triangles[selection.index] : null;
  const usedBySelected = useMemo(() => {
    if (selectedVertex === null) return new Set<number>();
    return new Set(
      mesh.triangles.flatMap((triangle, i) => (triangle.includes(selectedVertex) ? [i] : [])),
    );
  }, [mesh, selectedVertex]);

  const choose = (next: Selection) => {
    setSelection(next);
    sound.playButton();
  };

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    clearScene(ctx, width, height);
    const camera = sceneCamera(yaw, pitch, 8, [0, 0, 0], width, height);
    const onScreen = mesh.positions.map((p) => project(camera, p));
    positionsOnScreen.current = onScreen;
    const polygons = mesh.triangles.map(([a, b, c], id) => {
      const points = [mesh.positions[a], mesh.positions[b], mesh.positions[c]];
      const color: Vec3 = mesh.faceColors?.[id] ?? FALLBACK_COLORS[id % 2];
      const selected = selection?.kind === "triangle" && selection.index === id;
      return {
        id,
        points,
        color: selected ? ([56, 225, 255] as Vec3) : shadeFace(color, points, camera.eye),
        // Without culling you can see the backs through the fronts.
        alpha: showFaces ? (cull ? 1 : 0.72) : 0,
      };
    });
    const drawn = drawPolygons(ctx, camera, polygons, { cull, seams: showFaces });
    lastDraw.current = { camera, polygons: drawn };
    const front = new Set(drawn.map((p) => p.id));
    if (front.size !== drawnCount) setDrawnCount(front.size);
    const hideBack = cull && showFaces;

    if (showEdges) {
      const count = mesh.positions.length;
      const frontEdges = new Set<number>();
      if (hideBack) {
        for (const id of front) {
          const [a, b, c] = mesh.triangles[id];
          for (const [p, q] of [
            [a, b],
            [b, c],
            [c, a],
          ]) {
            frontEdges.add(Math.min(p, q) * count + Math.max(p, q));
          }
        }
      }
      for (const [p, q] of edges) {
        if (hideBack && !frontEdges.has(Math.min(p, q) * count + Math.max(p, q))) continue;
        drawLine(ctx, camera, mesh.positions[p], mesh.positions[q], "#dfe7ff", 1);
      }
    }

    if (selectedTriangle) {
      const [a, b, c] = selectedTriangle.map((i) => mesh.positions[i]);
      drawArrow(ctx, camera, a, b, "#fff", 2);
      drawArrow(ctx, camera, b, c, "#fff", 2);
      drawArrow(ctx, camera, c, a, "#fff", 2);
    }

    const visibleVertex = new Set<number>();
    if (hideBack) {
      for (const id of front) for (const i of mesh.triangles[id]) visibleVertex.add(i);
    }
    const seesAll = !hideBack;

    if (showNormals) {
      mesh.positions.forEach((position, i) => {
        if (!seesAll && !visibleVertex.has(i)) return;
        drawArrow(
          ctx,
          camera,
          position,
          add(position, scaled(mesh.normals[i], 0.55)),
          "#ffd166",
          1.2,
        );
      });
    }

    if (showPoints) {
      const few = mesh.positions.length <= 30;
      mesh.positions.forEach((position, i) => {
        if (!seesAll && !visibleVertex.has(i)) return;
        const isSelected = selectedVertex === i || selectedTriangle?.includes(i);
        drawDot(
          ctx,
          camera,
          position,
          isSelected ? 7 : few ? 4.5 : 2.5,
          isSelected ? "#fff" : "#38e1ff",
          isSelected ? "#0a0c12" : undefined,
        );
        if (few) {
          const [x, y] = onScreen[i];
          drawText(ctx, x + 7, y - 7, String(i), "#fff", 12);
        }
      });
    } else if (selectedVertex !== null) {
      drawDot(ctx, camera, mesh.positions[selectedVertex], 7, "#fff", "#0a0c12");
    }
  };

  const tap = (x: number, y: number) => {
    const onScreen = positionsOnScreen.current;
    let nearest = -1;
    let nearestDistance = 18;
    onScreen.forEach(([px, py, w], i) => {
      if (w <= 0) return;
      const distance = Math.hypot(px - x, py - y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = i;
      }
    });
    if (nearest >= 0) {
      choose({ kind: "vertex", index: nearest });
      return;
    }
    const polygons = lastDraw.current?.polygons ?? [];
    for (let i = polygons.length - 1; i >= 0; i--) {
      if (pointInPolygon(x, y, polygons[i].screen)) {
        choose({ kind: "triangle", index: polygons[i].id });
        return;
      }
    }
    setSelection(null);
  };

  const moveCoordinate = (axis: number, value: number) => {
    if (selectedVertex === null) return;
    const position = [...mesh.positions[selectedVertex]] as [number, number, number];
    position[axis] = value;
    setMoved({ ...moved, [selectedVertex]: position });
  };

  const vertexRows = mesh.positions.slice(0, 400);
  const triangleRows = mesh.triangles.slice(0, 400);

  return (
    <GraphicsPanel title="INSIDE A MESH" sound={sound}>
      <Bay>
        <div className={styles.screen}>
          <SceneCanvas
            label={`A mesh of ${mesh.positions.length} vertices and ${mesh.triangles.length} triangles.`}
            draw={draw}
            onDrag={(dx, dy) => {
              setYaw((value) => value - dx * 0.5);
              setPitch((value) => Math.max(-85, Math.min(85, value + dy * 0.5)));
            }}
            onTap={tap}
          />
        </div>
        <Choice
          label="SHAPE"
          value={shape}
          options={SHAPE_NAMES.map((value) => ({ value, label: SHAPES[value].label }))}
          onChange={(next) => {
            setShape(next);
            setMoved({});
            setSelection({ kind: "vertex", index: 0 });
            sound.playButton();
          }}
        />
        {hasDetail(shape) && (
          <Slider
            label="DETAIL"
            value={detail}
            min={2}
            max={16}
            step={1}
            format={(value) => String(value)}
            onChange={(value) => {
              setDetail(value);
              setMoved({});
              setSelection(null);
            }}
          />
        )}
        <fieldset className={styles.choice}>
          <legend>SHOW</legend>
          <div className={styles.choiceRow}>
            <Toggle label="VERTICES" on={showPoints} onChange={setShowPoints} />
            <Toggle label="EDGES" on={showEdges} onChange={setShowEdges} />
            <Toggle label="FACES" on={showFaces} onChange={setShowFaces} />
            <Toggle label="NORMALS" on={showNormals} onChange={setShowNormals} />
            <Toggle label="CULL BACKS" on={cull} onChange={setCull} />
          </div>
        </fieldset>
      </Bay>

      <Bay head="THE TWO LISTS">
        <div className={styles.tables}>
          <div>
            <span className={styles.tableHead}>VERTICES · {mesh.positions.length}</span>
            <ol className={styles.table} aria-label="Vertex list">
              <li>
                <div
                  className={clsx(styles.row, styles.rowVertex)}
                  style={{ cursor: "default" }}
                  aria-hidden="true"
                >
                  <span>#</span>
                  <span>X</span>
                  <span>Y</span>
                  <span>Z</span>
                </div>
              </li>
              {vertexRows.map((position, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className={clsx(styles.row, styles.rowVertex)}
                    aria-pressed={selectedVertex === i}
                    data-related={selectedTriangle?.includes(i) ? "" : undefined}
                    onClick={() => choose({ kind: "vertex", index: i })}
                  >
                    <span>{i}</span>
                    <span>{fixed(position[0])}</span>
                    <span>{fixed(position[1])}</span>
                    <span>{fixed(position[2])}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <span className={styles.tableHead}>TRIANGLES · {mesh.triangles.length}</span>
            <ol className={styles.table} aria-label="Triangle list">
              <li>
                <div
                  className={clsx(styles.row, styles.rowTriangle)}
                  style={{ cursor: "default" }}
                  aria-hidden="true"
                >
                  <span>#</span>
                  <span>A</span>
                  <span>B</span>
                  <span>C</span>
                </div>
              </li>
              {triangleRows.map(([a, b, c], i) => (
                <li key={i}>
                  <button
                    type="button"
                    className={clsx(styles.row, styles.rowTriangle)}
                    aria-pressed={selection?.kind === "triangle" && selection.index === i}
                    data-related={usedBySelected.has(i) ? "" : undefined}
                    onClick={() => choose({ kind: "triangle", index: i })}
                  >
                    <span>{i}</span>
                    <span>{a}</span>
                    <span>{b}</span>
                    <span>{c}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
        {selectedVertex !== null && mesh.positions[selectedVertex] && (
          <>
            <div className={styles.sliders}>
              {COORDINATE_NAMES.map((name, axis) => (
                <Slider
                  key={name}
                  label={name}
                  value={mesh.positions[selectedVertex][axis]}
                  min={-2}
                  max={2}
                  step={0.05}
                  onChange={(value) => moveCoordinate(axis, value)}
                />
              ))}
            </div>
            <div className={styles.work}>
              {COORDINATE_NAMES.map((name, axis) => (
                <div key={name} className={styles.hex}>
                  {name} = {fixed(mesh.positions[selectedVertex][axis])} ={" "}
                  {floatBytes(mesh.positions[selectedVertex][axis]).map(hex).join(" ")}
                </div>
              ))}
            </div>
            <dl className={styles.counts}>
              <div>
                <dt>IN TRIANGLES</dt>
                <dd>{usedBySelected.size}</dd>
              </div>
            </dl>
          </>
        )}
        <div className={styles.choiceRow}>
          <button
            type="button"
            className={styles.button}
            disabled={Object.keys(moved).length === 0}
            onClick={() => {
              setMoved({});
              sound.playButton();
            }}
          >
            RESET VERTICES
          </button>
        </div>
      </Bay>

      <Bay head="IN MEMORY">
        <dl className={styles.counts}>
          <div>
            <dt>VERTICES {mesh.positions.length} × 12 B</dt>
            <dd>{bytes.vertexBuffer.toLocaleString("en")} B</dd>
          </div>
          <div>
            <dt>INDICES {mesh.triangles.length * 3} × 2 B</dt>
            <dd>{bytes.indexBuffer.toLocaleString("en")} B</dd>
          </div>
          <div>
            <dt>SHARED, TOTAL</dt>
            <dd>{(bytes.vertexBuffer + bytes.indexBuffer).toLocaleString("en")} B</dd>
          </div>
          <div>
            <dt>NOT SHARED {mesh.triangles.length * 3} × 12 B</dt>
            <dd>{bytes.withoutIndices.toLocaleString("en")} B</dd>
          </div>
          <div>
            <dt>DRAWN</dt>
            <dd>
              {drawnCount} / {mesh.triangles.length}
            </dd>
          </div>
        </dl>
      </Bay>
    </GraphicsPanel>
  );
}
