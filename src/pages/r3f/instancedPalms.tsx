import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stats } from "@react-three/drei";
import { Suspense, useRef } from "react";
import { InstancedPalmTree } from "@models/nature_pack/PalmTree_1";
import { Group, Vector2, Vector3 } from "three";

function generatePalmPositions(count: number, radius: number): Vector3[] {
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius;
    return new Vector3(
      Math.cos(angle) * distance,
      0,
      Math.sin(angle) * distance
    );
  });
}

export function PalmCircle() {
  const groupRef = useRef<Group>(null!);
  const positions = generatePalmPositions(50, 5);

  const scales = Array.from(
    { length: positions.length },
    () => 0.5 + Math.random() * 0.7
  );

  return (
    <group ref={groupRef}>
      <InstancedPalmTree positions={positions} scales={scales} />
    </group>
  );
}

// Main component
export default function InstancedPalmsDemo() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas shadows camera={{ position: [0, 30, 70], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <directionalLight
          position={[10, 10, 10]}
          castShadow
          intensity={1.5}
          shadow-mapSize={[2048, 2048]}
        />

        <Suspense fallback={null}>
          <PalmCircle />

          {/* Ground plane */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
            position={[0, -0.5, 0]}
          >
            <planeGeometry args={[200, 200]} />
            <meshStandardMaterial color="#f0c68c" />
          </mesh>
        </Suspense>

        <Stats />
        <OrbitControls />
        <gridHelper args={[100, 100]} />
      </Canvas>
    </div>
  );
}
