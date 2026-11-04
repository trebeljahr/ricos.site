import { useEffect, useMemo, useRef, useState } from "react";
import {
  cross,
  dot,
  lookAt,
  type Mat,
  normalize,
  orbitEye,
  perspective,
  subtract,
  transform,
  transformPoint,
  type Vec2,
  type Vec3,
} from "src/lib/computer/graphics/matrix";
import { sharedCube, sphere, type Triangle } from "src/lib/computer/graphics/meshes";
import { heatColor } from "src/lib/computer/graphics/modelRender";
import { Framebuffer, type PipelineVertex, rasterize } from "src/lib/computer/graphics/rasterizer";
import {
  cylinderMesh,
  edgeKey,
  layoutFromUvs,
  meshEdgeList,
  seamPresets,
  type UvLayout,
  unwrap,
  type WeldedMesh,
  weld,
} from "src/lib/computer/graphics/unwrap";
import styles from "./Graphics.module.css";
import {
  Bay,
  Choice,
  fixed,
  GraphicsPanel,
  PixelCanvas,
  PlayBar,
  SceneCanvas,
  useTimeline,
} from "./GraphicsParts";
import { useArissa } from "./useModels";

const SIZE = 320;
const TEXTURE = 256;
const SEAM_COLORS = [
  "#38e1ff",
  "#ff5cc8",
  "#ffd166",
  "#5ef0a0",
  "#ff6b7a",
  "#8b6cff",
  "#ff9f43",
  "#62bcff",
];
const BRUSH = [255, 60, 140] as const;

type ShapeName = "cube" | "cylinder" | "sphere" | "character";
type Tool = "pick" | "paint" | "cut";

const SHAPES: readonly { value: ShapeName; label: string }[] = [
  { value: "cube", label: "CUBE" },
  { value: "cylinder", label: "CYLINDER" },
  { value: "sphere", label: "SPHERE" },
  { value: "character", label: "CHARACTER" },
];
const TOOLS: readonly { value: Tool; label: string }[] = [
  { value: "pick", label: "PICK" },
  { value: "paint", label: "PAINT" },
  { value: "cut", label: "CUT SEAM" },
];

const BUILT = {
  cube: () => weld(sharedCube()),
  cylinder: () => cylinderMesh(),
  sphere: () => weld(sphere(12, 8, 1.3)),
};

function checkerTexture(size: number) {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const v = y / size;
      const dark = (Math.floor(u * 8) + Math.floor(v * 8)) % 2 === 0;
      const level = dark ? 0.62 : 1;
      const i = (y * size + x) * 4;
      data[i] = (70 + u * 185) * level;
      data[i + 1] = (70 + v * 185) * level;
      data[i + 2] = (230 - u * 120) * level;
      data[i + 3] = 255;
    }
  }
  return data;
}

const presetFor = (shape: ShapeName, mesh: WeldedMesh) => {
  if (shape === "cube") return seamPresets.cube(mesh);
  if (shape === "cylinder") return seamPresets.cylinder(mesh);
  if (shape === "sphere") return seamPresets.sphere(mesh);
  return new Set<number>();
};

const distanceToSegment = (px: number, py: number, a: Vec2, b: Vec2) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(
    0,
    Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy || 1)),
  );
  return Math.hypot(px - a[0] - dx * t, py - a[1] - dy * t);
};

const insideTriangle = (x: number, y: number, [p, q, r]: readonly Vec2[]) => {
  const side = (a: Vec2, b: Vec2) => (b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]);
  const s = [side(p, q), side(q, r), side(r, p)];
  return s.every((v) => v >= 0) || s.every((v) => v <= 0);
};

/** Cut a mesh along seams, flatten it, and paint on either side of the mapping. */
export function UvUnwrap() {
  const [shape, setShape] = useState<ShapeName>("cube");
  const [tool, setTool] = useState<Tool>("pick");
  const [showStretch, setShowStretch] = useState(false);
  const [yaw, setYaw] = useState(35);
  const [pitch, setPitch] = useState(25);
  const [picked, setPicked] = useState<number | null>(null);
  const [seamsByShape, setSeamsByShape] = useState<Partial<Record<ShapeName, ReadonlySet<number>>>>(
    {},
  );
  const [textureVersion, setTextureVersion] = useState(0);
  const unfold = useTimeline(3.5, 0);
  const character = useArissa(shape === "character");

  const texture = useRef<{ data: Uint8ClampedArray; size: number; shape: ShapeName | "checker" }>({
    data: checkerTexture(TEXTURE),
    size: TEXTURE,
    shape: "checker",
  });
  const textureCanvas = useRef<HTMLCanvasElement | null>(null);
  const uvAtPixel = useRef(new Float32Array(SIZE * SIZE * 2));

  const mesh: WeldedMesh | null = useMemo(() => {
    if (shape !== "character") return BUILT[shape]();
    if (!character) return null;
    const positions: Vec3[] = [];
    for (let i = 0; i < character.positions.length; i += 3) {
      positions.push([
        character.positions[i],
        character.positions[i + 1],
        character.positions[i + 2],
      ]);
    }
    const triangles: Triangle[] = [];
    for (let i = 0; i < character.triangles.length; i += 3) {
      triangles.push([
        character.triangles[i],
        character.triangles[i + 1],
        character.triangles[i + 2],
      ]);
    }
    return { positions, triangles };
  }, [shape, character]);

  const edges = useMemo(
    () => (mesh && shape !== "character" ? meshEdgeList(mesh) : null),
    [mesh, shape],
  );
  const seams = useMemo(
    () => seamsByShape[shape] ?? (mesh ? presetFor(shape, mesh) : new Set<number>()),
    [seamsByShape, shape, mesh],
  );

  const layout: UvLayout | null = useMemo(() => {
    if (!mesh) return null;
    if (shape === "character" && character) {
      const uvs: Vec2[] = [];
      for (let i = 0; i < character.uvs.length; i += 2)
        uvs.push([character.uvs[i], character.uvs[i + 1]]);
      return layoutFromUvs(mesh.positions, mesh.triangles, uvs);
    }
    return unwrap(mesh, seams);
  }, [mesh, seams, shape, character]);

  // Swap to the artist's texture, or back to the checker.
  useEffect(() => {
    if (shape === "character") {
      if (!character || typeof Image === "undefined" || typeof document === "undefined") return;
      let current = true;
      const image = new Image();
      image.onload = () => {
        if (!current) return;
        const canvas = document.createElement("canvas");
        const size = image.width;
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.drawImage(image, 0, 0);
        texture.current = {
          data: context.getImageData(0, 0, size, size).data,
          size,
          shape: "character",
        };
        setTextureVersion((v) => v + 1);
      };
      image.src = character.texture;
      return () => {
        current = false;
      };
    }
    if (texture.current.shape === "character") {
      texture.current = { data: checkerTexture(TEXTURE), size: TEXTURE, shape: "checker" };
      setTextureVersion((v) => v + 1);
    }
  }, [shape, character]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const canvas = textureCanvas.current ?? document.createElement("canvas");
    textureCanvas.current = canvas;
    const { data, size } = texture.current;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return;
    const image = context.createImageData(size, size);
    image.data.set(data);
    context.putImageData(image, 0, 0);
  }, [textureVersion, shape]);

  const framebuffer = useMemo(() => new Framebuffer(SIZE, SIZE), []);
  const distance = shape === "character" ? 5.4 : 7;
  const camera = useMemo(() => {
    const eye = orbitEye(yaw, pitch, distance);
    return { view: lookAt(eye, [0, 0, 0]), projection: perspective(35, 1, 0.1, 60), eye };
  }, [yaw, pitch, distance]);

  // Flat, the layout faces the camera square on, whichever way the view has turned.
  const flatZ = -distance;
  const flatSize = 2 * distance * Math.tan((35 * Math.PI) / 360) * 0.96;
  const morphed = (position: Vec3, uv: Vec2, t: number): Vec3 => {
    const viewed = transformPoint(camera.view as Mat, position);
    const flat: Vec3 = [(uv[0] - 0.5) * flatSize, (0.5 - uv[1]) * flatSize, flatZ];
    return [
      viewed[0] + (flat[0] - viewed[0]) * t,
      viewed[1] + (flat[1] - viewed[1]) * t,
      viewed[2] + (flat[2] - viewed[2]) * t,
    ];
  };

  const screen = useMemo(() => {
    if (!mesh || !layout) return null;
    const t = unfold.t * unfold.t * (3 - 2 * unfold.t);
    const triangles = mesh.triangles.map((triangle, id) => {
      const [a, b, c] = triangle.map((i) => mesh.positions[i]);
      const normal = normalize(cross(subtract(b, a), subtract(c, a)));
      const lit = 0.6 + 0.4 * Math.abs(dot(normal, normalize(subtract(camera.eye, a))));
      const level = lit + (1 - lit) * t;
      return triangle.map((vertex, corner): PipelineVertex => {
        const uv = layout.corners[id][corner];
        const v = morphed(mesh.positions[vertex], uv, t);
        const clip = transform(camera.projection, [v[0], v[1], v[2], 1]);
        return { clip: [clip[0], clip[1], clip[2], clip[3]], attributes: [uv[0], uv[1], level] };
      }) as [PipelineVertex, PipelineVertex, PipelineVertex];
    });
    return { triangles, t };
  }, [mesh, layout, unfold.t, camera]);

  useMemo(() => {
    framebuffer.clear([10, 12, 18]);
    if (!screen || !layout) return;
    const { data, size } = texture.current;
    const uvs = uvAtPixel.current;
    uvs.fill(-1);
    rasterize(
      framebuffer,
      screen.triangles,
      (input, out) => {
        const [u, v, level] = input.attributes;
        uvs[(input.y * SIZE + input.x) * 2] = u;
        uvs[(input.y * SIZE + input.x) * 2 + 1] = v;
        if (showStretch) {
          const s = layout.stretch[input.triangle];
          const color = heatColor(0.5 + Math.log2(Math.max(0.05, s)) / 4);
          out[0] = color[0] * level;
          out[1] = color[1] * level;
          out[2] = color[2] * level;
        } else {
          const x = Math.min(size - 1, Math.max(0, Math.floor(u * size)));
          const y = Math.min(size - 1, Math.max(0, Math.floor(v * size)));
          const i = (y * size + x) * 4;
          out[0] = data[i] * level;
          out[1] = data[i + 1] * level;
          out[2] = data[i + 2] * level;
        }
        if (input.triangle === picked) {
          out[0] = out[0] * 0.4 + 255 * 0.6;
          out[1] = out[1] * 0.4 + 255 * 0.6;
          out[2] = out[2] * 0.4 + 120 * 0.6;
        }
      },
      { cull: screen.t === 0 },
    );
  }, [framebuffer, screen, layout, showStretch, picked, textureVersion]);

  // Each cut edge, in the same colour wherever it appears, on the mesh and in the layout.
  const seamLines = useMemo(() => {
    if (!mesh || !layout || !edges) return [];
    const list: {
      key: number;
      color: string;
      copies: { triangle: number; a: number; b: number }[];
    }[] = [];
    let index = 0;
    for (const key of seams) {
      const edge = edges.get(key);
      if (!edge) continue;
      list.push({
        key,
        color: SEAM_COLORS[index++ % SEAM_COLORS.length],
        copies: edge.triangles.map((triangle) => ({
          triangle,
          a: mesh.triangles[triangle].indexOf(edge.a),
          b: mesh.triangles[triangle].indexOf(edge.b),
        })),
      });
    }
    return list;
  }, [mesh, layout, edges, seams]);

  const onView = (p: PipelineVertex) =>
    [((p.clip[0] / p.clip[3] + 1) / 2) * SIZE, ((1 - p.clip[1] / p.clip[3]) / 2) * SIZE] as const;

  const stamp = (u: number, v: number) => {
    const { data, size } = texture.current;
    const cx = u * size;
    const cy = v * size;
    const radius = size / 40;
    for (let y = Math.floor(cy - radius); y <= cy + radius; y++) {
      for (let x = Math.floor(cx - radius); x <= cx + radius; x++) {
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        if (Math.hypot(x - cx, y - cy) > radius) continue;
        const i = (y * size + x) * 4;
        data[i] = BRUSH[0];
        data[i + 1] = BRUSH[1];
        data[i + 2] = BRUSH[2];
      }
    }
    setTextureVersion((version) => version + 1);
  };

  const toggleSeam = (key: number) => {
    const next = new Set(seams);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSeamsByShape({ ...seamsByShape, [shape]: next });
  };

  const cutNearest = (triangle: number, distanceFor: (corner: number, next: number) => number) => {
    if (!mesh || shape === "character") return;
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < 3; i++) {
      const d = distanceFor(i, (i + 1) % 3);
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    }
    const t = mesh.triangles[triangle];
    toggleSeam(edgeKey(t[best], t[(best + 1) % 3], mesh.positions.length));
  };

  const tapMesh = (x: number, y: number) => {
    if (!screen) return;
    const triangle = framebuffer.owner[y * SIZE + x];
    if (tool === "pick") {
      setPicked(triangle >= 0 ? triangle : null);
    } else if (tool === "cut" && triangle >= 0) {
      const corners = screen.triangles[triangle].map(onView);
      cutNearest(triangle, (i, j) => distanceToSegment(x + 0.5, y + 0.5, corners[i], corners[j]));
    }
  };

  const triangleAtUv = (u: number, v: number) => {
    if (!layout) return -1;
    for (let t = layout.corners.length - 1; t >= 0; t--) {
      if (insideTriangle(u, v, layout.corners[t])) return t;
    }
    return -1;
  };

  const strokeOnMesh = (x: number, y: number) => {
    const i = (y * SIZE + x) * 2;
    const u = uvAtPixel.current[i];
    if (u >= 0) stamp(u, uvAtPixel.current[i + 1]);
  };

  const uvPress = useRef(false);

  const drawLayout = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = "#0a0c12";
    ctx.fillRect(0, 0, width, height);
    if (!layout) return;
    if (textureCanvas.current && !showStretch) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(textureCanvas.current, 0, 0, width, height);
      // Only the islands are used: dim everything else on the texture.
      ctx.fillStyle = "#0a0c12b0";
      ctx.fillRect(0, 0, width, height);
      if (typeof ctx.save === "function") {
        ctx.save();
        ctx.beginPath();
        for (const [p, q, r] of layout.corners) {
          ctx.moveTo(p[0] * width, p[1] * height);
          ctx.lineTo(q[0] * width, q[1] * height);
          ctx.lineTo(r[0] * width, r[1] * height);
          ctx.closePath();
        }
        ctx.clip();
        ctx.drawImage(textureCanvas.current, 0, 0, width, height);
        ctx.restore();
      }
    }
    if (showStretch) {
      layout.corners.forEach(([p, q, r], t) => {
        const c = heatColor(0.5 + Math.log2(Math.max(0.05, layout.stretch[t])) / 4);
        ctx.fillStyle = `rgb(${c.map(Math.round).join(",")})`;
        ctx.beginPath();
        ctx.moveTo(p[0] * width, p[1] * height);
        ctx.lineTo(q[0] * width, q[1] * height);
        ctx.lineTo(r[0] * width, r[1] * height);
        ctx.closePath();
        ctx.fill();
      });
    }
    ctx.strokeStyle = "#ffffff55";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (const [p, q, r] of layout.corners) {
      ctx.moveTo(p[0] * width, p[1] * height);
      ctx.lineTo(q[0] * width, q[1] * height);
      ctx.lineTo(r[0] * width, r[1] * height);
      ctx.closePath();
    }
    ctx.stroke();
    for (const { color, copies } of seamLines) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      for (const { triangle, a, b } of copies) {
        const p = layout.corners[triangle][a];
        const q = layout.corners[triangle][b];
        ctx.beginPath();
        ctx.moveTo(p[0] * width, p[1] * height);
        ctx.lineTo(q[0] * width, q[1] * height);
        ctx.stroke();
      }
    }
    if (picked !== null && layout.corners[picked]) {
      const [p, q, r] = layout.corners[picked];
      ctx.fillStyle = "#ffff78b0";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p[0] * width, p[1] * height);
      ctx.lineTo(q[0] * width, q[1] * height);
      ctx.lineTo(r[0] * width, r[1] * height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  };

  const chooseShape = (next: ShapeName) => {
    setShape(next);
    setPicked(null);
    unfold.seek(0);
  };

  // The worst of most triangles: one sliver should not decide the number.
  const worst = useMemo(() => {
    if (!layout) return 1;
    const ratios = layout.stretch
      .map((s) => Math.max(s, 1 / Math.max(s, 0.001)))
      .sort((p, q) => p - q);
    return ratios[Math.floor((ratios.length - 1) * 0.95)];
  }, [layout]);

  return (
    <GraphicsPanel title="UV UNWRAPPING">
      <Bay>
        <div className={styles.views}>
          <PixelCanvas
            framebuffer={framebuffer}
            blocky={false}
            label={`The ${shape} in 3D with its texture.`}
            stroke={tool === "paint" ? (x, y) => strokeOnMesh(x, y) : undefined}
            onDrag={(dx, dy) => {
              setYaw((value) => value - dx * 0.5);
              setPitch((value) => Math.max(-85, Math.min(85, value + dy * 0.5)));
            }}
            onTap={tapMesh}
          >
            {screen && screen.t === 0 && (
              <svg className={styles.overlay} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
                {seamLines.flatMap(({ key, color, copies }) => {
                  const first = copies[0];
                  if (!first) return [];
                  const triangle = screen.triangles[first.triangle];
                  const [x0, y0] = onView(triangle[first.a]);
                  const [x1, y1] = onView(triangle[first.b]);
                  return [
                    <line
                      key={key}
                      x1={x0}
                      y1={y0}
                      x2={x1}
                      y2={y1}
                      stroke={color}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                    />,
                  ];
                })}
              </svg>
            )}
          </PixelCanvas>
          <div
            className={styles.screen}
            onPointerDown={(event) => {
              uvPress.current = true;
              const box = event.currentTarget.getBoundingClientRect();
              const u = (event.clientX - box.left) / box.width;
              const v = (event.clientY - box.top) / box.height;
              if (tool === "paint") stamp(u, v);
              if (tool === "pick") {
                const t = triangleAtUv(u, v);
                setPicked(t >= 0 ? t : null);
              }
              if (tool === "cut" && layout) {
                const t = triangleAtUv(u, v);
                if (t >= 0) {
                  const corners = layout.corners[t];
                  cutNearest(t, (i, j) => distanceToSegment(u, v, corners[i], corners[j]));
                }
              }
            }}
            onPointerMove={(event) => {
              if (!uvPress.current || tool !== "paint") return;
              const box = event.currentTarget.getBoundingClientRect();
              stamp((event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height);
            }}
            onPointerUp={() => {
              uvPress.current = false;
            }}
            onPointerLeave={() => {
              uvPress.current = false;
            }}
            style={{ touchAction: tool === "paint" ? "none" : undefined }}
          >
            <SceneCanvas
              aspect={1}
              label="The same triangles, flat, on the texture."
              draw={drawLayout}
            />
          </div>
        </div>
        <PlayBar button="UNFOLD" label="UNFOLDED" timeline={unfold} />
        <Choice label="SHAPE" value={shape} options={SHAPES} onChange={chooseShape} />
        <Choice
          label="TOOL"
          value={tool}
          options={TOOLS.filter((option) => option.value !== "cut" || shape !== "character")}
          onChange={(next) => {
            setTool(next);
          }}
        />
        <Choice
          label="SHOW"
          value={showStretch ? "stretch" : "texture"}
          options={[
            { value: "texture", label: "TEXTURE" },
            { value: "stretch", label: "STRETCH" },
          ]}
          onChange={(next) => {
            setShowStretch(next === "stretch");
          }}
        />
        {shape !== "character" && mesh && (
          <fieldset className={styles.choice}>
            <legend>SEAMS</legend>
            <div className={styles.choiceRow}>
              <button
                type="button"
                className={styles.button}
                onClick={() => {
                  setSeamsByShape({ ...seamsByShape, [shape]: presetFor(shape, mesh) });
                }}
              >
                GOOD CUTS
              </button>
              <button
                type="button"
                className={styles.button}
                onClick={() => {
                  setSeamsByShape({ ...seamsByShape, [shape]: new Set() });
                }}
              >
                NO CUTS
              </button>
              <button
                type="button"
                className={styles.button}
                onClick={() => {
                  setSeamsByShape({ ...seamsByShape, [shape]: new Set(edges?.keys() ?? []) });
                }}
              >
                EVERY EDGE
              </button>
            </div>
          </fieldset>
        )}
        {shape === "character" && !layout && <p className={styles.work}>LOADING</p>}
      </Bay>

      <Bay head={picked === null ? "THE LAYOUT" : `TRIANGLE ${picked}`}>
        {picked !== null && layout && mesh?.triangles[picked] && (
          <ol className={styles.work}>
            {mesh.triangles[picked].map((vertex, corner) => (
              <li key={corner}>
                {fixed(mesh.positions[vertex][0])} {fixed(mesh.positions[vertex][1])}{" "}
                {fixed(mesh.positions[vertex][2])} → UV{" "}
                {fixed(layout.corners[picked][corner][0], 3)}{" "}
                {fixed(layout.corners[picked][corner][1], 3)}
              </li>
            ))}
          </ol>
        )}
        <dl className={styles.counts}>
          <div>
            <dt>TRIANGLES</dt>
            <dd>{mesh?.triangles.length.toLocaleString("en") ?? "—"}</dd>
          </div>
          <div>
            <dt>ISLANDS</dt>
            <dd>{layout?.islands ?? "—"}</dd>
          </div>
          {shape !== "character" && (
            <div>
              <dt>CUT EDGES</dt>
              <dd>{seams.size}</dd>
            </div>
          )}
          <div>
            <dt>STRETCHED BY</dt>
            <dd className={worst > 4 ? styles.alert : undefined}>×{fixed(worst, 1)}</dd>
          </div>
          <div>
            <dt>FOLDED OVER</dt>
            <dd className={layout?.folded ? styles.alert : undefined}>{layout?.folded ?? 0}</dd>
          </div>
          <div>
            <dt>TEXTURE USED</dt>
            <dd>{Math.min(100, Math.round((layout?.coverage ?? 0) * 100))}%</dd>
          </div>
        </dl>
      </Bay>
    </GraphicsPanel>
  );
}
