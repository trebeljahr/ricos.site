import { In } from "@components/dom/ThreeFiberLayout";
import { useUnderwaterContext } from "@contexts/UnderwaterContext";
import DolphinModel from "@r3f/AllModels/fish_pack/Dolphin";
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
  Color,
  CylinderGeometry,
  DoubleSide,
  Euler,
  type Group,
  type InstancedMesh,
  MathUtils,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";
import CustomShaderMaterial from "three-custom-shader-material";
import type CustomShaderMaterialType from "three-custom-shader-material/vanilla";
import { UnderwaterEffect, type UnderwaterEffectParams } from "./UnderwaterEffect";
import {
  CAMERA_VIEWPOINTS,
  type CameraViewpoint,
  evaluateWaveHeight,
  WATER_LEVEL,
  WATER_PRESETS,
  type WaterPresetKey,
} from "./waterPresets";

// ─── Procedural Seabed Terrain Height Function ──────────────────

function sampleSeabedHeight(x: number, z: number): number {
  // Shallow sunlit lagoon near center/front (z in [-15, 45], x in [-35, 35])
  const distCenter = Math.hypot(x * 0.85, (z - 8) * 0.9);
  const lagoonShelf = 31.5 - Math.min(18.0, Math.max(0.0, (distCenter - 16.0) * 0.32));

  // Deep abyssal trench drop-off toward (-x, -z)
  const trenchCoord = (x + 28) * 0.55 + (z + 25) * 0.75;
  const trenchDrop = -15.5 * (1.0 - 1.0 / (1.0 + Math.exp(-trenchCoord * 0.08)));

  // Multi-octave rocky ridges & sand dunes
  const ridge1 = Math.sin(x * 0.065 + Math.cos(z * 0.055) * 1.4) * 2.4;
  const ridge2 = Math.cos(z * 0.08 - x * 0.045) * 1.8;
  const ripples = Math.sin(x * 0.45 + z * 0.25) * 0.25 + Math.cos(z * 0.65 - x * 0.35) * 0.18;

  // Emergent sea-stack mounds at (-22, -16) and (24, -20)
  const dSpire1 = Math.hypot(x + 22, z + 16);
  const spire1 = 28.0 * Math.exp(-(dSpire1 * dSpire1) / 52.0);

  const dSpire2 = Math.hypot(x - 24, z + 20);
  const spire2 = 30.0 * Math.exp(-(dSpire2 * dSpire2) / 60.0);

  // Secondary reef knolls
  const dKnoll1 = Math.hypot(x - 14, z - 10);
  const knoll1 = 6.5 * Math.exp(-(dKnoll1 * dKnoll1) / 45.0);

  const dKnoll2 = Math.hypot(x + 15, z - 12);
  const knoll2 = 5.5 * Math.exp(-(dKnoll2 * dKnoll2) / 38.0);

  return Math.max(
    2.0,
    lagoonShelf + trenchDrop + ridge1 + ridge2 + ripples + spire1 + spire2 + knoll1 + knoll2,
  );
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

  // Apply viewpoint teleport
  useEffect(() => {
    camera.position.set(...activeViewpoint.position);
    euler.current.set(activeViewpoint.rotation[0], activeViewpoint.rotation[1], 0, "YXZ");
    camera.quaternion.setFromEuler(euler.current);
    velocity.current.set(0, 0, 0);
  }, [activeViewpoint, camera]);

  // Extra key listeners (E/Q/Control/Shift) + click-drag look fallback when pointer is unlocked
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

    // Keep camera above seabed floor and within bounds
    const floorY = sampleSeabedHeight(camera.position.x, camera.position.z);
    if (camera.position.y < floorY + 1.2) {
      camera.position.y = floorY + 1.2;
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
    vec3 baseCol = mix(vec3(0.08, 0.32, 0.18), vec3(0.38, 0.76, 0.24), vHeightFrac);
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
    //Deterministic golden-angle distribution around the reef drop-off and arch
    for (let i = 0; i < 95; i++) {
      const angle = i * 2.3999632;
      const radius = 8 + Math.sqrt(i / 95) * 58;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius - 4;
      const y = sampleSeabedHeight(x, z);
      // Kelp thrives between y = 10 and y = 36 (9m to 35m underwater)
      if (y > 10 && y < 36.5) {
        const sc = (0.045 + ((i * 17) % 10) * 0.005) * (1.0 - (y - 10) * 0.012);
        items.push({ x, y: y - 0.3, z, scale: sc, rot: (i * 1.7) % (Math.PI * 2) });
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
        roughness={0.65}
        side={DoubleSide}
      />
    </instancedMesh>
  );
}

function SeabedAndArchitecture() {
  const terrainGeometry = useMemo(() => {
    const size = 640;
    const segs = 180;
    const geom = new PlaneGeometry(size, size, segs, segs);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const sandColor = new Color("#e2cfa8");
    const coralSand = new Color("#c8b894");
    const limestone = new Color("#6e7b78");
    const deepBasalt = new Color("#283845");
    const tempCol = new Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = sampleSeabedHeight(x, z);
      pos.setY(i, y);

      // Compute slope by finite difference for rock vs sand coloring
      const hx = sampleSeabedHeight(x + 1.5, z);
      const hz = sampleSeabedHeight(x, z + 1.5);
      const slope = Math.hypot(hx - y, hz - y) / 1.5;

      const depthFactor = MathUtils.clamp((y - 8) / 28, 0, 1);
      tempCol.lerpColors(deepBasalt, coralSand, depthFactor);
      if (y > 26 && slope < 0.35) {
        tempCol.lerp(sandColor, 0.65);
      }
      if (slope > 0.32 || y > 38) {
        tempCol.lerp(limestone, MathUtils.clamp((slope - 0.25) * 1.6, 0.3, 0.95));
      }

      colors[i * 3] = tempCol.r;
      colors[i * 3 + 1] = tempCol.g;
      colors[i * 3 + 2] = tempCol.b;
    }

    geom.setAttribute("color", new BufferAttribute(colors, 3));
    geom.computeVertexNormals();
    return geom;
  }, []);

  // Ancient colonnade pillars & coral boulders
  const pillars = useMemo(
    () => [
      { pos: [-11, 29, 4] as const, rTop: 1.1, rBot: 1.4, h: 24 },
      { pos: [11, 28, 4] as const, rTop: 1.1, rBot: 1.4, h: 22 },
      { pos: [-14, 24, -22] as const, rTop: 1.3, rBot: 1.7, h: 30 },
      { pos: [15, 25, -24] as const, rTop: 1.2, rBot: 1.6, h: 28 },
      { pos: [0, 32, -32] as const, rTop: 1.6, rBot: 2.2, h: 36 },
      { pos: [-8, 16, -36] as const, rTop: 1.2, rBot: 1.5, h: 22 },
    ],
    [],
  );

  // Bioluminescent & reef coral heads (emissive tips trigger Bloom!)
  const coralClusters = useMemo(() => {
    const list: {
      id: string;
      pos: [number, number, number];
      scale: [number, number, number];
      color: string;
      emissive: string;
      emissiveIntensity: number;
    }[] = [];

    const palette = [
      { color: "#ff6b8b", emissive: "#ff3864", glow: 0.65 },
      { color: "#ffb347", emissive: "#ff8c1a", glow: 0.55 },
      { color: "#38ef7d", emissive: "#11ff99", glow: 0.85 },
      { color: "#4facfe", emissive: "#00f2fe", glow: 1.15 },
      { color: "#c471ed", emissive: "#a844ff", glow: 0.95 },
    ];

    for (let i = 0; i < 48; i++) {
      const a = i * 2.39996;
      const r = 5 + Math.sqrt(i / 48) * 46;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r + 4;
      const y = sampleSeabedHeight(x, z);
      if (y < 39) {
        const pal = palette[i % palette.length];
        // Deeper corals glow more brightly with bioluminescence
        const depthGlowBoost = y < 22 ? 1.8 : 0.7;
        const radius = 0.7 + (i % 5) * 0.35;
        list.push({
          id: `coral-${i}`,
          pos: [x, y + radius * 0.35, z],
          scale: [radius * 1.3, radius * 0.85, radius * 1.3],
          color: pal.color,
          emissive: pal.emissive,
          emissiveIntensity: pal.glow * depthGlowBoost,
        });
      }
    }
    return list;
  }, []);

  const archGeometry = useMemo(() => new TorusGeometry(12.2, 2.4, 18, 48, Math.PI), []);
  const columnGeometry = useMemo(() => new CylinderGeometry(1, 1.25, 1, 14), []);
  const coralGeometry = useMemo(() => new SphereGeometry(1, 16, 12), []);

  return (
    <group>
      {/* Sculpted Seabed Mesh */}
      <mesh geometry={terrainGeometry} receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.92} metalness={0.02} />
      </mesh>

      {/* Grand Submerged / Surface-Piercing Stone Arch (matches shader blocker at z = -8) */}
      <mesh
        geometry={archGeometry}
        position={[0, 25.5, -8]}
        scale={[1.0, 1.22, 0.95]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#7a8480" roughness={0.82} metalness={0.05} />
      </mesh>

      {/* Temple Colonnade Pillars (some piercing the water surface, some submerged) */}
      {pillars.map((p) => (
        <mesh
          key={p.pos.join(",")}
          geometry={columnGeometry}
          position={p.pos}
          scale={[p.rTop, p.h, p.rTop]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color="#8c9288" roughness={0.78} />
        </mesh>
      ))}

      {/* Reef & Bioluminescent Coral Clusters */}
      {coralClusters.map((c) => (
        <mesh
          key={c.id}
          geometry={coralGeometry}
          position={c.pos}
          scale={c.scale}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={c.color}
            emissive={c.emissive}
            emissiveIntensity={c.emissiveIntensity}
            roughness={0.5}
          />
        </mesh>
      ))}

      {/* Swaying Kelp Forest */}
      <SwayingKelpForest />
    </group>
  );
}

// ─── Marine Life (Whale, Manta Rays, Schooling Reef Fish) ───────

function SwimmingMarineLife() {
  const whaleGroupRef = useRef<Group>(null!);
  const manta1Ref = useRef<Group>(null!);
  const manta2Ref = useRef<Group>(null!);
  const schoolMeshRef = useRef<InstancedMesh>(null!);

  const fishCount = 160;
  const fishDummy = useMemo(() => new Object3D(), []);
  const fishColor = useMemo(() => new Color(), []);

  const fishData = useMemo(
    () =>
      Array.from({ length: fishCount }, (_, i) => ({
        school: i % 3,
        angleOffset: (i / fishCount) * Math.PI * 2 * 3,
        radiusOffset: 1.5 + ((i * 13) % 17) * 0.32,
        yOffset: (((i * 7) % 11) - 5) * 0.45,
        speed: 0.55 + ((i * 5) % 7) * 0.04,
        scale: 0.22 + (i % 4) * 0.05,
      })),
    [],
  );

  // Set vibrant tropical fish colors once
  useEffect(() => {
    if (!schoolMeshRef.current) return;
    const palette = ["#ff9f1c", "#2ec4b6", "#ffbf69", "#00bbf9", "#f15bb5"];
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

    // 1. Whale glides in a slow figure-8 loop around the arch and deep drop-off
    if (whaleGroupRef.current) {
      const wAngle = t * 0.14;
      const wx = Math.sin(wAngle) * 32;
      const wz = Math.sin(wAngle * 2) * 18 - 10;
      const wy = 31 + Math.cos(wAngle * 2) * 3.5;

      const dx = Math.cos(wAngle) * 32 * 0.14;
      const dz = Math.cos(wAngle * 2) * 36 * 0.14;
      whaleGroupRef.current.position.set(wx, wy, wz);
      whaleGroupRef.current.rotation.set(0, Math.atan2(dx, dz), -Math.sin(wAngle) * 0.12);
    }

    // 2. Two Manta Rays banking gracefully through the sunlit lagoon
    if (manta1Ref.current) {
      const m1 = t * 0.32;
      const mx = Math.cos(m1) * 16 - 4;
      const mz = Math.sin(m1) * 14 + 6;
      const my = 36.5 + Math.sin(m1 * 2) * 1.8;
      manta1Ref.current.position.set(mx, my, mz);
      manta1Ref.current.rotation.set(
        Math.cos(m1 * 2) * 0.12,
        Math.atan2(-Math.sin(m1) * 16, Math.cos(m1) * 14),
        0.18,
      );
    }

    if (manta2Ref.current) {
      const m2 = -t * 0.26 + 2.2;
      const mx = Math.cos(m2) * 20 + 6;
      const mz = Math.sin(m2) * 18 - 4;
      const my = 34.0 + Math.cos(m2 * 2) * 2.0;
      manta2Ref.current.position.set(mx, my, mz);
      manta2Ref.current.rotation.set(
        -Math.sin(m2 * 2) * 0.1,
        Math.atan2(Math.sin(m2) * 20, -Math.cos(m2) * 18),
        -0.15,
      );
    }

    // 3. Swirling schools of reef fish
    if (schoolMeshRef.current) {
      const centers = [
        { x: -6, y: 34.5, z: 8, r: 7 },
        { x: 9, y: 33.0, z: -2, r: 8.5 },
        { x: -14, y: 25.0, z: -16, r: 9 },
      ];

      for (let i = 0; i < fishCount; i++) {
        const f = fishData[i];
        const c = centers[f.school];
        const a = t * f.speed + f.angleOffset;
        const r = c.r + Math.sin(t * 1.2 + i) * 1.2 + (f.radiusOffset - 4);
        const fx = c.x + Math.cos(a) * r;
        const fz = c.z + Math.sin(a) * r;
        const fy = c.y + f.yOffset + Math.sin(t * 2.1 + f.angleOffset) * 0.6;

        const yaw = Math.atan2(-Math.sin(a), Math.cos(a)) + Math.sin(t * 12.0 + i) * 0.08;
        fishDummy.position.set(fx, fy, fz);
        fishDummy.rotation.set(0, yaw, 0);
        fishDummy.scale.set(f.scale * 0.45, f.scale * 0.75, f.scale * 1.9);
        fishDummy.updateMatrix();
        schoolMeshRef.current.setMatrixAt(i, fishDummy.matrix);
      }
      schoolMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <group ref={whaleGroupRef}>
        <Whale scale={2.4} />
      </group>
      <group ref={manta1Ref}>
        <MantaRayModel scale={1.5} />
      </group>
      <group ref={manta2Ref}>
        <DolphinModel scale={1.3} />
      </group>
      <instancedMesh ref={schoolMeshRef} args={[undefined, undefined, fishCount]} castShadow>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial roughness={0.25} metalness={0.2} />
      </instancedMesh>
    </group>
  );
}

// ─── Rising Bubbles & Glowing Marine Snow Plankton ──────────────

function BubblesAndMarineSnow() {
  const bubblesRef = useRef<InstancedMesh>(null!);
  const snowRef = useRef<InstancedMesh>(null!);
  const dummy = useMemo(() => new Object3D(), []);

  const bubbleCount = 65;
  const snowCount = 180;

  const bubbles = useMemo(
    () =>
      Array.from({ length: bubbleCount }, (_, i) => ({
        x: (((i * 37) % 100) - 50) * 0.65,
        z: (((i * 53) % 100) - 50) * 0.65,
        y: 12 + ((i * 19) % 32),
        speed: 1.4 + (i % 7) * 0.35,
        size: 0.06 + (i % 5) * 0.038,
        phase: i * 1.1,
      })),
    [],
  );

  const snow = useMemo(
    () =>
      Array.from({ length: snowCount }, (_, i) => ({
        x: (((i * 29) % 120) - 60) * 0.75,
        z: (((i * 43) % 120) - 60) * 0.75,
        y: 6 + ((i * 17) % 38),
        size: 0.035 + (i % 4) * 0.018,
        phase: i * 0.7,
      })),
    [],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.1);

    if (bubblesRef.current) {
      for (let i = 0; i < bubbleCount; i++) {
        const b = bubbles[i];
        b.y += b.speed * dt;
        if (b.y > WATER_LEVEL - 0.3) {
          b.y = 14 + (i % 18);
        }
        dummy.position.set(
          b.x + Math.sin(t * 2.4 + b.phase) * 0.35,
          b.y,
          b.z + Math.cos(t * 1.9 + b.phase) * 0.35,
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
          s.x + Math.sin(t * 0.45 + s.phase) * 0.8,
          s.y + Math.cos(t * 0.35 + s.phase) * 0.5,
          s.z + Math.sin(t * 0.4 + s.phase * 1.3) * 0.8,
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
          emissive="#7ae8ff"
          emissiveIntensity={0.9}
          roughness={0.05}
          metalness={0.1}
        />
      </instancedMesh>
      <instancedMesh ref={snowRef} args={[undefined, undefined, snowCount]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshStandardMaterial
          color="#a8fff0"
          emissive="#64ffda"
          emissiveIntensity={1.6}
          roughness={0.2}
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
        min: 0.2,
        max: 1.2,
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
        max: 3,
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

  // Sync when Leva dropdown changes controls.preset
  useEffect(() => {
    const key = controls.preset as WaterPresetKey;
    if (key && key !== presetKey && key in WATER_PRESETS) {
      selectPreset(key);
    }
  }, [controls.preset, presetKey, selectPreset]);

  // Number keys 1-5 jump to viewpoints; URL query params set initial viewpoint/preset
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
      <ambientLight intensity={0.65} color="#b8e6ff" />
      <hemisphereLight args={["#9ee8ff", "#1a3b4c", 0.55]} />
      <directionalLight
        position={[sunDirection.x * 120, sunDirection.y * 120, sunDirection.z * 120]}
        intensity={2.2}
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
      <SwimmingMarineLife />
      <BubblesAndMarineSnow />

      <EffectComposer multisampling={0} depthBuffer>
        <UnderwaterEffect params={effectParams} />
        <Bloom
          mipmapBlur
          luminanceThreshold={0.78}
          luminanceSmoothing={0.28}
          intensity={controls.bloomIntensity}
          levels={7}
        />
      </EffectComposer>
    </>
  );
}
