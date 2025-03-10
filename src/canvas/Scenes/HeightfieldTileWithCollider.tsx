import { BiomeType, getBiome } from "@r3f/ChunkGenerationSystem/Biomes";
import {
  flatShading,
  mode,
  normalsDebug,
  tileSize,
  wireframe,
  withAutoComputedNormals,
} from "@r3f/ChunkGenerationSystem/config";
import { getHeight } from "@r3f/ChunkGenerationSystem/getHeight";
import { TerrainData } from "@r3f/Workers/terrainWorker";
import { useHelper } from "@react-three/drei";
import { HeightfieldCollider, RigidBody } from "@react-three/rapier";
import { useControls } from "leva";
import { useEffect, useMemo, useRef, useState } from "react";
import { moistureNoise, temperatureNoise } from "src/lib/utils/noise";
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshPhysicalMaterial,
  PlaneGeometry,
  Vector3,
} from "three";
import { VertexNormalsHelper } from "three-stdlib";

const mat = new MeshPhysicalMaterial({
  color: "#EDC9AF",
  side: DoubleSide,
  flatShading,
  wireframe,
});

export const HeightfieldTileWithCollider = ({
  geo,
  heightfield,
}: {
  geo: BufferGeometry;
  heightfield: number[];
}) => {
  const divisions = Math.sqrt(heightfield.length);

  const meshRef = useRef<Mesh>(null!);

  useHelper(normalsDebug && meshRef, VertexNormalsHelper, 1, 0xff0000);

  return (
    <RigidBody colliders={false}>
      <mesh
        ref={meshRef}
        geometry={geo}
        material={mat}
        castShadow
        receiveShadow
      />

      <group rotation={[0, -Math.PI / 2, 0]}>
        <HeightfieldCollider
          args={[
            divisions - 1,
            divisions - 1,
            heightfield,
            { x: tileSize, y: 1, z: tileSize },
          ]}
        />
      </group>
    </RigidBody>
  );
};
