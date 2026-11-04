import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  clipBox,
  controlPaths,
  DEVICE_INFO,
  type Device,
  deviceParts,
  deviceTerminals,
  electronPaths,
  keepsPoint,
  type Material,
  pointAlong,
  SLICE_CAMERAS,
  type Slice,
  showsElectron,
  type Vec3,
} from "src/lib/computer/transistorModels";
import { Color, type InstancedMesh, Matrix4, Vector3 } from "three";
import styles from "./Graphics.module.css";

export const MATERIAL_COLORS: Record<Material, string> = {
  n: "#3f7fe0",
  p: "#d0647f",
  oxide: "#e6eef5",
  gate: "#8e97a8",
  metal: "#d8b56a",
  channel: "#d0647f",
};
const CHANNEL_ON = new Color("#ffd54a");
const CHANNEL_OFF = new Color(MATERIAL_COLORS.channel);
const PER_ROUTE = 12;

export type GateView = "solid" | "glass" | "hidden";

function Flow({
  paths,
  rate,
  color,
  slice,
  still,
}: {
  paths: Vec3[][];
  rate: number;
  color: string;
  slice: Slice;
  still: boolean;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const clock = useRef(0);
  const matrix = useMemo(() => new Matrix4(), []);
  const count = paths.length * PER_ROUTE;
  useFrame((_, delta) => {
    if (!mesh.current) return;
    if (!still) clock.current += delta * (0.12 + rate * 0.18);
    let index = 0;
    for (const path of paths)
      for (let i = 0; i < PER_ROUTE; i++, index++) {
        // Golden-ratio spacing thins a stream evenly as the rate falls.
        const shown = (index * 0.618) % 1 < rate;
        const point = pointAlong(path, (clock.current + i / PER_ROUTE + index * 0.037) % 1);
        const scale = shown && showsElectron(point, slice) ? 1 : 0;
        matrix.makeScale(scale, scale, scale);
        matrix.setPosition(point[0], point[1], point[2]);
        mesh.current.setMatrixAt(index, matrix);
      }
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  if (!count) return null;
  return (
    <instancedMesh
      key={count}
      ref={mesh}
      args={[undefined, undefined, count]}
      frustumCulled={false}
    >
      <sphereGeometry args={[0.09, 12, 10]} />
      <meshBasicMaterial color={color} toneMapped={false} depthTest={false} transparent />
    </instancedMesh>
  );
}

/** Eases to a named view; a drag by the reader wins at once. */
function CameraRig({ goal, cancel }: { goal: Vec3; cancel: React.RefObject<boolean> }) {
  const camera = useThree((state) => state.camera);
  const target = useRef(new Vector3(...goal));
  const moving = useRef(false);
  useEffect(() => {
    target.current.set(...goal);
    moving.current = true;
    cancel.current = false;
  }, [goal, cancel]);
  useFrame(() => {
    if (!moving.current || cancel.current) return;
    camera.position.lerp(target.current, 0.12);
    if (camera.position.distanceTo(target.current) < 0.02) moving.current = false;
  });
  return null;
}

const MODEL_LIFT = -0.6;

/** Moves each name tag over its terminal, in the frame loop rather than through React. */
function TagTracker({
  tags,
  anchors,
}: {
  tags: React.RefObject<(HTMLSpanElement | null)[]>;
  anchors: readonly Vec3[];
}) {
  const point = useMemo(() => new Vector3(), []);
  useFrame(({ camera, size }) => {
    anchors.forEach((anchor, index) => {
      const tag = tags.current[index];
      if (!tag) return;
      point.set(anchor[0], anchor[1] + MODEL_LIFT, anchor[2]).project(camera);
      const x = ((point.x + 1) / 2) * size.width;
      const y = ((1 - point.y) / 2) * size.height;
      tag.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    });
  });
  return null;
}

export default function TransistorAnatomyScene({
  device,
  slice,
  gateView,
  flow,
  controlFlow,
  still,
  visible,
}: {
  device: Device;
  slice: Slice;
  gateView: GateView;
  flow: number;
  controlFlow: number;
  still: boolean;
  visible: boolean;
}) {
  const parts = useMemo(() => deviceParts(device), [device]);
  // Rebuilding routes only as flow crosses a coarse step keeps particle motion smooth.
  const flowStep = Math.round(flow * 10) / 10;
  const paths = useMemo(() => electronPaths(device, flowStep), [device, flowStep]);
  const control = useMemo(() => controlPaths(device), [device]);
  const channel = useMemo(() => CHANNEL_OFF.clone().lerp(CHANNEL_ON, flow), [flow]);
  const dragging = useRef(false);
  const tags = useRef<(HTMLSpanElement | null)[]>([]);
  const terminals = useMemo(() => deviceTerminals(device), [device]);
  const anchors = useMemo(() => terminals.map(({ at }) => at), [terminals]);
  const goal = slice === "none" ? DEVICE_INFO[device].camera : SLICE_CAMERAS[slice];
  return (
    <>
      <Canvas
        camera={{ position: [...DEVICE_INFO[device].camera], fov: 34 }}
        dpr={[1, 2]}
        frameloop={visible ? "always" : "never"}
        style={{ touchAction: "pan-y" }}
      >
        <color attach="background" args={["#10131b"]} />
        <hemisphereLight args={["#ffffff", "#30384a", 1.3]} />
        <directionalLight position={[6, 10, 8]} intensity={2} />
        <directionalLight position={[-8, 3, -6]} intensity={0.6} />
        <group position={[0, MODEL_LIFT, 0]}>
          {parts.map((part) => {
            const box = clipBox(part.box, slice);
            if (!box || (part.gate && gateView === "hidden")) return null;
            const [x0, x1, y0, y1, z0, z1] = box;
            const glass = part.gate && gateView === "glass";
            const oxide = part.material === "oxide";
            return (
              <mesh key={part.id} position={[(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]}>
                <boxGeometry args={[x1 - x0, y1 - y0, z1 - z0]} />
                <meshStandardMaterial
                  color={part.material === "channel" ? channel : MATERIAL_COLORS[part.material]}
                  emissive={part.material === "channel" ? CHANNEL_ON : "#000000"}
                  emissiveIntensity={part.material === "channel" ? flow * 0.8 : 0}
                  roughness={part.material === "metal" ? 0.35 : 0.65}
                  metalness={part.material === "metal" ? 0.7 : 0.05}
                  transparent={glass || oxide}
                  opacity={glass ? 0.12 : oxide ? 0.3 : 1}
                  depthWrite={!glass && !oxide}
                />
              </mesh>
            );
          })}
          <Flow paths={paths} rate={flow} color="#7ff0ff" slice={slice} still={still} />
          <Flow paths={control} rate={controlFlow} color="#ff9d4d" slice={slice} still={still} />
        </group>
        <CameraRig goal={goal} cancel={dragging} />
        <TagTracker tags={tags} anchors={anchors} />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          target={[0, 0.2, 0]}
          onStart={() => {
            dragging.current = true;
          }}
        />
      </Canvas>
      {terminals.map(({ name, at }, index) => (
        <span
          key={name}
          ref={(node) => {
            tags.current[index] = node;
          }}
          className={styles.partTag}
          data-hidden={!keepsPoint(at, slice) || (slice === "across" && at[0] < -2)}
        >
          {name}
        </span>
      ))}
    </>
  );
}
