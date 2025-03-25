import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { HeightfieldCollider, RigidBody } from "@react-three/rapier";
import { useMemo, useRef } from "react";
import {
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  RepeatWrapping,
  ShaderMaterial,
} from "three";
import GrassField from "./GrassField";
import { generateTerrainData } from "./generateTerrainData";
import { blackPlaneMaterial } from "../BlackPlaneMaterial";

export default function Terrain() {
  const chunkSize = 10;
  const planeSize = 100;

  const grassTexture = useTexture("/3d-assets/grass/grass.jpg");
  const cloudTexture = useTexture("/3d-assets/grass/cloud.jpg");

  const meshRef = useRef<Mesh>(null!);

  grassTexture.wrapS = grassTexture.wrapT = RepeatWrapping;
  cloudTexture.wrapS = cloudTexture.wrapT = RepeatWrapping;
  grassTexture.repeat.set(32, 32);
  cloudTexture.repeat.set(32, 32);

  const terrainData = useMemo(() => {
    return generateTerrainData(planeSize, chunkSize);
  }, []);

  if (!terrainData) return null;

  return (
    <RigidBody type="fixed" colliders={false} friction={1}>
      <mesh receiveShadow ref={meshRef} material={blackPlaneMaterial}>
        <primitive object={terrainData.geometry} />
      </mesh>
      <HeightfieldCollider
        args={[chunkSize, chunkSize, terrainData.heights, terrainData.scale]}
        restitution={0.2}
      />
      <GrassField
        terrainData={terrainData}
        chunkSize={chunkSize}
        planeSize={planeSize}
      />
    </RigidBody>
  );
}
