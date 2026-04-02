import { useUnderwaterContext, waterHeight } from "@contexts/UnderwaterContext";
import {
  Environment,
  PointerLockControls,
  Sky,
  useKeyboardControls,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { Physics, RapierRigidBody, RigidBody } from "@react-three/rapier";
import { PropsWithChildren, useEffect, useRef } from "react";
import { Color, FogExp2, Mesh, Vector3 } from "three";
import { clamp, lerp } from "three/src/math/MathUtils";
import { UnderwaterEffect } from "./UnderwaterEffect";
import { WaterSurface } from "./WaterSurface";

const SPEED = 5;
const direction = new Vector3();
const frontVector = new Vector3();
const sideVector = new Vector3();

function PlayerController({ children }: PropsWithChildren) {
  const [subscribe, get] = useKeyboardControls();
  const rigidBodyRef = useRef<RapierRigidBody>(null!);
  const { camera } = useThree();
  const speedFactor = useRef(1);
  const desiredFactor = useRef(1);
  const lerpConstant = useRef(0);

  useEffect(() => {
    subscribe(({ sprint }) => {
      const newFactor = sprint ? 3 : 1;
      if (desiredFactor.current !== newFactor) {
        lerpConstant.current = 0;
      }
      desiredFactor.current = newFactor;
    });
  }, [subscribe]);

  useFrame((_, delta) => {
    if (!rigidBodyRef.current) return;

    const { forward, backward, leftward, rightward, jump, descend, sprint } =
      get();

    const { x, y, z } = rigidBodyRef.current.translation();
    camera.position.set(x, y, z);

    frontVector.set(0, 0, +backward - +forward);
    sideVector.set(+leftward - +rightward, 0, 0);

    const desiredSpeed = sprint ? 2 : 1;
    lerpConstant.current += 0.1;

    speedFactor.current = lerp(
      speedFactor.current,
      desiredSpeed,
      clamp(0, 1, lerpConstant.current)
    );

    direction
      .subVectors(frontVector, sideVector)
      .applyEuler(camera.rotation)
      .add(new Vector3(0, +jump - +descend, 0))
      .normalize()
      .multiplyScalar(SPEED * speedFactor.current);

    rigidBodyRef.current.setLinvel(
      { x: direction.x, y: direction.y, z: direction.z },
      true
    );
  });

  return (
    <>
      <RigidBody
        ref={rigidBodyRef}
        colliders={false}
        mass={1}
        type="dynamic"
        position={[0, waterHeight + 5, 0]}
        enabledRotations={[false, false, false]}
      >
        {children}
      </RigidBody>
      <PointerLockControls selector={"canvas"} />
    </>
  );
}

function SceneryObjects() {
  return (
    <group>
      {/* Sandy ocean floor — large enough to extend beyond fog visibility */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[1000, 1000, 32, 32]} />
        <meshStandardMaterial color="#b5a68a" roughness={0.95} />
      </mesh>

      {/* Deeper sandy floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -8, 0]} receiveShadow>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#7a6b55" roughness={1.0} />
      </mesh>

      {/* Coral-like rocks to see caustics on */}
      {[
        { pos: [8, 20, -10] as const, scale: [3, 6, 3] as const, color: "#a08070" },
        { pos: [-12, 18, -5] as const, scale: [4, 5, 4] as const, color: "#8a9a7a" },
        { pos: [5, 15, 8] as const, scale: [2, 12, 2] as const, color: "#907a6a" },
        { pos: [-8, 22, 12] as const, scale: [3, 4, 3] as const, color: "#7a8a70" },
        { pos: [15, 8, 5] as const, scale: [5, 4, 5] as const, color: "#a09080" },
        { pos: [-5, 5, -15] as const, scale: [6, 3, 6] as const, color: "#9a8a6a" },
        { pos: [20, 12, -8] as const, scale: [2, 8, 2] as const, color: "#8a7a6a" },
      ].map(({ pos, scale, color }, i) => (
        <mesh key={i} position={pos} castShadow receiveShadow>
          <boxGeometry args={scale} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      ))}

      {/* Spheres at various depths */}
      {[
        { pos: [0, 38, -8] as const, r: 2, color: "#d4b892" },
        { pos: [-6, 28, 3] as const, r: 1.8, color: "#92b8d4" },
        { pos: [10, 15, -3] as const, r: 2.5, color: "#b8d492" },
        { pos: [3, 50, -5] as const, r: 1.5, color: "#d49292" },
        { pos: [-15, 10, 10] as const, r: 3, color: "#c8b8a0" },
      ].map(({ pos, r, color }, i) => (
        <mesh key={`s-${i}`} position={pos} castShadow receiveShadow>
          <sphereGeometry args={[r, 32, 32]} />
          <meshStandardMaterial color={color} roughness={0.35} metalness={0.05} />
        </mesh>
      ))}

      {/* Tall pillar crossing the waterline */}
      <mesh position={[0, 30, -15]} castShadow receiveShadow>
        <cylinderGeometry args={[1.5, 2.5, 45, 12]} />
        <meshStandardMaterial color="#8a7b6e" roughness={0.7} />
      </mesh>

      {/* A second pillar */}
      <mesh position={[-20, 25, 5]} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1.8, 35, 10]} />
        <meshStandardMaterial color="#7a8b7e" roughness={0.75} />
      </mesh>
    </group>
  );
}

function AnimatedBubbles() {
  const bubblesRef = useRef<Mesh[]>([]);
  const bubbleData = useRef(
    Array.from({ length: 25 }, () => ({
      x: (Math.random() - 0.5) * 40,
      z: (Math.random() - 0.5) * 40,
      y: Math.random() * 35 + 5,
      speed: 0.4 + Math.random() * 0.6,
      size: 0.08 + Math.random() * 0.2,
      wobble: Math.random() * Math.PI * 2,
    }))
  );

  useFrame((_, delta) => {
    bubbleData.current.forEach((b, i) => {
      b.y += b.speed * delta * 4;
      b.wobble += delta * 2.5;
      if (b.y > waterHeight) {
        b.y = 2 + Math.random() * 15;
        b.x = (Math.random() - 0.5) * 40;
        b.z = (Math.random() - 0.5) * 40;
      }
      const mesh = bubblesRef.current[i];
      if (mesh) {
        mesh.position.set(
          b.x + Math.sin(b.wobble) * 0.4,
          b.y,
          b.z + Math.cos(b.wobble * 0.7) * 0.4
        );
      }
    });
  });

  return (
    <group>
      {bubbleData.current.map((b, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) bubblesRef.current[i] = el;
          }}
          position={[b.x, b.y, b.z]}
        >
          <sphereGeometry args={[b.size, 8, 8]} />
          <meshPhysicalMaterial
            color="#b0ddff"
            transparent
            opacity={0.25}
            roughness={0}
            metalness={0.05}
            transmission={0.8}
            ior={1.3}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function UnderwaterShaderDemo() {
  const { scene } = useThree();
  const fogRef = useRef<FogExp2>(null!);
  const { underwater } = useUnderwaterContext();

  useEffect(() => {
    if (!underwater) {
      scene.background = new Color("#87CEEB");
      fogRef.current.density = 0.00001;
      fogRef.current.color = new Color("#c8dce8");
    } else {
      // Dark ocean background when underwater — the post-processing shader
      // handles all the underwater visuals. Without this, the Sky dome
      // or bright background bleeds through as white.
      scene.background = new Color("#061a22");
      fogRef.current.density = 0.001;
      fogRef.current.color = new Color("#061a22");
    }
  }, [underwater, scene]);

  return (
    <>
      <Physics>
        <PlayerController />
      </Physics>

      <ambientLight intensity={underwater ? 0.3 : 0.8} />
      <directionalLight
        position={[40, 100, 30]}
        intensity={underwater ? 0.6 : 2.0}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <directionalLight position={[-20, 60, -10]} intensity={underwater ? 0.15 : 0.5} />

      <fogExp2 ref={fogRef} attach="fog" color="#061a22" density={0.001} />
      <color attach="background" args={["#87CEEB"]} />

      <WaterSurface position={[0, waterHeight, 0]} size={1000} />
      <SceneryObjects />
      <AnimatedBubbles />

      {!underwater && (
        <Sky
          sunPosition={[100, 60, 50]}
          turbidity={3}
          rayleigh={0.5}
          mieCoefficient={0.005}
          mieDirectionalG={0.8}
        />
      )}

      <Environment preset="sunset" environmentIntensity={0.3} />

      <EffectComposer multisampling={0} depthBuffer>
        <UnderwaterEffect />
      </EffectComposer>
    </>
  );
}
