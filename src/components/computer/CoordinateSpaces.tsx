import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import {
  lerp,
  lerp3,
  normalize,
  orbitEye,
  transform,
  transformPoint,
  type Vec3,
  type Vec4,
} from "src/lib/computer/graphics/matrix";
import {
  house,
  type Mesh,
  pyramid,
  sharedCube,
  sphere,
  torus,
} from "src/lib/computer/graphics/meshes";
import {
  modelViewProjection,
  type PipelineSettings,
  pipelineMatrices,
  STAGES,
  type Stage,
  vertexJourney,
} from "src/lib/computer/graphics/pipeline";
import {
  clipPolygon,
  Framebuffer,
  type PipelineVertex,
  rasterize,
} from "src/lib/computer/graphics/rasterizer";
import {
  AXIS_COLORS,
  clearScene,
  drawArrow,
  drawDot,
  drawLine,
  drawPolygons,
  drawText,
  project,
  type SceneCamera,
  sceneCamera,
  shadeFace,
} from "src/lib/computer/graphics/sceneDrawing";
import { DivideDiagram } from "./DivideDiagram";
import styles from "./Graphics.module.css";
import {
  Bay,
  Choice,
  fixed,
  GraphicsPanel,
  MatrixGrid,
  PlayBar,
  paintFramebuffer,
  SceneCanvas,
  Slider,
  useAnimation,
  useEased,
  useTimeline,
  VectorColumn,
} from "./GraphicsParts";

const SHAPES = {
  house: { label: "HOUSE", build: () => house() },
  cube: { label: "CUBE", build: () => sharedCube() },
  pyramid: { label: "PYRAMID", build: () => pyramid() },
  sphere: { label: "SPHERE", build: () => sphere(16, 10) },
  torus: { label: "TORUS", build: () => torus(20, 10) },
} as const;
type ShapeName = keyof typeof SHAPES;

const STAGE_NAMES: Record<Stage, string> = {
  local: "LOCAL",
  world: "WORLD",
  view: "CAMERA",
  clip: "CLIP",
  ndc: "NDC",
  screen: "SCREEN",
  pixels: "PIXEL",
};

const RESOLUTIONS = [
  [16, 12],
  [32, 24],
  [64, 48],
  [160, 120],
  [320, 240],
] as const;

const FALLBACK: Vec3[] = [
  [108, 184, 255],
  [84, 156, 226],
];

const FIRST_SETTINGS: PipelineSettings = {
  position: [1.5, 0, -1],
  yaw: 30,
  pitch: 0,
  scale: 1,
  cameraYaw: 35,
  cameraPitch: 18,
  cameraDistance: 8,
  fov: 50,
  near: 1,
  far: 12,
  width: 64,
  height: 48,
};

// Far enough to see the divide work, not so far that the far plane cuts the object away.
const PUSH_DISTANCE = 3.5;
const HOLD = 1;
const MOVE = 1.7;
const TOUR_SECONDS = 5 * (HOLD + MOVE) + HOLD;

/** Where the tour is after some seconds: a pause at each stop, an eased move between them. */
function tourStage(seconds: number) {
  const span = HOLD + MOVE;
  const stop = Math.min(5, Math.floor(seconds / span));
  if (stop === 5) return 5;
  const into = seconds - stop * span - HOLD;
  if (into <= 0) return stop;
  const t = into / MOVE;
  return stop + t * t * (3 - 2 * t);
}

/** A point and where it is at every stop, as far as it has a place there. */
type Tracked = { local: Vec3; world: Vec3; view: Vec3; clip: Vec4 };

/** Clip and NDC depth count away from the viewer. Drawn negated so near stays nearest throughout. */
function stageIndex(stage: number) {
  const low = Math.floor(stage);
  return { low, high: Math.min(low + 1, 5), t: stage - low };
}

function positionAt(point: Tracked, index: number, aspect: number): Vec3 {
  const { clip } = point;
  switch (index) {
    case 0:
      return point.local;
    case 1:
      return point.world;
    case 2:
      return point.view;
    case 3:
      return [clip[0], clip[1], -clip[2]];
    case 4:
      return [clip[0] / clip[3], clip[1] / clip[3], -clip[2] / clip[3]];
    default:
      // Flattened onto the screen, with just enough depth left to sort by.
      return [(clip[0] / clip[3]) * aspect, clip[1] / clip[3], (-clip[2] / clip[3]) * 0.01];
  }
}

/** Between two stops. Clip to NDC divides by a w that eases in from 1, the true shape of that step. */
function morph(point: Tracked, stage: number, aspect: number): Vec3 {
  const { low, high, t } = stageIndex(stage);
  if (low === 3 && t > 0) {
    const w = lerp(1, point.clip[3], t);
    return [point.clip[0] / w, point.clip[1] / w, -point.clip[2] / w];
  }
  return lerp3(positionAt(point, low, aspect), positionAt(point, high, aspect), t);
}

type Frame = { target: Vec3; radius: number };

function frameFor(index: number, tracked: Tracked[], aspect: number): Frame {
  if (index === 0) return { target: [0, 0, 0], radius: 2.1 };
  if (index === 4) return { target: [0, 0, 0], radius: 2.1 };
  if (index >= 5) return { target: [0, 0, 0], radius: aspect + 0.15 };
  let furthest = 0;
  const center: [number, number, number] = [0, 0, 0];
  const points = tracked.map((point) => positionAt(point, index, aspect));
  for (const point of points) {
    center[0] += point[0] / points.length;
    center[1] += point[1] / points.length;
    center[2] += point[2] / points.length;
  }
  for (const point of points) {
    furthest = Math.max(
      furthest,
      Math.hypot(point[0] - center[0], point[1] - center[1], point[2] - center[2]),
    );
  }
  return { target: center, radius: Math.max(furthest, 2) };
}

type PixelProbe = {
  x: number;
  y: number;
  triangle: number;
  weights: Vec3;
  depth: number;
  color: Vec3;
} | null;

/** From the numbers in a mesh to one pixel on a screen, one space at a time. */
export function CoordinateSpaces() {
  const sound = usePanelSound();
  const [shape, setShape] = useState<ShapeName>("house");
  const [settings, setSettings] = useState(FIRST_SETTINGS);
  const [stage, setStage] = useState(0);
  const [vertex, setVertex] = useState(9);
  const [yaw, setYaw] = useState(28);
  const [pitch, setPitch] = useState(20);
  const [buffer, setBuffer] = useState<"color" | "depth">("color");
  const [cull, setCull] = useState(true);
  const [probe, setProbe] = useState<{ x: number; y: number } | null>(null);
  const [drawnFraction, setDrawnFraction] = useState(1);
  const [drawing, setDrawing] = useState(false);

  const [touring, setTouring] = useState<number | null>(null);
  const push = useTimeline(5);

  const easedStage = useEased(stage);
  const eased = touring === null ? easedStage : tourStage(touring);
  const mesh: Mesh = useMemo(() => SHAPES[shape].build(), [shape]);
  const position = mesh.positions[Math.min(vertex, mesh.positions.length - 1)];
  // Pushing the object straight away from the camera and back.
  const pushedBy = push.t < 1 ? Math.sin(push.t * Math.PI) * PUSH_DISTANCE : 0;
  const matrices = useMemo(() => {
    if (pushedBy === 0) return pipelineMatrices(settings);
    const away = normalize(
      orbitEye(settings.cameraYaw, settings.cameraPitch, -settings.cameraDistance),
    );
    return pipelineMatrices({
      ...settings,
      position: [
        settings.position[0] + away[0] * pushedBy,
        settings.position[1] + away[1] * pushedBy,
        settings.position[2] + away[2] * pushedBy,
      ],
    });
  }, [settings, pushedBy]);
  const journey = useMemo(
    () => vertexJourney(position, matrices, settings.width, settings.height),
    [position, matrices, settings.width, settings.height],
  );
  const aspect = settings.width / settings.height;

  const trackPoint = useMemo(() => {
    const inverseView = (p: Vec3): Vec3 => {
      // A view matrix only turns and moves, so undoing it takes the transpose of the turn.
      const v = matrices.view;
      const x = p[0] - v[3];
      const y = p[1] - v[7];
      const z = p[2] - v[11];
      return [
        v[0] * x + v[4] * y + v[8] * z,
        v[1] * x + v[5] * y + v[9] * z,
        v[2] * x + v[6] * y + v[10] * z,
      ];
    };
    return {
      fromLocal: (local: Vec3): Tracked => {
        const world = transformPoint(matrices.model, local);
        const view = transformPoint(matrices.view, world);
        const [a, b, c, d] = transform(matrices.projection, [view[0], view[1], view[2], 1]);
        return { local, world, view, clip: [a, b, c, d] };
      },
      fromWorld: (world: Vec3): Tracked => {
        const view = transformPoint(matrices.view, world);
        const [a, b, c, d] = transform(matrices.projection, [view[0], view[1], view[2], 1]);
        return { local: world, world, view, clip: [a, b, c, d] };
      },
      fromView: (view: Vec3): Tracked => {
        const world = inverseView(view);
        const [a, b, c, d] = transform(matrices.projection, [view[0], view[1], view[2], 1]);
        return { local: world, world, view, clip: [a, b, c, d] };
      },
    };
  }, [matrices]);

  const tracked = useMemo(() => mesh.positions.map(trackPoint.fromLocal), [mesh, trackPoint]);

  const frustum = useMemo(() => {
    const tan = Math.tan((settings.fov * Math.PI) / 360);
    const corner = (depth: number, sx: number, sy: number): Vec3 => [
      sx * tan * depth * aspect,
      sy * tan * depth,
      -depth,
    ];
    const signs = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    return {
      near: signs.map(([sx, sy]) => trackPoint.fromView(corner(settings.near, sx, sy))),
      far: signs.map(([sx, sy]) => trackPoint.fromView(corner(settings.far, sx, sy))),
      eye: trackPoint.fromView([0, 0, 0]),
    };
  }, [settings.fov, settings.near, settings.far, aspect, trackPoint]);

  // Attributes carry the view-space position, so clipped corners can be drawn at earlier stops.
  const pipelineTriangles = useMemo(() => {
    const vertices: PipelineVertex[] = tracked.map((point) => ({
      clip: point.clip,
      attributes: [...point.view],
    }));
    return mesh.triangles.map(
      ([a, b, c]) =>
        [vertices[a], vertices[b], vertices[c]] as [PipelineVertex, PipelineVertex, PipelineVertex],
    );
  }, [mesh, tracked]);

  const faceColor = useCallback(
    (id: number): Vec3 => mesh.faceColors?.[id] ?? FALLBACK[id % 2],
    [mesh],
  );

  // The real pixels: the actual rasterizer, at the actual resolution.
  const frame = useMemo(() => {
    const framebuffer = new Framebuffer(settings.width, settings.height);
    const shades = mesh.triangles.map(([a, b, c], id) =>
      shadeFace(
        faceColor(id),
        [tracked[a].world, tracked[b].world, tracked[c].world],
        matrices.eye,
      ),
    );
    const all = rasterize(framebuffer, pipelineTriangles, () => {}, { cull });
    framebuffer.clear();
    let found: PixelProbe = null;
    const limit = drawnFraction >= 1 ? Infinity : Math.round(all.fragments * drawnFraction);
    const stats = rasterize(
      framebuffer,
      pipelineTriangles,
      (input, out) => {
        const shadeColor = shades[input.triangle];
        out[0] = shadeColor[0];
        out[1] = shadeColor[1];
        out[2] = shadeColor[2];
        if (probe && input.x === probe.x && input.y === probe.y) {
          found = {
            x: input.x,
            y: input.y,
            triangle: input.triangle,
            weights: input.weights,
            depth: input.depth,
            color: shadeColor,
          };
        }
      },
      { cull, fragmentLimit: limit },
    );
    if (buffer === "depth") {
      let low = 1;
      let high = 0;
      for (let i = 0; i < framebuffer.depth.length; i++) {
        if (framebuffer.owner[i] < 0) continue;
        low = Math.min(low, framebuffer.depth[i]);
        high = Math.max(high, framebuffer.depth[i]);
      }
      const span = high - low || 1;
      for (let i = 0; i < framebuffer.depth.length; i++) {
        if (framebuffer.owner[i] < 0) continue;
        const value = 255 - ((framebuffer.depth[i] - low) / span) * 215;
        framebuffer.color[i * 4] = value;
        framebuffer.color[i * 4 + 1] = value;
        framebuffer.color[i * 4 + 2] = value;
      }
    }
    return { framebuffer, stats, total: all.fragments, found: found as PixelProbe };
  }, [
    faceColor,
    settings.width,
    settings.height,
    mesh,
    tracked,
    matrices.eye,
    pipelineTriangles,
    cull,
    drawnFraction,
    probe,
    buffer,
  ]);

  useAnimation(drawing, (seconds) => {
    const next = drawnFraction + seconds * 0.22;
    if (next >= 1) {
      setDrawnFraction(1);
      setDrawing(false);
    } else {
      setDrawnFraction(next);
    }
  });

  useAnimation(touring !== null, (seconds) => {
    if (touring === null) return;
    const next = touring + seconds;
    if (next >= TOUR_SECONDS) {
      setTouring(null);
      setStage(6);
      setDrawnFraction(0);
      setDrawing(true);
      return;
    }
    setTouring(next);
    const rounded = Math.round(tourStage(next));
    if (rounded !== stage) setStage(rounded);
  });

  const insetCanvas = useRef<HTMLCanvasElement>(null);
  const pixelCanvas = useRef<HTMLCanvasElement>(null);
  const onPixels = stage === 6;
  useEffect(() => {
    paintFramebuffer(insetCanvas.current, frame.framebuffer);
    paintFramebuffer(pixelCanvas.current, frame.framebuffer);
  });

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    clearScene(ctx, width, height);
    const shown = Math.min(eased, 5);
    const { low, high, t } = stageIndex(shown);
    const frameLow = frameFor(low, [...tracked, ...frustum.near, frustum.eye], aspect);
    const frameHigh = frameFor(high, [...tracked, ...frustum.near, frustum.eye], aspect);
    const target = lerp3(frameLow.target, frameHigh.target, t);
    const radius = lerp(frameLow.radius, frameHigh.radius, t);
    // On the screen stop the view turns to face it square on.
    const straighten = Math.max(0, Math.min(1, shown - 4));
    const camera = sceneCamera(
      lerp(yaw, 0, straighten),
      lerp(pitch, 0, straighten),
      radius * 3.1,
      target,
      width,
      height,
    );
    const at = (point: Tracked) => morph(point, shown, aspect);

    // The world and its axes, which the camera stop moves along with everything else.
    const worldStrength = shown <= 1 ? shown : shown <= 2.6 ? 1 : Math.max(0, 3 - shown) / 0.4;
    if (worldStrength > 0.01) {
      const grid = 8;
      const alpha = Math.round(worldStrength * 150)
        .toString(16)
        .padStart(2, "0");
      const color = `#2c3652${alpha}`;
      for (let i = -grid; i <= grid; i += 2) {
        drawLine(
          ctx,
          camera,
          at(trackPoint.fromWorld([i, -1.2, -grid])),
          at(trackPoint.fromWorld([i, -1.2, grid])),
          color,
        );
        drawLine(
          ctx,
          camera,
          at(trackPoint.fromWorld([-grid, -1.2, i])),
          at(trackPoint.fromWorld([grid, -1.2, i])),
          color,
        );
      }
      const origin = at(trackPoint.fromWorld([0, 0, 0]));
      const size = 1.2;
      drawArrow(
        ctx,
        camera,
        origin,
        at(trackPoint.fromWorld([size, 0, 0])),
        `${AXIS_COLORS.x}99`,
        1.5,
      );
      drawArrow(
        ctx,
        camera,
        origin,
        at(trackPoint.fromWorld([0, size, 0])),
        `${AXIS_COLORS.y}99`,
        1.5,
      );
      drawArrow(
        ctx,
        camera,
        origin,
        at(trackPoint.fromWorld([0, 0, size])),
        `${AXIS_COLORS.z}99`,
        1.5,
      );
    }

    // The clipped pieces once clipping has happened, the whole mesh before it.
    const clippedFromHere = shown > 2.001;
    const polygons = clippedFromHere
      ? pipelineTriangles.flatMap((triangle, id) => {
          const pieces = clipPolygon(triangle);
          if (pieces.length < 3) return [];
          const points = pieces.map((piece) => {
            const view: Vec3 = [piece.attributes[0], piece.attributes[1], piece.attributes[2]];
            return at({ local: view, world: view, view, clip: piece.clip });
          });
          return [{ id, points, color: shadeFace(faceColor(id), points, camera.eye) }];
        })
      : mesh.triangles.map(([a, b, c], id) => {
          const points = [at(tracked[a]), at(tracked[b]), at(tracked[c])];
          return { id, points, color: shadeFace(faceColor(id), points, camera.eye) };
        });
    drawPolygons(ctx, camera, polygons, { cull });

    // The object's own axes, carried along while it is placed in the world.
    if (shown < 2.5) {
      const local = (x: number, y: number, z: number) => at(trackPoint.fromLocal([x, y, z]));
      const origin = local(0, 0, 0);
      drawArrow(ctx, camera, origin, local(1.2, 0, 0), `${AXIS_COLORS.x}99`, 1.5);
      drawArrow(ctx, camera, origin, local(0, 1.2, 0), `${AXIS_COLORS.y}99`, 1.5);
      drawArrow(ctx, camera, origin, local(0, 0, 1.2), `${AXIS_COLORS.z}99`, 1.5);
    }

    // The camera's axes. At the camera stop they become the axes everything is measured with.
    if (shown > 0.5 && shown < 2.5) {
      const view = (x: number, y: number, z: number) => at(trackPoint.fromView([x, y, z]));
      const origin = view(0, 0, 0);
      drawArrow(ctx, camera, origin, view(1.2, 0, 0), `${AXIS_COLORS.x}99`, 1.5);
      drawArrow(ctx, camera, origin, view(0, 1.2, 0), `${AXIS_COLORS.y}99`, 1.5);
      drawArrow(ctx, camera, origin, view(0, 0, 1.2), `${AXIS_COLORS.z}99`, 1.5);
    }

    // The volume the camera sees, which ends up as a cube, then as the screen.
    const volumeStrength = Math.min(1, shown);
    if (volumeStrength > 0.02) {
      const color = "#38e1ff";
      const near = frustum.near.map(at);
      const far = frustum.far.map(at);
      ctx.globalAlpha = volumeStrength;
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        drawLine(ctx, camera, near[i], near[j], color, 1.5);
        drawLine(ctx, camera, far[i], far[j], color, 1);
        drawLine(ctx, camera, near[i], far[i], color, 1);
      }
      // The camera itself is at w = 0, which has no place in NDC.
      if (shown < 3) {
        const eye = at(frustum.eye);
        for (let i = 0; i < 4; i++) drawLine(ctx, camera, eye, near[i], color, 1, [3, 3]);
        drawDot(ctx, camera, eye, 5, color, "#fff");
      }
      ctx.globalAlpha = 1;
    }

    if (shown >= 4.5) {
      const corner = project(camera, positionAt(frustum.near[3], 5, aspect));
      const opposite = project(camera, positionAt(frustum.near[1], 5, aspect));
      drawText(ctx, corner[0] + 3, corner[1] - 5, "0, 0", "#38e1ff");
      drawText(
        ctx,
        opposite[0] - 60,
        opposite[1] + 15,
        `${settings.width}, ${settings.height}`,
        "#38e1ff",
      );
    }

    // A line from each vertex towards the camera. They meet at the eye, until the
    // divide by w turns them parallel: that is all perspective is.
    if (shown >= 1 && shown < 5 && tracked.length <= 30) {
      const rayStrength = Math.min(1, Math.min(shown - 1, 5 - shown) * 2);
      ctx.globalAlpha = rayStrength;
      tracked.forEach((point, i) => {
        const depth = -point.view[2];
        if (depth <= settings.near) return;
        const k = settings.near / depth;
        const onNear = trackPoint.fromView([point.view[0] * k, point.view[1] * k, -settings.near]);
        const isPicked = i === Math.min(vertex, tracked.length - 1);
        drawLine(
          ctx,
          camera,
          at(point),
          at(onNear),
          isPicked ? "#ffffff" : "#ffffff33",
          isPicked ? 1.6 : 0.8,
          isPicked ? [5, 4] : undefined,
        );
        if (isPicked) drawDot(ctx, camera, at(onNear), 3.5, "#ffd166");
      });
      ctx.globalAlpha = 1;
    }

    drawRuler(ctx, camera, Math.round(shown), Math.abs(shown - Math.round(shown)));

    if (journey.clip[3] > 0 || shown < 3) {
      const here = at(tracked[Math.min(vertex, tracked.length - 1)]);
      drawDot(ctx, camera, here, 6, journey.inside ? "#fff" : "#ff6b7a", "#0a0c12");
    }
  };

  /**
   * The ruler of the space on show, and the one vertex measured against it: its
   * three numbers from the table, walked out along that space's three axes.
   */
  const drawRuler = (
    ctx: CanvasRenderingContext2D,
    camera: SceneCamera,
    index: number,
    offStop: number,
  ) => {
    const strength = Math.max(0, 1 - offStop * 4);
    if (strength <= 0.01) return;
    const coordinates: readonly number[] | null = [
      journey.local,
      journey.world,
      journey.view,
      journey.clip,
      journey.ndc,
      journey.screen,
    ][index];
    // Depth is drawn negated from clip space on, so that near stays nearest.
    const place = (x: number, y: number, z: number): Vec3 => {
      if (index >= 5) {
        return [(x / settings.width) * 2 * aspect - aspect, 1 - (y / settings.height) * 2, 0];
      }
      return index >= 3 ? [x, y, -z] : [x, y, z];
    };
    ctx.globalAlpha = strength;
    const start = index >= 5 ? place(0, 0, 0) : place(0, 0, 0);
    const reach = (value: number) =>
      Math.max(index === 4 ? 1 : 2, Math.ceil(Math.abs(value)) + 0.5);
    const ranges = coordinates ? coordinates.slice(0, 3).map(reach) : [2, 2, 2];
    const tick = index === 5 ? settings.width / 8 : 1;
    const ends: Vec3[] =
      index >= 5
        ? [place(settings.width, 0, 0), place(0, settings.height, 0), start]
        : [place(ranges[0], 0, 0), place(0, ranges[1], 0), place(0, 0, ranges[2])];
    const colors = [AXIS_COLORS.x, AXIS_COLORS.y, AXIS_COLORS.z];
    ["x", "y", "z"].forEach((name, axis) => {
      if (index >= 5 && axis === 2) return;
      drawArrow(ctx, camera, start, ends[axis], colors[axis], 2.5, name);
      const total = index >= 5 ? (axis === 0 ? settings.width : settings.height) : ranges[axis];
      for (let unit = tick; unit < total; unit += tick) {
        const at3 = [0, 0, 0];
        at3[axis] = unit;
        drawDot(ctx, camera, place(at3[0], at3[1], at3[2]), 2, colors[axis]);
      }
    });
    if (coordinates) {
      const [x, y, z] = coordinates;
      const legs: [Vec3, Vec3, number, string][] = [
        [place(0, 0, 0), place(x, 0, 0), 0, fixed(x, index >= 5 ? 1 : 2)],
        [place(x, 0, 0), place(x, y, 0), 1, fixed(y, index >= 5 ? 1 : 2)],
      ];
      if (index < 5) legs.push([place(x, y, 0), place(x, y, z), 2, fixed(z)]);
      for (const [from, to, axis, label] of legs) {
        drawLine(ctx, camera, from, to, colors[axis], 2.5);
        const [ax, ay, aw] = project(camera, from);
        const [bx, by, bw] = project(camera, to);
        if (aw > 0 && bw > 0) {
          drawText(ctx, (ax + bx) / 2 + 5, (ay + by) / 2 - 4, label, colors[axis], 12);
        }
      }
    }
    ctx.globalAlpha = 1;
  };

  const update = (change: Partial<PipelineSettings>) => {
    setSettings((value) => ({ ...value, ...change }));
    setDrawnFraction(1);
  };
  const updatePosition = (axis: number, value: number) => {
    const next = [...settings.position] as [number, number, number];
    next[axis] = value;
    update({ position: next });
  };

  const stageName = STAGES[stage];

  const tapPixel = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.floor(((event.clientX - box.left) / box.width) * settings.width);
    const y = Math.floor(((event.clientY - box.top) / box.height) * settings.height);
    setProbe({ x, y });
    sound.playButton();
  };

  const stops: {
    stage: Stage;
    values: readonly (string | null)[];
    out?: readonly boolean[];
    link?: number;
  }[] = [
    { stage: "local", values: journey.local.map((v) => fixed(v)) },
    { stage: "world", values: journey.world.map((v) => fixed(v)) },
    // Camera depth and clip w are the same distance, seen from two sides of the same matrix.
    { stage: "view", values: journey.view.map((v) => fixed(v)), link: 2 },
    {
      stage: "clip",
      link: 3,
      values: journey.clip.map((v) => fixed(v)),
      out: [
        Math.abs(journey.clip[0]) > journey.clip[3],
        Math.abs(journey.clip[1]) > journey.clip[3],
        Math.abs(journey.clip[2]) > journey.clip[3],
        journey.clip[3] <= 0,
      ],
    },
    {
      stage: "ndc",
      values: journey.ndc ? [...journey.ndc.map((v) => fixed(v)), ""] : ["—", "—", "—", ""],
      out: journey.ndc?.map((v) => Math.abs(v) > 1),
    },
    {
      stage: "screen",
      values: journey.screen
        ? [
            fixed(journey.screen[0], 1),
            fixed(journey.screen[1], 1),
            fixed(journey.screen[2], 3),
            "",
          ]
        : ["—", "—", "—", ""],
    },
    {
      stage: "pixels",
      values: journey.pixel
        ? [String(journey.pixel[0]), String(journey.pixel[1]), "", ""]
        : ["OFF", "SCREEN", "", ""],
      out: journey.pixel ? undefined : [true, true],
    },
  ];

  return (
    <GraphicsPanel title="FROM A MESH TO A PIXEL" sound={sound}>
      <Bay>
        <div className={styles.screen}>
          {onPixels ? (
            <>
              <canvas
                ref={pixelCanvas}
                width={settings.width}
                height={settings.height}
                className={`${styles.canvas} ${styles.pixels}`}
                style={{ cursor: "crosshair", aspectRatio: String(aspect) }}
                role="img"
                aria-label={`The screen, ${settings.width} by ${settings.height} pixels.`}
                onPointerDown={tapPixel}
              />
              <svg
                className={styles.overlay}
                viewBox={`0 0 ${settings.width} ${settings.height}`}
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {settings.width <= 64 &&
                  Array.from({ length: settings.width + 1 }, (_, x) => (
                    <line
                      key={`x${x}`}
                      x1={x}
                      y1={0}
                      x2={x}
                      y2={settings.height}
                      stroke="#ffffff22"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                {settings.width <= 64 &&
                  Array.from({ length: settings.height + 1 }, (_, y) => (
                    <line
                      key={`y${y}`}
                      x1={0}
                      y1={y}
                      x2={settings.width}
                      y2={y}
                      stroke="#ffffff22"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                {journey.pixel && (
                  <rect
                    x={journey.pixel[0]}
                    y={journey.pixel[1]}
                    width={1}
                    height={1}
                    fill="none"
                    stroke="#fff"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {probe && (
                  <rect
                    x={probe.x}
                    y={probe.y}
                    width={1}
                    height={1}
                    fill="none"
                    stroke="#ffd166"
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </svg>
            </>
          ) : (
            <>
              <SceneCanvas
                label={`The scene as it looks in ${STAGE_NAMES[stageName]} space.`}
                draw={draw}
                onDrag={(dx, dy) => {
                  setYaw((value) => value - dx * 0.5);
                  setPitch((value) => Math.max(-85, Math.min(85, value + dy * 0.5)));
                }}
              />
              <div className={styles.inset} hidden={stage >= 5}>
                <canvas ref={insetCanvas} width={settings.width} height={settings.height} />
              </div>
            </>
          )}
          <span className={styles.screenTag}>{STAGE_NAMES[stageName]}</span>
        </div>
      </Bay>

      <Bay>
        <div className={styles.choiceRow}>
          <button
            type="button"
            className={styles.button}
            aria-pressed={touring !== null}
            onClick={() => {
              if (touring !== null) {
                setTouring(null);
                return;
              }
              setStage(0);
              setDrawing(false);
              setDrawnFraction(1);
              setTouring(0);
              sound.playButton();
            }}
          >
            {touring !== null ? "STOP" : "PLAY ALL THE WAY"}
          </button>
        </div>
      </Bay>

      <Bay head="ONE VERTEX · EVERY STOP">
        <div className={styles.stopPick}>
          <button
            type="button"
            className={`${styles.button} ${styles.iconButton}`}
            aria-label="Previous vertex"
            onClick={() =>
              setVertex(
                (mesh.positions.length + Math.min(vertex, mesh.positions.length - 1) - 1) %
                  mesh.positions.length,
              )
            }
          >
            ‹
          </button>
          <span>VERTEX {Math.min(vertex, mesh.positions.length - 1)}</span>
          <button
            type="button"
            className={`${styles.button} ${styles.iconButton}`}
            aria-label="Next vertex"
            onClick={() =>
              setVertex((Math.min(vertex, mesh.positions.length - 1) + 1) % mesh.positions.length)
            }
          >
            ›
          </button>
        </div>
        <ol className={styles.journey}>
          {stops.map(({ stage: name, values, out, link }, index) => (
            <li key={name}>
              <button
                type="button"
                className={styles.stop}
                aria-pressed={index === stage}
                onClick={() => {
                  setTouring(null);
                  setStage(index);
                  sound.playButton();
                }}
              >
                <span className={styles.stopName}>{STAGE_NAMES[name]}</span>
                <span className={styles.stopNumbers}>
                  {values.map((value, i) => (
                    <span
                      key={i}
                      data-out={out?.[i] ? "" : undefined}
                      data-link={link === i ? "" : undefined}
                    >
                      {value}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </Bay>

      <Bay head={`HOW IT GOT TO ${STAGE_NAMES[stageName]}`}>
        {stageName === "local" && (
          <>
            <div className={styles.equation}>
              <VectorColumn values={journey.local} label="AS STORED IN THE MESH" />
            </div>
            <Choice
              label="SHAPE"
              value={shape}
              options={(Object.keys(SHAPES) as ShapeName[]).map((value) => ({
                value,
                label: SHAPES[value].label,
              }))}
              onChange={(next) => {
                setShape(next);
                setVertex(0);
                sound.playButton();
              }}
            />
          </>
        )}
        {stageName === "world" && (
          <>
            <div className={styles.equation}>
              <MatrixGrid matrix={matrices.model} axes label="MODEL" />
              <span>×</span>
              <VectorColumn values={journey.local} label="LOCAL" />
              <span>=</span>
              <VectorColumn values={journey.world} label="WORLD" />
            </div>
            <div className={styles.sliders}>
              {(["X", "Y", "Z"] as const).map((name, axis) => (
                <Slider
                  key={name}
                  label={`MOVE ${name}`}
                  value={settings.position[axis]}
                  min={-4}
                  max={4}
                  step={0.1}
                  onChange={(value) => updatePosition(axis, value)}
                />
              ))}
              <Slider
                label="TURN"
                value={settings.yaw}
                min={-180}
                max={180}
                step={1}
                format={(v) => `${Math.round(v)}°`}
                onChange={(value) => update({ yaw: value })}
              />
              <Slider
                label="TIP"
                value={settings.pitch}
                min={-90}
                max={90}
                step={1}
                format={(v) => `${Math.round(v)}°`}
                onChange={(value) => update({ pitch: value })}
              />
              <Slider
                label="SIZE"
                value={settings.scale}
                min={0.25}
                max={2.5}
                step={0.05}
                onChange={(value) => update({ scale: value })}
              />
            </div>
          </>
        )}
        {stageName === "view" && (
          <>
            <div className={styles.equation}>
              <MatrixGrid matrix={matrices.view} axes label="VIEW" />
              <span>×</span>
              <VectorColumn values={journey.world} label="WORLD" />
              <span>=</span>
              <VectorColumn values={journey.view} label="CAMERA" />
            </div>
            <div className={styles.sliders}>
              <Slider
                label="CIRCLE"
                value={settings.cameraYaw}
                min={-180}
                max={180}
                step={1}
                format={(v) => `${Math.round(v)}°`}
                onChange={(value) => update({ cameraYaw: value })}
              />
              <Slider
                label="RAISE"
                value={settings.cameraPitch}
                min={-85}
                max={85}
                step={1}
                format={(v) => `${Math.round(v)}°`}
                onChange={(value) => update({ cameraPitch: value })}
              />
              <Slider
                label="BACK"
                value={settings.cameraDistance}
                min={1.5}
                max={14}
                step={0.1}
                onChange={(value) => update({ cameraDistance: value })}
              />
            </div>
          </>
        )}
        {stageName === "clip" && (
          <>
            <DivideDiagram
              points={tracked.map((point) => point.view)}
              picked={Math.min(vertex, tracked.length - 1)}
              fov={settings.fov}
              near={settings.near}
              far={settings.far}
            />
            <PlayBar
              button="PUSH AWAY"
              label="PUSHED"
              timeline={push}
              format={(t) => fixed(t < 1 ? Math.sin(t * Math.PI) * PUSH_DISTANCE : 0, 1)}
            />
            <div className={styles.equation}>
              <MatrixGrid matrix={matrices.projection} label="PROJECTION" />
              <span>×</span>
              <VectorColumn values={journey.view} label="CAMERA" />
              <span>=</span>
              <VectorColumn values={journey.clip} label="CLIP" />
            </div>
            <dl className={styles.counts}>
              <div>
                <dt>INSIDE: ALL WITHIN ±W</dt>
                <dd className={journey.inside ? undefined : styles.alert}>
                  {journey.inside ? "YES" : "NO"}
                </dd>
              </div>
              <div>
                <dt>TRIANGLES CUT</dt>
                <dd>{frame.stats.clipped}</dd>
              </div>
              <div>
                <dt>OF THOSE, GONE</dt>
                <dd>{frame.stats.outside}</dd>
              </div>
            </dl>
            <div className={styles.sliders}>
              <Slider
                label="FOV"
                value={settings.fov}
                min={15}
                max={120}
                step={1}
                format={(v) => `${Math.round(v)}°`}
                onChange={(value) => update({ fov: value })}
              />
              <Slider
                label="NEAR"
                value={settings.near}
                min={0.1}
                max={6}
                step={0.1}
                onChange={(value) => update({ near: value })}
              />
              <Slider
                label="FAR"
                value={settings.far}
                min={6.5}
                max={30}
                step={0.5}
                onChange={(value) => update({ far: value })}
              />
            </div>
            <details>
              <summary>MODEL × VIEW × PROJECTION</summary>
              <MatrixGrid matrix={modelViewProjection(matrices)} />
            </details>
          </>
        )}
        {stageName === "ndc" && (
          <>
            <DivideDiagram
              points={tracked.map((point) => point.view)}
              picked={Math.min(vertex, tracked.length - 1)}
              fov={settings.fov}
              near={settings.near}
              far={settings.far}
            />
            <PlayBar
              button="PUSH AWAY"
              label="PUSHED"
              timeline={push}
              format={(t) => fixed(t < 1 ? Math.sin(t * Math.PI) * PUSH_DISTANCE : 0, 1)}
            />
            {journey.ndc ? (
              <ol className={styles.work}>
                <li>
                  x = {fixed(journey.clip[0])} ÷ {fixed(journey.clip[3])} = {fixed(journey.ndc[0])}
                </li>
                <li>
                  y = {fixed(journey.clip[1])} ÷ {fixed(journey.clip[3])} = {fixed(journey.ndc[1])}
                </li>
                <li>
                  z = {fixed(journey.clip[2])} ÷ {fixed(journey.clip[3])} = {fixed(journey.ndc[2])}
                </li>
              </ol>
            ) : (
              <p className={styles.alert}>BEHIND THE CAMERA · W = {fixed(journey.clip[3])}</p>
            )}
            <div className={styles.sliders}>
              <Slider
                label="FOV"
                value={settings.fov}
                min={15}
                max={120}
                step={1}
                format={(v) => `${Math.round(v)}°`}
                onChange={(value) => update({ fov: value })}
              />
            </div>
          </>
        )}
        {stageName === "screen" && (
          <>
            {journey.ndc && journey.screen ? (
              <div className={styles.equation}>
                <MatrixGrid matrix={matrices.viewport} digits={1} label="VIEWPORT" />
                <span>×</span>
                <VectorColumn values={[...journey.ndc, 1]} label="NDC" />
                <span>=</span>
                <VectorColumn values={[...journey.screen, 1]} label="SCREEN" />
              </div>
            ) : (
              <p className={styles.alert}>BEHIND THE CAMERA · W = {fixed(journey.clip[3])}</p>
            )}
            <Resolution settings={settings} update={update} />
          </>
        )}
        {stageName === "pixels" && (
          <>
            <Resolution settings={settings} update={update} />
            <Choice
              label="BUFFER"
              value={buffer}
              options={[
                { value: "color", label: "COLOR" },
                { value: "depth", label: "DEPTH" },
              ]}
              onChange={(next) => {
                setBuffer(next);
                sound.playButton();
              }}
            />
            <div className={styles.choiceRow} style={{ alignItems: "center" }}>
              <button
                type="button"
                className={styles.button}
                aria-pressed={drawing}
                onClick={() => {
                  if (drawing) {
                    setDrawing(false);
                    return;
                  }
                  if (drawnFraction >= 1) setDrawnFraction(0);
                  setDrawing(true);
                }}
              >
                {drawing ? "PAUSE" : "DRAW"}
              </button>
              <button
                type="button"
                className={styles.button}
                aria-pressed={cull}
                onClick={() => setCull(!cull)}
              >
                CULL BACKS
              </button>
              <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                <Slider
                  label="DRAWN"
                  value={drawnFraction}
                  min={0}
                  max={1}
                  step={0.001}
                  format={(v) => String(Math.round(v * frame.total))}
                  onChange={(value) => {
                    setDrawnFraction(value);
                    setDrawing(false);
                  }}
                />
              </div>
            </div>
            <dl className={styles.counts}>
              <div>
                <dt>TRIANGLES</dt>
                <dd>{frame.stats.triangles}</dd>
              </div>
              <div>
                <dt>CULLED</dt>
                <dd>{frame.stats.culled}</dd>
              </div>
              <div>
                <dt>FRAGMENTS</dt>
                <dd>{frame.stats.fragments}</dd>
              </div>
              <div>
                <dt>FAILED DEPTH</dt>
                <dd>{frame.stats.depthRejected}</dd>
              </div>
            </dl>
            {probe && (
              <ol className={styles.work}>
                <li>
                  PIXEL {probe.x}, {probe.y}
                </li>
                {frame.found ? (
                  <>
                    <li>
                      TRIANGLE {frame.found.triangle} ·{" "}
                      {mesh.triangles[frame.found.triangle].join(" ")}
                    </li>
                    <li>
                      WEIGHTS {frame.found.weights.map((weight) => fixed(weight)).join(" + ")} = 1
                    </li>
                    <li>DEPTH {fixed(frame.found.depth, 4)}</li>
                    <li>
                      COLOR {frame.found.color.map((c) => Math.round(c)).join(" ")}{" "}
                      <i
                        className={styles.swatch}
                        style={{
                          background: `rgb(${frame.found.color.map(Math.round).join(",")})`,
                        }}
                      />
                    </li>
                  </>
                ) : (
                  <li>NOTHING HERE</li>
                )}
              </ol>
            )}
          </>
        )}
      </Bay>
    </GraphicsPanel>
  );
}

function Resolution({
  settings,
  update,
}: {
  settings: PipelineSettings;
  update: (change: Partial<PipelineSettings>) => void;
}) {
  return (
    <Choice
      label="SCREEN"
      value={settings.width}
      options={RESOLUTIONS.map(([width, height]) => ({
        value: width,
        label: `${width}×${height}`,
      }))}
      onChange={(width) => {
        const found = RESOLUTIONS.find(([candidate]) => candidate === width);
        if (found) update({ width: found[0], height: found[1] });
      }}
    />
  );
}
