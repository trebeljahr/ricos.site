import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  channelFormed,
  chargesAt,
  controlPaths,
  DEVICE_INFO,
  type Device,
  depletionBoxes,
  deviceLabels,
  deviceParts,
  electronPaths,
  gateCharges,
  holesPushed,
  type Material,
  type ModelLabel,
  pointAlong,
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
const ELECTRON = "#7ff0ff";
const MOVING = "#e2fdff";
const HOLE = "#ffdbe4";
const ION = "#3a1f2e";
const DEPLETED = "#ecdcc6";
const GATE_CHARGE = "#ff5a3c";
const CHANNEL_HOLES = new Color(MATERIAL_COLORS.channel);
const CHANNEL_PUSHED = new Color(DEPLETED);
const CHANNEL_OPEN = new Color("#5a9cff");
const GATE_IDLE = new Color(MATERIAL_COLORS.gate);
const GATE_FULL = new Color("#ff8a66");
const PER_ROUTE = 12;

export type GateView = "solid" | "glass" | "hidden";

/** Carriers on the move. None are drawn until the current is a visible share of the full one. */
function Flow({
  paths,
  rate,
  color,
  still,
}: {
  paths: Vec3[][];
  rate: number;
  color: string;
  still: boolean;
}) {
  const mesh = useRef<InstancedMesh>(null);
  const clock = useRef(0);
  const matrix = useMemo(() => new Matrix4(), []);
  const count = paths.length * PER_ROUTE;
  useFrame((_, delta) => {
    if (!mesh.current) return;
    // Below this share the golden-ratio test below shows none, so skip the work.
    mesh.current.visible = rate >= 0.01;
    if (!mesh.current.visible) return;
    if (!still) clock.current += delta * (0.05 + rate * 0.16);
    let index = 0;
    for (const path of paths)
      for (let i = 0; i < PER_ROUTE; i++, index++) {
        // Golden-ratio spacing thins a stream evenly as the rate falls.
        const shown = ((index + 1) * 0.618) % 1 < rate;
        const point = pointAlong(path, (clock.current + i / PER_ROUTE + index * 0.037) % 1);
        const scale = shown ? 1 : 0;
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
      <sphereGeometry args={[0.1, 10, 8]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </instancedMesh>
  );
}

const CAPACITY = 900;

function useInstances(points: readonly Vec3[]) {
  const mesh = useRef<InstancedMesh>(null);
  const matrix = useMemo(() => new Matrix4(), []);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    mesh.current.count = Math.min(points.length, CAPACITY);
    points.slice(0, CAPACITY).forEach(([x, y, z], index) => {
      matrix.makeTranslation(x, y, z);
      mesh.current?.setMatrixAt(index, matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [points, matrix]);
  return mesh;
}

/** Carriers at rest. They only change when the voltage does. */
function Dots({ points, radius, color }: { points: Vec3[]; radius: number; color: string }) {
  const mesh = useInstances(points);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, CAPACITY]} frustumCulled={false}>
      <sphereGeometry args={[radius, 8, 6]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </instancedMesh>
  );
}

function Bars({
  points,
  size,
  color,
}: {
  points: Vec3[];
  size: readonly [number, number, number];
  color: string;
}) {
  const mesh = useInstances(points);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, CAPACITY]} frustumCulled={false}>
      <boxGeometry args={[size[0], size[1], size[2]]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </instancedMesh>
  );
}

const MINUS = [0.15, 0.035, 0.05] as const;
const STEM = [0.035, 0.15, 0.05] as const;

/** Minus marks, and plus marks made from a second, upright bar. */
function Signs({ minus, plus, color }: { minus?: Vec3[]; plus?: Vec3[]; color: string }) {
  const bars = useMemo(() => [...(minus ?? []), ...(plus ?? [])], [minus, plus]);
  return (
    <>
      <Bars points={bars} size={MINUS} color={color} />
      {plus && <Bars points={plus} size={STEM} color={color} />}
    </>
  );
}

/** Eases to a device's view; a drag by the reader wins at once. */
function CameraRig({ goal, cancel }: { goal: Vec3; cancel: React.RefObject<boolean> }) {
  const camera = useThree((state) => state.camera);
  // A wide stage can stand closer: the model's width is what has to fit.
  const aspect = useThree((state) => state.size.width / (state.size.height || 1));
  const near = Math.max(0.68, Math.min(0.92, 1.15 / aspect));
  const target = useRef(new Vector3(...goal));
  const moving = useRef(false);
  useEffect(() => {
    target.current.set(goal[0] * near, goal[1] * near, goal[2] * near);
    moving.current = true;
    cancel.current = false;
  }, [goal, near, cancel]);
  useFrame(() => {
    if (!moving.current || cancel.current) return;
    camera.position.lerp(target.current, 0.12);
    if (camera.position.distanceTo(target.current) < 0.02) moving.current = false;
  });
  return null;
}

const STICK = 20;
const ORBIT_Y = 0.2;

/** Moves each label onto its part in the frame loop, without going through React. */
function TagTracker({
  tags,
  labels,
  lift,
}: {
  tags: React.RefObject<(HTMLSpanElement | null)[]>;
  labels: readonly ModelLabel[];
  lift: number;
}) {
  const point = useMemo(() => new Vector3(), []);
  const toCamera = useMemo(() => new Vector3(), []);
  useFrame(({ camera, size }) => {
    labels.forEach(({ at, facing, stick }, index) => {
      const tag = tags.current[index];
      if (!tag) return;
      point.set(at[0], at[1] + lift, at[2]);
      if (facing) {
        toCamera.copy(camera.position).sub(point);
        const away = toCamera.x * facing[0] + toCamera.y * facing[1] + toCamera.z * facing[2] < 0;
        if ((tag.dataset.away === "true") !== away) tag.dataset.away = String(away);
      }
      point.project(camera);
      const x = ((point.x + 1) / 2) * size.width;
      const y = ((1 - point.y) / 2) * size.height - (stick ? STICK : 0);
      tag.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    });
  });
  return null;
}

export default function TransistorAnatomyScene({
  device,
  volts,
  gateView,
  rate,
  controlRate,
  still,
  visible,
}: {
  device: Device;
  volts: number;
  gateView: GateView;
  rate: number;
  controlRate: number;
  still: boolean;
  visible: boolean;
}) {
  const parts = useMemo(() => deviceParts(device), [device]);
  // Centres the model on the point the camera orbits, whatever its height.
  const lift = useMemo(() => {
    const bottom = Math.min(...parts.map((part) => part.box[2]));
    const top = Math.max(...parts.map((part) => part.box[3]));
    return ORBIT_Y - (bottom + top) / 2;
  }, [parts]);
  const paths = useMemo(() => electronPaths(device), [device]);
  const control = useMemo(() => controlPaths(device), [device]);
  const zones = useMemo(() => depletionBoxes(device, volts), [device, volts]);
  const charges = useMemo(() => chargesAt(device, volts), [device, volts]);
  const onGate = useMemo(() => gateCharges(device, volts), [device, volts]);
  const labels = useMemo(() => deviceLabels(device, volts), [device, volts]);
  const channel = useMemo(() => {
    const formed = channelFormed(device, volts);
    return formed > 0
      ? CHANNEL_PUSHED.clone().lerp(CHANNEL_OPEN, formed)
      : CHANNEL_HOLES.clone().lerp(CHANNEL_PUSHED, holesPushed(device, volts));
  }, [device, volts]);
  const gateColor = useMemo(() => GATE_IDLE.clone().lerp(GATE_FULL, volts), [volts]);
  const dragging = useRef(false);
  const tags = useRef<(HTMLSpanElement | null)[]>([]);
  const goal = DEVICE_INFO[device].camera;
  return (
    <>
      <Canvas
        camera={{ position: [...goal], fov: 34 }}
        dpr={[1, 2]}
        frameloop={visible ? "always" : "never"}
        style={{ touchAction: "pan-y" }}
      >
        <color attach="background" args={["#10131b"]} />
        <hemisphereLight args={["#ffffff", "#30384a", 1.3]} />
        <directionalLight position={[6, 10, 8]} intensity={2} />
        <directionalLight position={[-8, 3, -6]} intensity={0.6} />
        <group position={[0, lift, 0]}>
          {parts.map((part) => {
            if (part.gate && gateView === "hidden") return null;
            const [x0, x1, y0, y1, z0, z1] = part.box;
            const glass = part.gate && gateView === "glass";
            const oxide = part.material === "oxide";
            const plate = part.material === "gate";
            const isChannel = part.material === "channel";
            return (
              <mesh key={part.id} position={[(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]}>
                <boxGeometry args={[x1 - x0, y1 - y0, z1 - z0]} />
                <meshStandardMaterial
                  color={isChannel ? channel : plate ? gateColor : MATERIAL_COLORS[part.material]}
                  emissive={isChannel ? channel : plate ? gateColor : "#000000"}
                  emissiveIntensity={
                    isChannel ? channelFormed(device, volts) * 0.5 : plate ? volts * 0.35 : 0
                  }
                  roughness={part.material === "metal" ? 0.35 : 0.65}
                  metalness={part.material === "metal" ? 0.7 : 0.05}
                  transparent={glass || oxide}
                  opacity={glass ? 0.24 + volts * 0.08 : oxide ? 0.3 : 1}
                  depthWrite={!glass && !oxide}
                />
              </mesh>
            );
          })}
          {zones.map(([x0, x1, y0, y1, z0, z1], index) => (
            <mesh
              // biome-ignore lint/suspicious/noArrayIndexKey: a zone is known by its place in the list
              key={index}
              position={[(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]}
            >
              <boxGeometry args={[x1 - x0, y1 - y0, z1 - z0]} />
              <meshStandardMaterial color={DEPLETED} roughness={0.9} />
            </mesh>
          ))}
          <Dots key={`e-${device}`} points={charges.electrons} radius={0.07} color={ELECTRON} />
          <Dots key={`h-${device}`} points={charges.holes} radius={0.06} color={HOLE} />
          <Signs key={`i-${device}`} minus={charges.negative} plus={charges.positive} color={ION} />
          {gateView !== "hidden" && <Signs key={`g-${device}`} plus={onGate} color={GATE_CHARGE} />}
          <Flow paths={paths} rate={rate} color={MOVING} still={still} />
          <Flow paths={control} rate={controlRate} color={HOLE} still={still} />
        </group>
        <CameraRig goal={goal} cancel={dragging} />
        <TagTracker tags={tags} labels={labels} lift={lift} />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          target={[0, ORBIT_Y, 0]}
          onStart={() => {
            dragging.current = true;
          }}
        />
      </Canvas>
      {labels.map(({ text, stick, terminal, minor, hidden }, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: a label's text changes with the voltage, its slot does not
          key={`${device}-${index}`}
          ref={(node) => {
            tags.current[index] = node;
          }}
          className={styles.partTag}
          data-kind={terminal ? "terminal" : "part"}
          data-minor={minor || undefined}
          data-stick={stick || undefined}
          data-hidden={hidden || undefined}
        >
          {text}
        </span>
      ))}
    </>
  );
}
