import { useEffect, useMemo, useRef, useState } from "react";
import { cross, dot, radians, subtract, type Vec3 } from "src/lib/computer/graphics/matrix";
import { renderModel, toPixels } from "src/lib/computer/graphics/modelRender";
import { Framebuffer } from "src/lib/computer/graphics/rasterizer";
import { sceneCamera } from "src/lib/computer/graphics/sceneDrawing";
import {
  automaticWeights,
  axisAngle,
  bonePosition,
  multiplyQuaternions,
  type Pose,
  paintWeight,
  restPose,
  samplePose,
  skinMatrices,
  skinPositions,
  smoothWeights,
  vertexNeighbours,
  worldMatrices,
} from "src/lib/computer/graphics/skeleton";
import styles from "./Graphics.module.css";
import {
  Bay,
  Choice,
  fixed,
  GraphicsPanel,
  PixelCanvas,
  Slider,
  Toggle,
  useAnimation,
} from "./GraphicsParts";
import { useTrex } from "./useModels";

const WIDTH = 480;
const HEIGHT = 360;

type Tool = "orbit" | "add" | "remove" | "smooth";
const TOOLS: readonly { value: Tool; label: string }[] = [
  { value: "orbit", label: "LOOK" },
  { value: "add", label: "ADD" },
  { value: "remove", label: "REMOVE" },
  { value: "smooth", label: "SMOOTH" },
];

/** The T. rex, its bones and its weights: paint with a brush and watch the mesh follow. */
export function WeightPaint() {
  const model = useTrex();
  const [bone, setBone] = useState(26);
  const [tool, setTool] = useState<Tool>("orbit");
  const [radius, setRadius] = useState(26);
  const [strength, setStrength] = useState(0.35);
  const [showHeat, setShowHeat] = useState(true);
  const [walking, setWalking] = useState(false);
  const [time, setTime] = useState(0);
  const [turns, setTurns] = useState<Record<number, number>>({ 26: 35 });
  const [yaw, setYaw] = useState(60);
  const [pitch, setPitch] = useState(12);
  const [version, setVersion] = useState(0);
  const [probe, setProbe] = useState<number | null>(null);
  const weights = useRef<Float32Array | null>(null);
  const framebuffer = useMemo(() => new Framebuffer(WIDTH, HEIGHT), []);
  const onScreen = useRef<ReturnType<typeof toPixels>[]>([]);

  useEffect(() => {
    if (model && !weights.current) {
      weights.current = model.weights.slice();
      setVersion((v) => v + 1);
    }
  }, [model]);

  useAnimation(walking, (seconds) => setTime((t) => t + seconds));

  const neighbours = useMemo(
    () => (model ? vertexNeighbours(model.mesh.positions.length, model.mesh.triangles) : []),
    [model],
  );

  const boneCount = model?.skeleton.names.length ?? 0;
  const camera = sceneCamera(yaw, pitch, 6.4, [0, 0, 0], WIDTH, HEIGHT, 35);

  const scene = useMemo(() => {
    if (!model || !weights.current) return null;
    const { skeleton, clips } = model;
    const base: Pose =
      walking && clips.Walk ? samplePose(clips.Walk, boneCount, time) : restPose(skeleton);
    const rotations = base.rotations.map((rotation, i) =>
      turns[i] ? multiplyQuaternions(rotation, axisAngle([1, 0, 0], radians(turns[i]))) : rotation,
    );
    const world = worldMatrices(skeleton, { rotations, translations: base.translations });
    const skin = skinMatrices(skeleton, world);
    const positions = skinPositions(model.mesh.positions, weights.current, boneCount, skin);
    return { positions, world };
  }, [model, boneCount, walking, time, turns, version]);

  if (scene && model) {
    const table = weights.current as Float32Array;
    renderModel(
      framebuffer,
      camera.viewProjection,
      camera.eye,
      scene.positions,
      model.mesh.triangles,
      model.mesh.faceColors,
      showHeat ? (vertex) => table[vertex * boneCount + bone] : undefined,
    );
    onScreen.current = scene.positions.map((p) =>
      toPixels(camera.viewProjection, p, WIDTH, HEIGHT),
    );
  } else {
    framebuffer.clear([10, 12, 18]);
  }

  const brush = (x: number, y: number) => {
    const table = weights.current;
    if (!table || !model) return;
    onScreen.current.forEach((p, vertex) => {
      const distance = Math.hypot(p.x - x, p.y - y);
      if (distance > radius || p.w <= 0) return;
      const px = Math.floor(p.x);
      const py = Math.floor(p.y);
      if (px < 0 || py < 0 || px >= WIDTH || py >= HEIGHT) return;
      // Only what the brush can see: nothing through the far side of the body.
      if (p.depth > framebuffer.depth[py * WIDTH + px] + 0.004) return;
      const amount = strength * (1 - distance / radius);
      if (tool === "smooth") smoothWeights(table, boneCount, vertex, neighbours[vertex], amount);
      else paintWeight(table, boneCount, vertex, bone, tool === "add" ? amount : -amount);
    });
    setVersion((v) => v + 1);
  };

  const pickVertex = (x: number, y: number) => {
    let best: number | null = null;
    let bestDistance = 14;
    onScreen.current.forEach((p, vertex) => {
      const distance = Math.hypot(p.x - x, p.y - y);
      const px = Math.floor(p.x);
      const py = Math.floor(p.y);
      if (distance >= bestDistance || px < 0 || py < 0 || px >= WIDTH || py >= HEIGHT) return;
      if (p.depth > framebuffer.depth[py * WIDTH + px] + 0.004) return;
      bestDistance = distance;
      best = vertex;
    });
    setProbe(best);
  };

  const startFrom = (name: "artist" | "automatic" | "nearest") => {
    if (!model) return;
    if (name === "artist") weights.current = model.weights.slice();
    else {
      weights.current = automaticWeights(
        model.mesh.positions,
        model.skeleton,
        name === "nearest" ? 40 : 5,
      );
    }
    setVersion((v) => v + 1);
  };

  const influences = useMemo(() => {
    if (probe === null || !weights.current || !model) return [];
    const table = weights.current;
    return model.skeleton.names
      .map((name, b) => ({ name, bone: b, weight: table[probe * boneCount + b] }))
      .filter(({ weight }) => weight >= 0.005)
      .sort((p, q) => q.weight - p.weight);
  }, [probe, model, boneCount, version]);

  const boneOverlay =
    scene && model
      ? model.skeleton.parents.map((parent, i) => {
          const at = toPixels(camera.viewProjection, bonePosition(scene.world[i]), WIDTH, HEIGHT);
          const from =
            parent < 0
              ? at
              : toPixels(camera.viewProjection, bonePosition(scene.world[parent]), WIDTH, HEIGHT);
          return { i, at, from };
        })
      : [];

  const faceCount = model?.mesh.triangles.length ?? 0;
  const facing = useMemo(() => {
    if (probe === null || !scene || !model) return null;
    const triangle = model.mesh.triangles.find((t) => t.includes(probe));
    if (!triangle) return null;
    const [a, b, c] = triangle.map((i) => scene.positions[i]);
    const normal = cross(subtract(b, a), subtract(c, a));
    return dot(normal, subtract(camera.eye as Vec3, a)) > 0;
  }, [probe, scene, model, camera.eye]);

  const probeAt = probe !== null ? onScreen.current[probe] : null;

  return (
    <GraphicsPanel title="WEIGHT PAINTING">
      <Bay>
        <PixelCanvas
          framebuffer={framebuffer}
          blocky={false}
          label={`A T. rex with ${faceCount} triangles, coloured by how much the ${model?.skeleton.names[bone] ?? ""} bone moves each vertex.`}
          stroke={tool === "orbit" ? undefined : (x, y) => brush(x, y)}
          onDrag={(dx, dy) => {
            setYaw((value) => value - dx * 0.5);
            setPitch((value) => Math.max(-85, Math.min(85, value + dy * 0.5)));
          }}
          onTap={pickVertex}
        >
          <svg className={styles.overlay} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
            {boneOverlay.map(({ i, at, from }) => (
              <g key={i}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={at.x}
                  y2={at.y}
                  stroke={i === bone ? "#fff" : "#ffffff66"}
                  strokeWidth={i === bone ? 2.5 : 1}
                />
                <circle
                  cx={at.x}
                  cy={at.y}
                  r={i === bone ? 4 : 2}
                  fill={i === bone ? "#fff" : "#ffffffa0"}
                />
              </g>
            ))}
            {probeAt && facing !== null && (
              <circle
                cx={probeAt.x}
                cy={probeAt.y}
                r={5}
                fill="none"
                stroke="#fff"
                strokeWidth={2}
              />
            )}
          </svg>
        </PixelCanvas>
        <Choice
          label="BRUSH"
          value={tool}
          options={TOOLS}
          onChange={(next) => {
            setTool(next);
          }}
        />
        {tool !== "orbit" && (
          <div className={styles.sliders}>
            <Slider
              label="SIZE"
              value={radius}
              min={6}
              max={70}
              step={1}
              format={(v) => String(v)}
              onChange={setRadius}
            />
            <Slider
              label="STRENGTH"
              value={strength}
              min={0.02}
              max={1}
              step={0.01}
              onChange={setStrength}
            />
          </div>
        )}
        <fieldset className={styles.choice}>
          <legend>SHOW</legend>
          <div className={styles.choiceRow}>
            <Toggle label="WEIGHTS" on={showHeat} onChange={setShowHeat} />
            <Toggle label="WALK" on={walking} onChange={setWalking} />
          </div>
        </fieldset>
      </Bay>

      <Bay head="BONE" aside={model?.skeleton.names[bone] ?? ""}>
        <div className={styles.chips}>
          {model?.skeleton.names.map((name, i) => (
            <button
              key={name}
              type="button"
              className={styles.button}
              aria-pressed={i === bone}
              onClick={() => {
                setBone(i);
              }}
            >
              {name}
            </button>
          ))}
        </div>
        <Slider
          label="TURN IT"
          value={turns[bone] ?? 0}
          min={-90}
          max={90}
          step={1}
          format={(v) => `${Math.round(v)}°`}
          onChange={(value) => setTurns({ ...turns, [bone]: value })}
        />
      </Bay>

      <Bay head="START FROM">
        <div className={styles.choiceRow}>
          <button type="button" className={styles.button} onClick={() => startFrom("artist")}>
            ARTIST'S
          </button>
          <button type="button" className={styles.button} onClick={() => startFrom("automatic")}>
            AUTOMATIC
          </button>
          <button type="button" className={styles.button} onClick={() => startFrom("nearest")}>
            NEAREST BONE ONLY
          </button>
        </div>
      </Bay>

      <Bay head="ONE VERTEX" aside={probe === null ? "—" : String(probe)}>
        {influences.length > 0 ? (
          <div className={styles.bars}>
            {influences.slice(0, 8).map(({ name, weight, bone: which }) => (
              <div key={which} className={styles.bar}>
                <span>{name}</span>
                <i>
                  <b
                    style={{
                      width: `${weight * 100}%`,
                      background: "linear-gradient(90deg, #38e1ff, #8b6cff)",
                    }}
                  />
                </i>
                <span>{fixed(weight)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.work}>—</p>
        )}
        <dl className={styles.counts}>
          <div>
            <dt>BONES ON IT</dt>
            <dd className={influences.length > 4 ? styles.alert : undefined}>
              {influences.length}
            </dd>
          </div>
          <div>
            <dt>SUM</dt>
            <dd>{fixed(influences.reduce((sum, { weight }) => sum + weight, 0))}</dd>
          </div>
        </dl>
      </Bay>
    </GraphicsPanel>
  );
}
