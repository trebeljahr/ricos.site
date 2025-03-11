import {
  flatShading,
  mode,
  normalsDebug,
  wireframe,
} from "@r3f/ChunkGenerationSystem/config";
import { useHelper } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { useRef } from "react";
import {
  BufferGeometry,
  DoubleSide,
  Material,
  Mesh,
  MeshPhysicalMaterial,
} from "three";
import { VertexNormalsHelper } from "three-stdlib";

const defaultMaterial = new MeshPhysicalMaterial({
  color: "#dee6ef",
  side: DoubleSide,
  flatShading,
  wireframe,
});

export const HeightfieldTileWithCollider = ({
  geometry: geometry,
  heightfield,
  material = defaultMaterial,
}: {
  geometry: BufferGeometry;
  heightfield: number[];
  material?: Material;
}) => {
  const divisions = Math.sqrt(heightfield.length);

  const meshRef = useRef<Mesh>(null!);

  useHelper(normalsDebug && meshRef, VertexNormalsHelper, 1, 0xff0000);

  return (
    <>
      <RigidBody type="fixed" colliders="trimesh">
        <mesh
          ref={meshRef}
          geometry={geometry}
          material={material}
          // castShadow={true}
          receiveShadow={true}
          visible={mode !== "none"}
        />
      </RigidBody>
      {/* <RigidBody colliders={false}>
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
      </RigidBody> */}
    </>
  );
};
