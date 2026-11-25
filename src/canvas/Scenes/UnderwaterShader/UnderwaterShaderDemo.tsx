import { In } from "@components/dom/ThreeFiberLayout";
import { useUnderwaterContext } from "@contexts/UnderwaterContext";
import Whale from "@r3f/AllModels/fish_pack/Whale";
import { useKelp } from "@r3f/AllModels/Kelp4";
import { PointerLockControls, Sky, useKeyboardControls } from "@react-three/drei";
import { type RootState, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { folder, Leva, useControls } from "leva";
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BufferAttribute,
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
import { LagoonSwarm } from "./LagoonSwarm";
import { ARCH, PILLAR_FOOT, PILLARS, REEF_FORMATIONS, sampleSeabedHeight } from "./lagoonTerrain";
import { type SpriteBuffers, SpriteParticles } from "./SpriteParticles";
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

  const archGeometry = useMemo(
    () => new TorusGeometry(ARCH.majorRadius, ARCH.tubeRadius, 20, 56, Math.PI),
    [],
  );
  const columnGeometry = useMemo(() => new CylinderGeometry(1, PILLAR_FOOT, 1, 16), []);
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
        position={ARCH.position}
        scale={ARCH.scale}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#76827e" roughness={0.84} metalness={0.04} />
      </mesh>

      {/* Temple Colonnade Pillars */}
      {PILLARS.map((p) => (
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
      {REEF_FORMATIONS.map((c) => (
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

function ObstacleWaveSpray({
  waveHeight,
  sunDirection,
}: {
  waveHeight: number;
  sunDirection: Vector3;
}) {
  const sprayCount = 720;

  const particles = useMemo(() => {
    // Small deterministic hash so the spray looks the same on every load
    const rand = (i: number, salt: number) => {
      const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
      return v - Math.floor(v);
    };
    return Array.from({ length: sprayCount }, (_, i) => {
      const anchor = SPRAY_ANCHORS[i % SPRAY_ANCHORS.length];
      // Each anchor throws a few bursts; particles of one burst share timing and a side of the rock
      const burst = Math.floor(rand(i, 1) * 5);
      const burstAngle = rand(anchor.x * 3.1 + burst, 2) * Math.PI * 2;
      const mist = rand(i, 3) > 0.62;
      return {
        anchor,
        angle: burstAngle + (rand(i, 4) - 0.5) * 1.9,
        phaseOffset: rand(anchor.z * 1.7 + burst, 5) * 6 + rand(i, 6) * 0.35,
        cycleDuration: 2.1 + rand(anchor.x + burst, 7) * 1.6,
        airTime: mist ? 1.5 + rand(i, 8) * 0.7 : 0.75 + rand(i, 8) * 0.75,
        outSpeed: mist ? 0.5 + rand(i, 9) * 0.9 : 0.9 + rand(i, 9) * 2.6,
        upSpeed: mist ? 1.6 + rand(i, 10) * 1.6 : 2.6 + rand(i, 10) * 4.2,
        gravity: mist ? 2.4 : 9.0,
        size: mist ? 0.26 + rand(i, 11) * 0.4 : 0.045 + rand(i, 11) * 0.085,
        mist,
      };
    });
  }, []);

  const update = useCallback(
    ({ positions, sizes, fades }: SpriteBuffers, state: RootState) => {
      const t = state.clock.elapsedTime;
      const waveScale = Math.max(0.3, waveHeight);

      for (let i = 0; i < sprayCount; i++) {
        const p = particles[i];
        const localTime = (t + p.phaseOffset) % p.cycleDuration;
        if (localTime > p.airTime) {
          sizes[i] = 0;
          continue;
        }
        const life = localTime / p.airTime; // 0..1

        const nx = Math.cos(p.angle);
        const nz = Math.sin(p.angle);
        const baseX = p.anchor.x + nx * p.anchor.r;
        const baseZ = p.anchor.z + nz * p.anchor.r;

        // Wave height at the rock when this burst left the water: a crest throws spray, a trough none
        const launchWave = evaluateWaveHeight(baseX, baseZ, t - localTime, waveScale);
        const surge = Math.min(1.5, Math.max(0, launchWave / waveScale + 0.35));
        if (surge < 0.12) {
          sizes[i] = 0;
          continue;
        }
        const power = surge * Math.min(1.4, 0.55 + 0.45 * waveScale);

        const radialDist = p.outSpeed * localTime * power;
        const rise = (p.upSpeed * power - 0.5 * p.gravity * localTime) * localTime;

        positions[i * 3] = baseX + nx * radialDist;
        positions[i * 3 + 1] = WATER_LEVEL + launchWave - 0.05 + rise;
        positions[i * 3 + 2] = baseZ + nz * radialDist;

        if (p.mist) {
          // Mist swells as it drifts, then thins out
          sizes[i] = p.size * (0.45 + 1.1 * life) * (0.6 + 0.4 * power);
          fades[i] = Math.min(1, life * 8) * (1 - life) ** 0.7;
        } else {
          sizes[i] = p.size * (1 - 0.35 * life);
          fades[i] = Math.min(1, life * 12) * Math.min(1, (1 - life) * 3);
        }
      }
    },
    [particles, waveHeight],
  );

  return (
    <SpriteParticles count={sprayCount} kind="spray" sunDirection={sunDirection} update={update} />
  );
}

// ─── Whale (the fish swarm lives in LagoonSwarm) ────────────────

function GlidingWhale({ whaleRef }: { whaleRef: RefObject<Group | null> }) {
  useFrame((state) => {
    const whale = whaleRef.current;
    if (!whale) return;
    // Glides in the open water column with strict seabed & obstacle clearance
    const wAngle = state.clock.elapsedTime * 0.13;
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

    whale.position.set(wx, wy, wz);
    whale.rotation.set(
      -Math.atan2(dy, horizDist) * 0.6,
      Math.atan2(dx, dz),
      -Math.sin(wAngle) * 0.1,
    );
  });

  return (
    <group ref={whaleRef}>
      <Whale scale={2.2} />
    </group>
  );
}

// ─── Rising Bubbles & Marine Snow Plankton ──────────────────────

function BubblesAndMarineSnow() {
  const bubbleCount = 150;
  const snowCount = 260;

  const bubbles = useMemo(
    () =>
      Array.from({ length: bubbleCount }, (_, i) => {
        // Bubbles rise in loose columns from vents on the seabed
        const vent = i % 14;
        const ventX = (((vent * 37) % 100) - 50) * 0.65;
        const ventZ = (((vent * 53) % 100) - 50) * 0.65;
        const x = ventX + (((i * 29) % 17) - 8) * 0.09;
        const z = ventZ + (((i * 43) % 19) - 9) * 0.09;
        const floorY = sampleSeabedHeight(x, z);
        const size = 0.035 + ((i * 7) % 11) * 0.011;
        return {
          x,
          z,
          floorY,
          y: floorY + ((i * 19) % 97) * 0.01 * Math.max(1, WATER_LEVEL - floorY),
          // Bigger bubbles rise faster
          speed: 0.9 + size * 14,
          size,
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
          size: 0.03 + (i % 4) * 0.012,
          phase: i * 0.7,
        };
      }),
    [],
  );

  const updateBubbles = useCallback(
    ({ positions, sizes, fades }: SpriteBuffers, state: RootState, delta: number) => {
      const t = state.clock.elapsedTime;
      const dt = Math.min(delta, 0.1);
      for (let i = 0; i < bubbleCount; i++) {
        const b = bubbles[i];
        b.y += b.speed * dt;
        const surfaceY = WATER_LEVEL - 0.6;
        if (b.y > surfaceY) b.y = b.floorY + 0.3;
        const climbed = b.y - b.floorY;
        // The wobble widens as the bubble climbs
        const wobble = 0.08 + Math.min(0.3, climbed * 0.02);
        positions[i * 3] = b.x + Math.sin(t * 2.4 + b.phase) * wobble;
        positions[i * 3 + 1] = b.y;
        positions[i * 3 + 2] = b.z + Math.cos(t * 1.9 + b.phase) * wobble;
        // Pressure drops on the way up, so the bubble grows
        sizes[i] = b.size * 2 * (1 + Math.min(0.6, climbed * 0.03));
        fades[i] = Math.min(1, climbed * 1.5) * Math.min(1, (surfaceY - b.y) * 1.2);
      }
    },
    [bubbles],
  );

  const updateSnow = useCallback(
    ({ positions, sizes }: SpriteBuffers, state: RootState) => {
      const t = state.clock.elapsedTime;
      for (let i = 0; i < snowCount; i++) {
        const s = snow[i];
        positions[i * 3] = s.x + Math.sin(t * 0.45 + s.phase) * 0.7;
        positions[i * 3 + 1] = s.y + Math.cos(t * 0.35 + s.phase) * 0.4;
        positions[i * 3 + 2] = s.z + Math.sin(t * 0.4 + s.phase * 1.3) * 0.7;
        sizes[i] = s.size * 2;
      }
    },
    [snow],
  );

  return (
    <group>
      <SpriteParticles count={bubbleCount} kind="bubble" update={updateBubbles} />
      <SpriteParticles count={snowCount} kind="snow" update={updateSnow} />
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
  const whaleRef = useRef<Group>(null);

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
      <ObstacleWaveSpray waveHeight={controls.waveHeight} sunDirection={sunDirection} />
      <GlidingWhale whaleRef={whaleRef} />
      <LagoonSwarm whaleRef={whaleRef} />
      <BubblesAndMarineSnow />

      {/* mergeMode "none": Bloom must read the water shader's output. Merged into one pass it
          reads the raw render instead, and the bright sky behind open water blooms the
          underwater horizon to white. */}
      <EffectComposer multisampling={0} depthBuffer mergeMode="none">
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
