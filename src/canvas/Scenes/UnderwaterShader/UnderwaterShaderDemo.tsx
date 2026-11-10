import { In } from "@components/dom/ThreeFiberLayout";
import { useUnderwaterContext } from "@contexts/UnderwaterContext";
import DolphinModel from "@r3f/AllModels/fish_pack/Dolphin";
import { useFish1 } from "@r3f/AllModels/fish_pack/Fish1";
import MantaRayModel from "@r3f/AllModels/fish_pack/Ray";
import Whale from "@r3f/AllModels/fish_pack/Whale";
import { useKelp } from "@r3f/AllModels/Kelp4";
import { PointerLockControls, Sky, useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { folder, Leva, useControls } from "leva";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BufferAttribute,
  type BufferGeometry,
  Color,
  CylinderGeometry,
  DodecahedronGeometry,
  DoubleSide,
  Euler,
  type Group,
  type InstancedMesh,
  MathUtils,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import CustomShaderMaterial from "three-custom-shader-material";
import type CustomShaderMaterialType from "three-custom-shader-material/vanilla";
import { mergeBufferGeometries } from "three-stdlib";
import { UnderwaterEffect, type UnderwaterEffectParams } from "./UnderwaterEffect";
import {
  CAMERA_VIEWPOINTS,
  type CameraViewpoint,
  evaluateWaveHeight,
  WATER_LEVEL,
  WATER_PRESETS,
  type WaterPresetKey,
} from "./waterPresets";

// ─── Shared Obstacle & Seabed Terrain Geometry Functions ────────

const OBSTACLE_COLUMNS = [
  { x: -12.2, z: -8.0, r: 2.8 }, // Stone arch left leg
  { x: 12.2, z: -8.0, r: 2.8 }, // Stone arch right leg
  { x: -22.0, z: -16.0, r: 6.2 }, // Sea stack spire 1
  { x: 24.0, z: -20.0, r: 6.8 }, // Sea stack spire 2
  { x: -11.0, z: 4.0, r: 1.8 },
  { x: 11.0, z: 4.0, r: 1.8 },
  { x: -14.0, z: -22.0, r: 2.0 },
  { x: 15.0, z: -24.0, r: 2.0 },
  { x: 0.0, z: -32.0, r: 2.5 },
  { x: -8.0, z: -36.0, r: 1.8 },
] as const;

function sampleSeabedHeight(x: number, z: number): number {
  const distCenter = Math.hypot(x * 0.85, (z - 8) * 0.9);
  const lagoonShelf = 31.2 - Math.min(18.5, Math.max(0.0, (distCenter - 16.0) * 0.32));

  const trenchCoord = (x + 28) * 0.55 + (z + 25) * 0.75;
  const trenchDrop = -15.5 * (1.0 - 1.0 / (1.0 + Math.exp(-trenchCoord * 0.08)));

  const ridge1 = Math.sin(x * 0.065 + Math.cos(z * 0.055) * 1.4) * 2.2;
  const ridge2 = Math.cos(z * 0.08 - x * 0.045) * 1.6;
  const ripples = Math.sin(x * 0.38 + z * 0.22) * 0.18 + Math.cos(z * 0.52 - x * 0.3) * 0.14;

  // Emergent sea-stack mounds at (-22, -16) and (24, -20)
  const dSpire1 = Math.hypot(x + 22, z + 16);
  const spire1 = 28.5 * Math.exp(-(dSpire1 * dSpire1) / 50.0);

  const dSpire2 = Math.hypot(x - 24, z + 20);
  const spire2 = 30.5 * Math.exp(-(dSpire2 * dSpire2) / 58.0);

  // Smooth reef knolls
  const dKnoll1 = Math.hypot(x - 14, z - 10);
  const knoll1 = 5.0 * Math.exp(-(dKnoll1 * dKnoll1) / 55.0);

  const dKnoll2 = Math.hypot(x + 15, z - 12);
  const knoll2 = 4.5 * Math.exp(-(dKnoll2 * dKnoll2) / 48.0);

  return Math.max(
    2.0,
    lagoonShelf + trenchDrop + ridge1 + ridge2 + ripples + spire1 + spire2 + knoll1 + knoll2,
  );
}

/**
 * Push any swimming creature away from pillars/sea-stacks/arch legs and keep it
 * strictly between `seabedHeight + minFloorClearance` and `WATER_LEVEL - minSurfaceClearance`.
 */
function resolveSwimmerPosition(
  x: number,
  y: number,
  z: number,
  minFloorClearance: number,
  minSurfaceClearance: number,
): [number, number, number] {
  let rx = x;
  let rz = z;

  for (const col of OBSTACLE_COLUMNS) {
    const dx = rx - col.x;
    const dz = rz - col.z;
    const dist = Math.hypot(dx, dz);
    const minDist = col.r + minFloorClearance * 0.85;
    if (dist < minDist && dist > 1e-4) {
      const push = (minDist - dist) / dist;
      rx += dx * push;
      rz += dz * push;
    }
  }

  // Sample local terrain maximum in a small neighborhood so wide fins never clip slopes
  const hCenter = sampleSeabedHeight(rx, rz);
  const hN = sampleSeabedHeight(rx, rz + 1.8);
  const hS = sampleSeabedHeight(rx, rz - 1.8);
  const hE = sampleSeabedHeight(rx + 1.8, rz);
  const hW = sampleSeabedHeight(rx - 1.8, rz);
  const maxFloor = Math.max(hCenter, hN, hS, hE, hW);

  const minY = maxFloor + minFloorClearance;
  const maxY = WATER_LEVEL - minSurfaceClearance;
  const ry = MathUtils.clamp(Math.max(y, minY), minY, Math.max(minY + 0.5, maxY));

  return [rx, ry, rz];
}

// ─── First-Person 6-DOF Fly Controller ──────────────────────────

function FirstPersonFlyController({
  speed = 14,
  activeViewpoint,
  onAltitudeChange,
}: {
  speed?: number;
  activeViewpoint: CameraViewpoint;
  onAltitudeChange: (signedFromSurface: number) => void;
}) {
  const [, getKeys] = useKeyboardControls();
  const { camera, gl } = useThree();
  const velocity = useRef(new Vector3());
  const moveDir = useRef(new Vector3());
  const forward = useRef(new Vector3());
  const right = useRef(new Vector3());
  const euler = useRef(new Euler(0, 0, 0, "YXZ"));
  const isDragging = useRef(false);
  const extraKeys = useRef({ up: false, down: false, boost: false });
  const lastReportTime = useRef(0);

  useEffect(() => {
    camera.position.set(...activeViewpoint.position);
    euler.current.set(activeViewpoint.rotation[0], activeViewpoint.rotation[1], 0, "YXZ");
    camera.quaternion.setFromEuler(euler.current);
    velocity.current.set(0, 0, 0);
  }, [activeViewpoint, camera]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "KeyE") extraKeys.current.up = true;
      if (e.code === "KeyQ" || e.code === "ControlLeft" || e.code === "ControlRight")
        extraKeys.current.down = true;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") extraKeys.current.boost = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyE") extraKeys.current.up = false;
      if (e.code === "KeyQ" || e.code === "ControlLeft" || e.code === "ControlRight")
        extraKeys.current.down = false;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") extraKeys.current.boost = false;
    };

    const canvas = gl.domElement;
    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 0 && document.pointerLockElement !== canvas) {
        isDragging.current = true;
      }
    };
    const onPointerUp = () => {
      isDragging.current = false;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current || document.pointerLockElement === canvas) return;
      euler.current.setFromQuaternion(camera.quaternion, "YXZ");
      euler.current.y -= e.movementX * 0.0032;
      euler.current.x = MathUtils.clamp(
        euler.current.x - e.movementY * 0.0032,
        -Math.PI * 0.48,
        Math.PI * 0.48,
      );
      camera.quaternion.setFromEuler(euler.current);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointermove", onPointerMove);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [camera, gl.domElement]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const keys = getKeys() as Record<string, boolean>;

    const fwdInput = (+Boolean(keys.forward) - +Boolean(keys.backward)) as number;
    const sideInput = (+Boolean(keys.rightward) - +Boolean(keys.leftward)) as number;
    const vertInput = (+Boolean(keys.jump || extraKeys.current.up) -
      +Boolean(keys.descend || extraKeys.current.down)) as number;
    const boost = keys.run || extraKeys.current.boost ? 2.6 : 1.0;

    camera.getWorldDirection(forward.current);
    right.current.crossVectors(forward.current, camera.up).normalize();

    moveDir.current.set(0, 0, 0);
    moveDir.current.addScaledVector(forward.current, fwdInput);
    moveDir.current.addScaledVector(right.current, sideInput);
    moveDir.current.y += vertInput;

    if (moveDir.current.lengthSq() > 0) {
      moveDir.current.normalize().multiplyScalar(speed * boost);
    }

    const damping = 1.0 - Math.exp(-9.5 * dt);
    velocity.current.lerp(moveDir.current, damping);
    camera.position.addScaledVector(velocity.current, dt);

    const floorY = sampleSeabedHeight(camera.position.x, camera.position.z);
    if (camera.position.y < floorY + 1.4) {
      camera.position.y = floorY + 1.4;
    }

    if (state.clock.elapsedTime - lastReportTime.current > 0.08) {
      lastReportTime.current = state.clock.elapsedTime;
      const waveY =
        WATER_LEVEL +
        evaluateWaveHeight(camera.position.x, camera.position.z, state.clock.elapsedTime);
      onAltitudeChange(camera.position.y - waveY);
    }
  });

  return <PointerLockControls selector="canvas" />;
}

// ─── Sculpted Seabed, Grand Stone Arch, Reef & Kelp ─────────────

const kelpVertexShader = /* glsl */ `
  uniform float uTime;
  varying float vHeightFrac;

  void main() {
    vec3 pos = position;
    vHeightFrac = clamp(pos.y / 260.0, 0.0, 1.0);
    float sway = sin(pos.y * 0.025 + uTime * 1.4 + instanceMatrix[3][0] * 0.2) * 14.0 * vHeightFrac;
    float swayZ = cos(pos.y * 0.02 + uTime * 1.1 + instanceMatrix[3][2] * 0.2) * 10.0 * vHeightFrac;
    pos.x += sway;
    pos.z += swayZ;
    csm_Position = pos;
  }
`;

const kelpFragmentShader = /* glsl */ `
  varying float vHeightFrac;
  void main() {
    vec3 baseCol = mix(vec3(0.07, 0.28, 0.16), vec3(0.32, 0.68, 0.22), vHeightFrac);
    csm_DiffuseColor = vec4(baseCol, 1.0);
  }
`;

function SwayingKelpForest() {
  const { geometry } = useKelp();
  const meshRef = useRef<InstancedMesh>(null!);
  const matRef = useRef<CustomShaderMaterialType | undefined>(undefined);

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  const placements = useMemo(() => {
    const items: { x: number; y: number; z: number; scale: number; rot: number }[] = [];
    for (let i = 0; i < 105; i++) {
      const angle = i * 2.3999632;
      const radius = 7 + Math.sqrt(i / 105) * 58;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius - 4;
      const y = sampleSeabedHeight(x, z);
      if (y > 10 && y < 35.5) {
        const sc = (0.042 + ((i * 17) % 10) * 0.0045) * (1.0 - (y - 10) * 0.012);
        items.push({ x, y: y - 0.35, z, scale: sc, rot: (i * 1.7) % (Math.PI * 2) });
      }
    }
    return items;
  }, []);

  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new Object3D();
    placements.forEach((p, i) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, p.rot, 0);
      dummy.scale.set(p.scale, p.scale * 1.25, p.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [placements]);

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, placements.length]}
      castShadow
      receiveShadow
      frustumCulled={false}
    >
      <CustomShaderMaterial
        ref={matRef}
        baseMaterial={MeshStandardMaterial}
        vertexShader={kelpVertexShader}
        fragmentShader={kelpFragmentShader}
        uniforms={uniforms}
        roughness={0.68}
        side={DoubleSide}
      />
    </instancedMesh>
  );
}

function SeabedAndArchitecture() {
  const terrainGeometry = useMemo(() => {
    const size = 680;
    const segs = 240;
    const geom = new PlaneGeometry(size, size, segs, segs);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    const normals = new Float32Array(pos.count * 3);
    const colors = new Float32Array(pos.count * 3);
    const sandColor = new Color("#dfd0ae");
    const coralSand = new Color("#c2b28e");
    const limestone = new Color("#667472");
    const deepBasalt = new Color("#22323e");
    const tempCol = new Color();

    const eps = 0.6;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = sampleSeabedHeight(x, z);
      pos.setY(i, y);

      // Analytical central-difference normal for smooth, non-faceted terrain shading
      const hXp = sampleSeabedHeight(x + eps, z);
      const hXm = sampleSeabedHeight(x - eps, z);
      const hZp = sampleSeabedHeight(x, z + eps);
      const hZm = sampleSeabedHeight(x, z - eps);

      const dx = (hXp - hXm) / (2 * eps);
      const dz = (hZp - hZm) / (2 * eps);
      const invLen = 1.0 / Math.hypot(dx, 1.0, dz);
      normals[i * 3] = -dx * invLen;
      normals[i * 3 + 1] = invLen;
      normals[i * 3 + 2] = -dz * invLen;

      const slope = Math.hypot(dx, dz);
      const depthFactor = MathUtils.clamp((y - 8) / 28, 0, 1);
      tempCol.lerpColors(deepBasalt, coralSand, depthFactor);
      if (y > 26 && slope < 0.32) {
        tempCol.lerp(sandColor, 0.6);
      }
      if (slope > 0.3 || y > 38) {
        tempCol.lerp(limestone, MathUtils.clamp((slope - 0.22) * 1.5, 0.3, 0.95));
      }

      colors[i * 3] = tempCol.r;
      colors[i * 3 + 1] = tempCol.g;
      colors[i * 3 + 2] = tempCol.b;
    }

    geom.setAttribute("normal", new BufferAttribute(normals, 3));
    geom.setAttribute("color", new BufferAttribute(colors, 3));
    return geom;
  }, []);

  // Temple colonnade pillars piercing the water surface and descending into the reef
  const pillars = useMemo(
    () => [
      { pos: [-11, 29, 4] as const, rTop: 1.15, h: 38 },
      { pos: [11, 28, 4] as const, rTop: 1.15, h: 38 },
      { pos: [-14, 24, -22] as const, rTop: 1.35, h: 48 },
      { pos: [15, 25, -24] as const, rTop: 1.25, h: 46 },
      { pos: [0, 32, -32] as const, rTop: 1.65, h: 40 },
      { pos: [-8, 16, -36] as const, rTop: 1.25, h: 26 },
    ],
    [],
  );

  // Sculpted organic reef boulders & table/branch coral formations (no smooth jellybean spheres!)
  const reefFormations = useMemo(() => {
    const list: {
      id: string;
      kind: "boulder" | "table" | "crown";
      pos: [number, number, number];
      rot: [number, number, number];
      scale: [number, number, number];
      color: string;
      emissive: string;
      emissiveIntensity: number;
    }[] = [];

    const palette = [
      { color: "#d96b78", emissive: "#b82840", glow: 0.25 },
      { color: "#e09f5a", emissive: "#b5651d", glow: 0.2 },
      { color: "#48b890", emissive: "#168060", glow: 0.3 },
      { color: "#4f8fc9", emissive: "#1c5a99", glow: 0.35 },
      { color: "#9c6ade", emissive: "#6236a8", glow: 0.32 },
    ];

    for (let i = 0; i < 44; i++) {
      const a = i * 2.39996;
      const r = 6 + Math.sqrt(i / 44) * 44;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r + 3;
      const y = sampleSeabedHeight(x, z);
      if (y < 38.5) {
        const pal = palette[i % palette.length];
        // Subtle bioluminescence only in the deep abyssal trench (y < 20)
        const depthGlowBoost = y < 20 ? 1.1 : 0.22;
        const sz = 0.65 + (i % 5) * 0.28;
        const kind = i % 3 === 0 ? "table" : i % 3 === 1 ? "crown" : "boulder";
        list.push({
          id: `reef-${i}`,
          kind,
          pos: [x, y + sz * 0.22, z],
          rot: [(i % 5) * 0.08 - 0.16, (i * 1.3) % (Math.PI * 2), ((i + 2) % 5) * 0.06 - 0.12],
          scale:
            kind === "table"
              ? [sz * 1.6, sz * 0.38, sz * 1.5]
              : kind === "crown"
                ? [sz * 0.95, sz * 0.85, sz * 0.95]
                : [sz * 1.35, sz * 0.75, sz * 1.15],
          color: kind === "boulder" ? "#6c7a76" : pal.color,
          emissive: kind === "boulder" ? "#000000" : pal.emissive,
          emissiveIntensity: kind === "boulder" ? 0 : pal.glow * depthGlowBoost,
        });
      }
    }
    return list;
  }, []);

  const archGeometry = useMemo(() => new TorusGeometry(12.2, 2.45, 20, 56, Math.PI), []);
  const columnGeometry = useMemo(() => new CylinderGeometry(1, 1.22, 1, 16), []);
  const craggyBoulderGeometry = useMemo(() => {
    const geom = new DodecahedronGeometry(1, 2);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const n =
        1.0 +
        0.18 * Math.sin(vx * 4.2 + vy * 3.1) +
        0.14 * Math.cos(vz * 4.7 - vx * 2.8) +
        0.08 * Math.sin(vy * 7.5 + vz * 5.2);
      pos.setXYZ(i, vx * n, vy * n, vz * n);
    }
    geom.computeVertexNormals();
    return geom;
  }, []);

  const coralCrownGeometry = useMemo(() => {
    const geom = new TorusGeometry(0.65, 0.28, 12, 24);
    geom.rotateX(Math.PI / 2);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const angle = Math.atan2(vz, vx);
      const ridge = 1.0 + 0.22 * Math.sin(angle * 9.0) + 0.12 * Math.cos(vy * 8.0);
      pos.setXYZ(i, vx * ridge, vy * (1.1 + 0.3 * Math.sin(angle * 5.0)), vz * ridge);
    }
    geom.computeVertexNormals();
    return geom;
  }, []);

  return (
    <group>
      {/* Sculpted Seabed Mesh */}
      <mesh geometry={terrainGeometry} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.92} metalness={0.02} />
      </mesh>

      {/* Grand Submerged / Surface-Piercing Stone Arch (z = -8) */}
      <mesh
        geometry={archGeometry}
        position={[0, 25.5, -8]}
        scale={[1.0, 1.22, 0.95]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#76827e" roughness={0.84} metalness={0.04} />
      </mesh>

      {/* Temple Colonnade Pillars */}
      {pillars.map((p) => (
        <mesh
          key={p.pos.join(",")}
          geometry={columnGeometry}
          position={p.pos}
          scale={[p.rTop, p.h, p.rTop]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#868d84" roughness={0.8} />
        </mesh>
      ))}

      {/* Sculpted Craggy Boulders, Table Corals & Fluted Reef Crowns */}
      {reefFormations.map((c) => (
        <mesh
          key={c.id}
          geometry={c.kind === "crown" ? coralCrownGeometry : craggyBoulderGeometry}
          position={c.pos}
          rotation={c.rot}
          scale={c.scale}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={c.color}
            emissive={c.emissive}
            emissiveIntensity={c.emissiveIntensity}
            roughness={0.72}
          />
        </mesh>
      ))}

      {/* Swaying Kelp Forest */}
      <SwayingKelpForest />
    </group>
  );
}

// ─── 3D Obstacle Wave-Crash Spray & Splash Plumes ───────────────
// Spawns dynamic airborne sea spray & splashing whitewater droplets where
// rolling waves collide with emergent sea stacks, stone arch legs, and pillars.

const SPRAY_ANCHORS = [
  { x: -12.2, z: -8.0, r: 2.3 }, // Arch left leg at waterline
  { x: 12.2, z: -8.0, r: 2.3 }, // Arch right leg at waterline
  { x: -22.0, z: -16.0, r: 4.8 }, // Sea stack 1 waterline
  { x: 24.0, z: -20.0, r: 5.2 }, // Sea stack 2 waterline
  { x: -11.0, z: 4.0, r: 1.3 }, // Pillar 1
  { x: 11.0, z: 4.0, r: 1.3 }, // Pillar 2
  { x: -14.0, z: -22.0, r: 1.5 }, // Pillar 3
  { x: 15.0, z: -24.0, r: 1.4 }, // Pillar 4
  { x: 0.0, z: -32.0, r: 1.8 }, // Pillar 5
] as const;

function ObstacleWaveSpray({ waveHeight }: { waveHeight: number }) {
  const sprayMeshRef = useRef<InstancedMesh>(null!);
  const dummy = useMemo(() => new Object3D(), []);
  const sprayCount = 240;

  const particles = useMemo(
    () =>
      Array.from({ length: sprayCount }, (_, i) => {
        const anchor = SPRAY_ANCHORS[i % SPRAY_ANCHORS.length];
        const angle = ((i * 1.6180339) % 1) * Math.PI * 2;
        return {
          anchor,
          angle,
          phaseOffset: (i / sprayCount) * 3.5,
          cycleDuration: 1.25 + (i % 7) * 0.16,
          outSpeed: 1.4 + (i % 5) * 0.45,
          upSpeed: 3.2 + (i % 6) * 0.65,
          baseSize: 0.14 + (i % 5) * 0.06,
        };
      }),
    [],
  );

  useFrame((state) => {
    if (!sprayMeshRef.current) return;
    const t = state.clock.elapsedTime;
    const waveScale = Math.max(0.3, waveHeight);

    for (let i = 0; i < sprayCount; i++) {
      const p = particles[i];
      const localTime = (t + p.phaseOffset) % p.cycleDuration;
      const life = localTime / p.cycleDuration; // 0..1

      const nx = Math.cos(p.angle);
      const nz = Math.sin(p.angle);
      const baseX = p.anchor.x + nx * p.anchor.r;
      const baseZ = p.anchor.z + nz * p.anchor.r;

      // Evaluate wave crest height at the obstacle impact point
      const waveY = WATER_LEVEL + evaluateWaveHeight(baseX, baseZ, t - localTime * 0.4, waveScale);
      const waveSurge = Math.max(0.25, (waveY - WATER_LEVEL) / waveScale + 0.65);

      // Ballistic splash trajectory: x(t) = r + v_out * dt, y(t) = waveY + v_up * dt - 0.5 * g * dt^2
      const radialDist = p.outSpeed * localTime * waveSurge;
      const px = baseX + nx * radialDist;
      const pz = baseZ + nz * radialDist;
      const py =
        waveY -
        0.15 +
        (p.upSpeed * localTime - 4.9 * localTime * localTime) *
          waveSurge *
          Math.min(1.4, waveScale);

      // Expand into mist plume then dissolve back into the surf
      const sizeEnv = Math.sin(life * Math.PI) * waveSurge * Math.min(1.3, waveScale);
      const sc = Math.max(0.001, p.baseSize * sizeEnv * (1.0 + life * 1.4));

      dummy.position.set(px, py, pz);
      dummy.scale.set(sc * 1.25, sc * 0.9, sc * 1.25);
      dummy.rotation.set(life * 2.0, p.angle, life * 1.5);
      dummy.updateMatrix();
      sprayMeshRef.current.setMatrixAt(i, dummy.matrix);
    }

    sprayMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={sprayMeshRef}
      args={[undefined, undefined, sprayCount]}
      frustumCulled={false}
    >
      <dodecahedronGeometry args={[1, 1]} />
      <meshStandardMaterial
        color="#f2fbff"
        emissive="#c4ecff"
        emissiveIntensity={0.35}
        roughness={0.35}
        transparent
        opacity={0.78}
      />
    </instancedMesh>
  );
}

// ─── Marine Life (Terrain-Aware Whale, Manta, Dolphin & 3D Fish Schools) ─

const fishSwimVertexShader = /* glsl */ `
  uniform float uTime;
  void main() {
    vec3 pos = position;
    // Lateral tail-fin swim oscillation along the fish body length (Z axis)
    float bodyCoord = pos.z;
    float wiggle = sin(uTime * 8.5 + bodyCoord * 2.2 + instanceMatrix[3][0] * 1.5) * 0.14;
    pos.x += wiggle * smoothstep(0.2, -1.2, bodyCoord);
    csm_Position = pos;
  }
`;

function SwimmingMarineLife() {
  const whaleGroupRef = useRef<Group>(null!);
  const manta1Ref = useRef<Group>(null!);
  const dolphinRef = useRef<Group>(null!);
  const schoolMeshRef = useRef<InstancedMesh>(null!);
  const fishMatRef = useRef<CustomShaderMaterialType | undefined>(undefined);

  const { nodes: fishNodes } = useFish1();

  // Merge real 3D Fish1 submeshes into a single instanced geometry
  const mergedFishGeometry = useMemo(() => {
    const geos = [
      fishNodes.Fish_1.geometry.clone(),
      fishNodes.Fish_2.geometry.clone(),
      fishNodes.Fish_3.geometry.clone(),
    ];
    const merged = mergeBufferGeometries(geos) as BufferGeometry;
    merged.rotateX(-Math.PI / 2);
    merged.scale(1.8, 1.8, 1.8);
    merged.computeVertexNormals();
    return merged;
  }, [fishNodes]);

  const fishUniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const fishCount = 150;
  const fishDummy = useMemo(() => new Object3D(), []);
  const fishColor = useMemo(() => new Color(), []);

  const fishData = useMemo(
    () =>
      Array.from({ length: fishCount }, (_, i) => ({
        school: i % 3,
        angleOffset: (i / fishCount) * Math.PI * 2 * 3,
        radiusOffset: 1.5 + ((i * 13) % 17) * 0.28,
        yOffset: (((i * 7) % 11) - 5) * 0.35,
        speed: 0.48 + ((i * 5) % 7) * 0.035,
        scale: 0.26 + (i % 4) * 0.05,
      })),
    [],
  );

  useEffect(() => {
    if (!schoolMeshRef.current) return;
    const palette = ["#ff9f1c", "#2ec4b6", "#ffbf69", "#38b6ff", "#ff6b8b"];
    for (let i = 0; i < fishCount; i++) {
      fishColor.set(palette[i % palette.length]);
      schoolMeshRef.current.setColorAt(i, fishColor);
    }
    if (schoolMeshRef.current.instanceColor) {
      schoolMeshRef.current.instanceColor.needsUpdate = true;
    }
  }, [fishColor]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (fishMatRef.current) {
      fishMatRef.current.uniforms.uTime.value = t;
    }

    // 1. Whale glides in the open water column with strict seabed & obstacle clearance
    if (whaleGroupRef.current) {
      const wAngle = t * 0.13;
      const rawX = Math.sin(wAngle) * 30;
      const rawZ = Math.sin(wAngle * 2) * 16 - 12;
      const rawY = 34.5 + Math.cos(wAngle * 2) * 2.5;

      const [wx, wy, wz] = resolveSwimmerPosition(rawX, rawY, rawZ, 5.2, 4.2);
      const nextAngle = wAngle + 0.05;
      const [nx, ny, nz] = resolveSwimmerPosition(
        Math.sin(nextAngle) * 30,
        34.5 + Math.cos(nextAngle * 2) * 2.5,
        Math.sin(nextAngle * 2) * 16 - 12,
        5.2,
        4.2,
      );

      const dx = nx - wx;
      const dy = ny - wy;
      const dz = nz - wz;
      const horizDist = Math.hypot(dx, dz) || 1e-4;

      whaleGroupRef.current.position.set(wx, wy, wz);
      whaleGroupRef.current.rotation.set(
        -Math.atan2(dy, horizDist) * 0.6,
        Math.atan2(dx, dz),
        -Math.sin(wAngle) * 0.1,
      );
    }

    // 2. Manta Ray banking above the reef shelf with terrain clearance
    if (manta1Ref.current) {
      const m1 = t * 0.28;
      const rawX = Math.cos(m1) * 15 - 3;
      const rawZ = Math.sin(m1) * 13 + 8;
      const rawY = 37.5 + Math.sin(m1 * 2) * 1.4;
      const [mx, my, mz] = resolveSwimmerPosition(rawX, rawY, rawZ, 3.2, 2.5);

      manta1Ref.current.position.set(mx, my, mz);
      manta1Ref.current.rotation.set(
        Math.cos(m1 * 2) * 0.1,
        Math.atan2(-Math.sin(m1) * 15, Math.cos(m1) * 13),
        0.16,
      );
    }

    // 3. Dolphin cruising through the lagoon
    if (dolphinRef.current) {
      const m2 = -t * 0.24 + 2.2;
      const rawX = Math.cos(m2) * 18 + 5;
      const rawZ = Math.sin(m2) * 16 - 2;
      const rawY = 36.0 + Math.cos(m2 * 2) * 1.6;
      const [dx, dy, dz] = resolveSwimmerPosition(rawX, rawY, rawZ, 3.0, 2.5);

      dolphinRef.current.position.set(dx, dy, dz);
      dolphinRef.current.rotation.set(
        -Math.sin(m2 * 2) * 0.1,
        Math.atan2(Math.sin(m2) * 18, -Math.cos(m2) * 16),
        -0.14,
      );
    }

    // 4. Swirling schools of 3D reef fish with per-fish seabed & pillar avoidance
    if (schoolMeshRef.current) {
      const centers = [
        { x: -5, y: 36.0, z: 10, r: 6.5 },
        { x: 8, y: 35.5, z: 0, r: 7.5 },
        { x: -12, y: 29.0, z: -14, r: 8.0 },
      ];

      for (let i = 0; i < fishCount; i++) {
        const f = fishData[i];
        const c = centers[f.school];
        const a = t * f.speed + f.angleOffset;
        const r = c.r + Math.sin(t * 1.1 + i) * 1.0 + (f.radiusOffset - 3.5);
        const rawX = c.x + Math.cos(a) * r;
        const rawZ = c.z + Math.sin(a) * r;
        const rawY = c.y + f.yOffset + Math.sin(t * 1.9 + f.angleOffset) * 0.5;

        const [fx, fy, fz] = resolveSwimmerPosition(rawX, rawY, rawZ, 1.8, 1.8);

        const yaw = Math.atan2(-Math.sin(a), Math.cos(a));
        fishDummy.position.set(fx, fy, fz);
        fishDummy.rotation.set(0, yaw, 0);
        fishDummy.scale.setScalar(f.scale);
        fishDummy.updateMatrix();
        schoolMeshRef.current.setMatrixAt(i, fishDummy.matrix);
      }
      schoolMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <group ref={whaleGroupRef}>
        <Whale scale={2.2} />
      </group>
      <group ref={manta1Ref}>
        <MantaRayModel scale={1.4} />
      </group>
      <group ref={dolphinRef}>
        <DolphinModel scale={1.25} />
      </group>
      <instancedMesh
        ref={schoolMeshRef}
        args={[mergedFishGeometry, undefined, fishCount]}
        castShadow
        frustumCulled={false}
      >
        <CustomShaderMaterial
          ref={fishMatRef}
          baseMaterial={MeshStandardMaterial}
          vertexShader={fishSwimVertexShader}
          uniforms={fishUniforms}
          roughness={0.3}
          metalness={0.15}
        />
      </instancedMesh>
    </group>
  );
}

// ─── Rising Bubbles & Marine Snow Plankton ──────────────────────

function BubblesAndMarineSnow() {
  const bubblesRef = useRef<InstancedMesh>(null!);
  const snowRef = useRef<InstancedMesh>(null!);
  const dummy = useMemo(() => new Object3D(), []);

  const bubbleCount = 65;
  const snowCount = 160;

  const bubbles = useMemo(
    () =>
      Array.from({ length: bubbleCount }, (_, i) => {
        const x = (((i * 37) % 100) - 50) * 0.65;
        const z = (((i * 53) % 100) - 50) * 0.65;
        const floorY = sampleSeabedHeight(x, z);
        return {
          x,
          z,
          floorY,
          y: Math.max(floorY + 1.0, 14 + ((i * 19) % 28)),
          speed: 1.4 + (i % 7) * 0.35,
          size: 0.045 + (i % 5) * 0.024,
          phase: i * 1.1,
        };
      }),
    [],
  );

  const snow = useMemo(
    () =>
      Array.from({ length: snowCount }, (_, i) => {
        const x = (((i * 29) % 120) - 60) * 0.75;
        const z = (((i * 43) % 120) - 60) * 0.75;
        const floorY = sampleSeabedHeight(x, z);
        return {
          x,
          z,
          y: Math.min(WATER_LEVEL - 1.5, Math.max(floorY + 1.2, 8 + ((i * 17) % 35))),
          size: 0.025 + (i % 4) * 0.012,
          phase: i * 0.7,
        };
      }),
    [],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.1);

    if (bubblesRef.current) {
      for (let i = 0; i < bubbleCount; i++) {
        const b = bubbles[i];
        b.y += b.speed * dt;
        if (b.y > WATER_LEVEL - 0.4) {
          b.y = Math.min(WATER_LEVEL - 2.0, b.floorY + 0.8);
        }
        dummy.position.set(
          b.x + Math.sin(t * 2.4 + b.phase) * 0.3,
          b.y,
          b.z + Math.cos(t * 1.9 + b.phase) * 0.3,
        );
        dummy.scale.setScalar(b.size);
        dummy.updateMatrix();
        bubblesRef.current.setMatrixAt(i, dummy.matrix);
      }
      bubblesRef.current.instanceMatrix.needsUpdate = true;
    }

    if (snowRef.current) {
      for (let i = 0; i < snowCount; i++) {
        const s = snow[i];
        dummy.position.set(
          s.x + Math.sin(t * 0.45 + s.phase) * 0.7,
          s.y + Math.cos(t * 0.35 + s.phase) * 0.4,
          s.z + Math.sin(t * 0.4 + s.phase * 1.3) * 0.7,
        );
        dummy.scale.setScalar(s.size);
        dummy.updateMatrix();
        snowRef.current.setMatrixAt(i, dummy.matrix);
      }
      snowRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={bubblesRef} args={[undefined, undefined, bubbleCount]}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshStandardMaterial
          color="#d8f6ff"
          emissive="#62d4f5"
          emissiveIntensity={0.45}
          roughness={0.08}
          metalness={0.1}
        />
      </instancedMesh>
      <instancedMesh ref={snowRef} args={[undefined, undefined, snowCount]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshStandardMaterial
          color="#a8fff0"
          emissive="#48dbb8"
          emissiveIntensity={0.55}
          roughness={0.25}
        />
      </instancedMesh>
    </group>
  );
}

// ─── Main Underwater + Ocean Shader Demo ────────────────────────

export default function UnderwaterShaderDemo() {
  useUnderwaterContext();

  const [presetKey, setPresetKey] = useState<WaterPresetKey>("tropical");
  const [viewpoint, setViewpoint] = useState<CameraViewpoint>(CAMERA_VIEWPOINTS[1]);
  const [signedAltitude, setSignedAltitude] = useState<number>(-9.5);

  const activePreset = WATER_PRESETS[presetKey];

  const [controls, setControls] = useControls(() => ({
    "Water Type": folder({
      preset: {
        label: "Preset",
        value: "tropical" as WaterPresetKey,
        options: {
          "Tropical Lagoon (Abzû)": "tropical" as WaterPresetKey,
          "Shallow Reef (Subnautica)": "shallow" as WaterPresetKey,
          "Deep Pelagic (Crest)": "deep" as WaterPresetKey,
          "Kelp Forest (Murky)": "murky" as WaterPresetKey,
          "Abyssal Twilight": "abyssal" as WaterPresetKey,
        },
      },
      scatterShallow: { label: "Shallow Scatter", value: activePreset.scatterShallow },
      scatterDeep: { label: "Deep Scatter", value: activePreset.scatterDeep },
      sunScatterColor: { label: "Sun Mie Scatter", value: activePreset.sunScatterColor },
      absorbR: {
        label: "Absorb Red",
        value: activePreset.absorption[0],
        min: 0.02,
        max: 0.6,
        step: 0.01,
      },
      absorbG: {
        label: "Absorb Green",
        value: activePreset.absorption[1],
        min: 0.01,
        max: 0.3,
        step: 0.005,
      },
      absorbB: {
        label: "Absorb Blue",
        value: activePreset.absorption[2],
        min: 0.005,
        max: 0.25,
        step: 0.005,
      },
      fogDensity: {
        label: "Fog Density",
        value: activePreset.fogDensity,
        min: 0.004,
        max: 0.08,
        step: 0.001,
      },
      waterClarity: {
        label: "Water Clarity",
        value: activePreset.waterClarity,
        min: 0.1,
        max: 1.0,
        step: 0.05,
      },
    }),
    "Light & Optics": folder({
      causticsIntensity: {
        label: "Caustics",
        value: activePreset.causticsIntensity,
        min: 0,
        max: 3,
        step: 0.05,
      },
      godRayIntensity: {
        label: "God Rays",
        value: activePreset.godRayIntensity,
        min: 0,
        max: 3.5,
        step: 0.05,
      },
      bloomIntensity: {
        label: "Bloom Glow",
        value: activePreset.bloomIntensity,
        min: 0,
        max: 2.5,
        step: 0.05,
      },
      sunElevation: {
        label: "Sun Elevation",
        value: activePreset.sunElevation,
        min: 8,
        max: 85,
        step: 1,
      },
      sunAzimuth: {
        label: "Sun Azimuth",
        value: activePreset.sunAzimuth,
        min: -180,
        max: 180,
        step: 1,
      },
    }),
    "Waves & Flight": folder({
      waveHeight: {
        label: "Wave Height",
        value: activePreset.waveHeight,
        min: 0.1,
        max: 2.5,
        step: 0.05,
      },
      waveChoppiness: {
        label: "Wave Steepness",
        value: activePreset.waveChoppiness,
        min: 0.2,
        max: 2.0,
        step: 0.05,
      },
      flySpeed: { label: "Fly Speed", value: 14, min: 4, max: 40, step: 1 },
    }),
  }));

  const selectPreset = useCallback(
    (key: WaterPresetKey) => {
      const p = WATER_PRESETS[key];
      if (!p) return;
      setPresetKey(key);
      setControls({
        preset: key,
        scatterShallow: p.scatterShallow,
        scatterDeep: p.scatterDeep,
        sunScatterColor: p.sunScatterColor,
        absorbR: p.absorption[0],
        absorbG: p.absorption[1],
        absorbB: p.absorption[2],
        fogDensity: p.fogDensity,
        waterClarity: p.waterClarity,
        causticsIntensity: p.causticsIntensity,
        godRayIntensity: p.godRayIntensity,
        bloomIntensity: p.bloomIntensity,
        sunElevation: p.sunElevation,
        sunAzimuth: p.sunAzimuth,
        waveHeight: p.waveHeight,
        waveChoppiness: p.waveChoppiness,
      });
    },
    [setControls],
  );

  useEffect(() => {
    const key = controls.preset as WaterPresetKey;
    if (key && key !== presetKey && key in WATER_PRESETS) {
      selectPreset(key);
    }
  }, [controls.preset, presetKey, selectPreset]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const qView = params.get("view");
      if (qView) {
        const found = CAMERA_VIEWPOINTS.find((v) => v.id === qView);
        if (found) setViewpoint({ ...found });
      }
      const qPreset = params.get("preset") as WaterPresetKey | null;
      if (qPreset && qPreset in WATER_PRESETS) {
        selectPreset(qPreset);
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const idx = Number.parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx < CAMERA_VIEWPOINTS.length) {
        setViewpoint({ ...CAMERA_VIEWPOINTS[idx] });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectPreset]);

  const sunDirection = useMemo(() => {
    const elevRad = MathUtils.degToRad(controls.sunElevation);
    const azimRad = MathUtils.degToRad(controls.sunAzimuth);
    return new Vector3(
      Math.cos(elevRad) * Math.sin(azimRad),
      Math.sin(elevRad),
      Math.cos(elevRad) * Math.cos(azimRad),
    ).normalize();
  }, [controls.sunElevation, controls.sunAzimuth]);

  const effectParams = useMemo<UnderwaterEffectParams>(
    () => ({
      absorption: [controls.absorbR, controls.absorbG, controls.absorbB],
      scatterShallow: controls.scatterShallow,
      scatterDeep: controls.scatterDeep,
      sunScatterColor: controls.sunScatterColor,
      fogDensity: controls.fogDensity,
      causticsIntensity: controls.causticsIntensity,
      godRayIntensity: controls.godRayIntensity,
      waveHeight: controls.waveHeight,
      waveChoppiness: controls.waveChoppiness,
      waterClarity: controls.waterClarity,
      sunDirection,
    }),
    [
      controls.absorbR,
      controls.absorbG,
      controls.absorbB,
      controls.scatterShallow,
      controls.scatterDeep,
      controls.sunScatterColor,
      controls.fogDensity,
      controls.causticsIntensity,
      controls.godRayIntensity,
      controls.waveHeight,
      controls.waveChoppiness,
      controls.waterClarity,
      sunDirection,
    ],
  );

  const depthBadge =
    Math.abs(signedAltitude) < 0.45
      ? "Waterline (Meniscus)"
      : signedAltitude < 0
        ? `Depth ${Math.abs(signedAltitude).toFixed(1)} m`
        : `Air +${signedAltitude.toFixed(1)} m`;

  return (
    <>
      <In>
        <Leva collapsed />
        <div className="pointer-events-none fixed inset-x-0 bottom-3 z-20 flex flex-col items-center gap-2 px-3">
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 shadow-lg backdrop-blur-md">
            <span className="mr-1 rounded-md bg-cyan-500/20 px-2 py-1 font-mono font-medium text-cyan-200">
              {depthBadge}
            </span>

            <fieldset
              className="flex flex-wrap items-center gap-1 border-0 p-0"
              aria-label="Water presets"
            >
              {(Object.keys(WATER_PRESETS) as WaterPresetKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectPreset(key)}
                  className={`rounded-md px-2 py-1 transition-colors ${
                    presetKey === key
                      ? "bg-cyan-500 font-medium text-slate-950"
                      : "bg-white/10 text-slate-200 hover:bg-white/20"
                  }`}
                >
                  {WATER_PRESETS[key].label}
                </button>
              ))}
            </fieldset>

            <span className="mx-1 hidden h-4 w-px bg-white/20 sm:inline-block" />

            <fieldset
              className="flex flex-wrap items-center gap-1 border-0 p-0"
              aria-label="Camera viewpoints"
            >
              {CAMERA_VIEWPOINTS.map((vp) => (
                <button
                  key={vp.id}
                  type="button"
                  onClick={() => setViewpoint({ ...vp })}
                  className={`rounded-md px-2 py-1 transition-colors ${
                    viewpoint.id === vp.id
                      ? "bg-amber-400/90 font-medium text-slate-950"
                      : "bg-white/10 text-slate-300 hover:bg-white/20"
                  }`}
                >
                  <span className="mr-1 font-mono opacity-70">{vp.shortcut}</span>
                  {vp.label}
                </button>
              ))}
            </fieldset>
          </div>

          <div className="rounded-full bg-slate-950/55 px-3 py-0.5 text-[11px] text-slate-300 backdrop-blur-sm">
            WASD / Arrows fly · Space/E up · C/Q down · Shift boost · Click or drag to look
          </div>
        </div>
      </In>

      <FirstPersonFlyController
        speed={controls.flySpeed}
        activeViewpoint={viewpoint}
        onAltitudeChange={setSignedAltitude}
      />

      {/* Scene Lighting */}
      <ambientLight intensity={0.62} color="#b8e6ff" />
      <hemisphereLight args={["#9ee8ff", "#183646", 0.52]} />
      <directionalLight
        position={[sunDirection.x * 120, sunDirection.y * 120, sunDirection.z * 120]}
        intensity={2.1}
        color="#fff6e0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={240}
        shadow-camera-left={-70}
        shadow-camera-right={70}
        shadow-camera-top={70}
        shadow-camera-bottom={-70}
      />

      <Sky
        sunPosition={[sunDirection.x * 200, sunDirection.y * 200, sunDirection.z * 200]}
        turbidity={2.5}
        rayleigh={0.65}
        mieCoefficient={0.004}
        mieDirectionalG={0.82}
      />

      <SeabedAndArchitecture />
      <ObstacleWaveSpray waveHeight={controls.waveHeight} />
      <SwimmingMarineLife />
      <BubblesAndMarineSnow />

      <EffectComposer multisampling={0} depthBuffer>
        <UnderwaterEffect params={effectParams} />
        <Bloom
          mipmapBlur
          luminanceThreshold={0.85}
          luminanceSmoothing={0.24}
          intensity={controls.bloomIntensity}
          levels={7}
        />
      </EffectComposer>
    </>
  );
}
