import { useMemo, useState } from "react";
import { renderModel, toPixels } from "src/lib/computer/graphics/modelRender";
import { Framebuffer } from "src/lib/computer/graphics/rasterizer";
import { sceneCamera } from "src/lib/computer/graphics/sceneDrawing";
import {
  bonePosition,
  type Interpolation,
  keyAngle,
  samplePose,
  skinMatrices,
  skinPositions,
  worldMatrices,
} from "src/lib/computer/graphics/skeleton";
import styles from "./Graphics.module.css";
import {
  Bay,
  Choice,
  fixed,
  GraphicsPanel,
  MatrixGrid,
  PixelCanvas,
  Slider,
  Toggle,
  useAnimation,
} from "./GraphicsParts";
import { useTrex } from "./useModels";

const WIDTH = 480;
const HEIGHT = 360;
const GRAPH_WIDTH = 520;
const GRAPH_HEIGHT = 120;
const KEEP = [1, 2, 4, 8] as const;

/** A clip of keyframes on the T. rex: keys, the pose between them, the matrices, the mesh. */
export function SkeletonPlayer() {
  const model = useTrex();
  const [clipName, setClipName] = useState("Walk");
  const [time, setTime] = useState(0.3);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [keepEvery, setKeepEvery] = useState<(typeof KEEP)[number]>(1);
  const [interpolation, setInterpolation] = useState<Interpolation>("linear");
  const [showMesh, setShowMesh] = useState(true);
  const [showBones, setShowBones] = useState(true);
  const [bone, setBone] = useState(7);
  const [yaw, setYaw] = useState(62);
  const [pitch, setPitch] = useState(10);
  const framebuffer = useMemo(() => new Framebuffer(WIDTH, HEIGHT), []);

  useAnimation(playing, (seconds) => setTime((t) => t + seconds * speed));

  const clip = model?.clips[clipName];
  const boneCount = model?.skeleton.names.length ?? 0;
  const moment = clip ? time % clip.duration : 0;
  const camera = sceneCamera(yaw, pitch, 6.4, [0, 0, 0], WIDTH, HEIGHT, 35);

  const scene = useMemo(() => {
    if (!model || !clip) return null;
    const pose = samplePose(clip, boneCount, moment, keepEvery, interpolation);
    const world = worldMatrices(model.skeleton, pose);
    const skin = skinMatrices(model.skeleton, world);
    return {
      pose,
      world,
      skin,
      positions: skinPositions(model.mesh.positions, model.weights, boneCount, skin),
    };
  }, [model, clip, boneCount, moment, keepEvery, interpolation]);

  if (scene && model && showMesh) {
    renderModel(
      framebuffer,
      camera.viewProjection,
      camera.eye,
      scene.positions,
      model.mesh.triangles,
      model.mesh.faceColors,
    );
  } else {
    framebuffer.clear([10, 12, 18]);
  }

  const graph = useMemo(() => {
    if (!model || !clip) return null;
    const { skeleton } = model;
    const toX = (seconds: number) => 10 + (seconds / clip.duration) * (GRAPH_WIDTH - 20);
    const all = Array.from({ length: clip.frames }, (_, f) => keyAngle(clip, skeleton, f, bone));
    const peak = Math.max(4, ...all);
    const toY = (degrees: number) => GRAPH_HEIGHT - 10 - (degrees / peak) * (GRAPH_HEIGHT - 20);
    const last = clip.frames - 1;
    const kept: number[] = [];
    for (let f = 0; f <= last; f += keepEvery) kept.push(f);
    if (kept[kept.length - 1] !== last) kept.push(last);
    const secondsOf = (frame: number) => (frame / last) * clip.duration;
    const points = kept.flatMap((frame, i) => {
      const here = `${toX(secondsOf(frame)).toFixed(1)},${toY(all[frame]).toFixed(1)}`;
      if (interpolation === "linear" || i === kept.length - 1) return [here];
      return [here, `${toX(secondsOf(kept[i + 1])).toFixed(1)},${toY(all[frame]).toFixed(1)}`];
    });
    return {
      toX,
      original: all
        .map((degrees, f) => `${toX(secondsOf(f)).toFixed(1)},${toY(degrees).toFixed(1)}`)
        .join(" "),
      line: points.join(" "),
      dots: kept.map((frame) => ({ frame, x: toX(secondsOf(frame)), y: toY(all[frame]) })),
    };
  }, [model, clip, bone, keepEvery, interpolation]);

  const overlay =
    scene && model && showBones
      ? model.skeleton.parents.map((parent, i) => {
          const at = toPixels(camera.viewProjection, bonePosition(scene.world[i]), WIDTH, HEIGHT);
          const from =
            parent < 0
              ? at
              : toPixels(camera.viewProjection, bonePosition(scene.world[parent]), WIDTH, HEIGHT);
          return { i, at, from };
        })
      : [];

  const rotation = scene?.pose.rotations[bone];
  const keyCount = clip ? Math.ceil((clip.frames - 1) / keepEvery) + 1 : 0;

  return (
    <GraphicsPanel title="ANIMATING A SKELETON">
      <Bay>
        <PixelCanvas
          framebuffer={framebuffer}
          blocky={false}
          label={`A T. rex playing its ${clipName} animation.`}
          onDrag={(dx, dy) => {
            setYaw((value) => value - dx * 0.5);
            setPitch((value) => Math.max(-85, Math.min(85, value + dy * 0.5)));
          }}
        >
          <svg className={styles.overlay} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
            {overlay.map(({ i, at, from }) => (
              <g key={i}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={at.x}
                  y2={at.y}
                  stroke={i === bone ? "#38e1ff" : "#ffffff99"}
                  strokeWidth={i === bone ? 3 : 1.4}
                />
                <circle
                  cx={at.x}
                  cy={at.y}
                  r={i === bone ? 5 : 2.5}
                  fill={i === bone ? "#38e1ff" : "#fff"}
                />
              </g>
            ))}
          </svg>
        </PixelCanvas>
        <div className={styles.choiceRow} style={{ alignItems: "center" }}>
          <button
            type="button"
            className={styles.button}
            aria-pressed={playing}
            onClick={() => {
              setPlaying(!playing);
            }}
          >
            {playing ? "PAUSE" : "PLAY"}
          </button>
          <div style={{ flex: "1 1 180px", minWidth: 0 }}>
            <Slider
              label="TIME"
              value={moment}
              min={0}
              max={clip?.duration ?? 1}
              step={0.005}
              format={(v) => `${fixed(v)}s`}
              onChange={(value) => {
                setTime(value);
                setPlaying(false);
              }}
            />
          </div>
        </div>
        <Slider
          label="SPEED"
          value={speed}
          min={0.05}
          max={2}
          step={0.05}
          format={(v) => `${fixed(v)}×`}
          onChange={setSpeed}
        />
        <Choice
          label="CLIP"
          value={clipName}
          options={Object.keys(model?.clips ?? { Walk: 0 }).map((value) => ({
            value,
            label: value.toUpperCase(),
          }))}
          onChange={(next) => {
            setClipName(next);
          }}
        />
        <fieldset className={styles.choice}>
          <legend>SHOW</legend>
          <div className={styles.choiceRow}>
            <Toggle label="MESH" on={showMesh} onChange={setShowMesh} />
            <Toggle label="BONES" on={showBones} onChange={setShowBones} />
          </div>
        </fieldset>
      </Bay>

      <Bay head="KEYFRAMES" aside={`${keyCount} KEYS`}>
        {graph && (
          <svg
            className={styles.diagram}
            viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
            role="img"
            aria-label={`How far the ${model?.skeleton.names[bone] ?? ""} bone turns over the clip.`}
          >
            <polyline
              points={graph.original}
              fill="none"
              stroke="#8fa3ff"
              strokeWidth={1}
              opacity={0.5}
              strokeDasharray="3 3"
            />
            <polyline points={graph.line} fill="none" stroke="#38e1ff" strokeWidth={2} />
            {graph.dots.map(({ frame, x, y }) => (
              <circle key={frame} cx={x} cy={y} r={3.5} fill="#fff" />
            ))}
            <line
              x1={graph.toX(moment)}
              x2={graph.toX(moment)}
              y1={0}
              y2={GRAPH_HEIGHT}
              stroke="#ffd166"
              strokeWidth={1.5}
            />
          </svg>
        )}
        <Choice
          label="KEEP EVERY"
          value={keepEvery}
          options={KEEP.map((value) => ({ value, label: `${value}` }))}
          onChange={(next) => {
            setKeepEvery(next);
          }}
        />
        <Choice
          label="BETWEEN"
          value={interpolation}
          options={[
            { value: "linear" as const, label: "BLEND" },
            { value: "step" as const, label: "HOLD" },
          ]}
          onChange={(next) => {
            setInterpolation(next);
          }}
        />
      </Bay>

      <Bay head="BONE" aside={model?.skeleton.names[bone] ?? ""}>
        <div className={styles.chips}>
          {model?.skeleton.names.map((name, i) => (
            <button
              key={name}
              type="button"
              className={styles.button}
              aria-pressed={i === bone}
              onClick={() => setBone(i)}
            >
              {name}
            </button>
          ))}
        </div>
      </Bay>

      {scene && model && rotation && (
        <Bay head="THIS FRAME · KEYS TO VERTICES">
          <ol className={styles.work}>
            <li>LOCAL ROTATION {rotation.map((value) => fixed(value)).join(" ")}</li>
          </ol>
          <div className={styles.equation}>
            <MatrixGrid matrix={scene.world[bone]} small axes label="WORLD" />
            <span>×</span>
            <MatrixGrid matrix={model.skeleton.inverseBind[bone]} small axes label="INVERSE BIND" />
            <span>=</span>
            <MatrixGrid matrix={scene.skin[bone]} small axes label="SKIN" />
          </div>
          <dl className={styles.counts}>
            <div>
              <dt>MATRICES A FRAME</dt>
              <dd>{boneCount}</dd>
            </div>
            <div>
              <dt>VERTICES SKINNED</dt>
              <dd>{model.mesh.positions.length.toLocaleString("en")}</dd>
            </div>
          </dl>
        </Bay>
      )}
    </GraphicsPanel>
  );
}
