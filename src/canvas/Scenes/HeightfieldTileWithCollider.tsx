import {
  flatShading,
  mode,
  normalsDebug,
  wireframe,
} from "@r3f/ChunkGenerationSystem/config";
import { useHelper } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { ReactNode, useEffect, useRef } from "react";
import { BufferGeometry, DoubleSide, Material, Mesh } from "three";
import { VertexNormalsHelper } from "three-stdlib";

const defaultMaterial = () => (
  <meshPhysicalMaterial
    color="#dee6ef"
    side={DoubleSide}
    flatShading={flatShading}
    wireframe={wireframe}
  />
);

export const HeightfieldTileWithCollider = ({
  geometry,
  heightfield,
  material = defaultMaterial,
}: {
  geometry: BufferGeometry;
  heightfield: number[];
  material?: ((...args: any) => ReactNode) | Material;
}) => {
  const meshRef = useRef<Mesh>(null!);

  useHelper(normalsDebug && meshRef, VertexNormalsHelper, 1, 0xff0000);
  const MaterialComponent =
    !(material instanceof Material) &&
    (material as (...args: any) => ReactNode);

  return (
    <>
      <RigidBody type="fixed" colliders="trimesh">
        <mesh
          ref={meshRef}
          geometry={geometry}
          material={material instanceof Material ? material : undefined}
          // castShadow={true}
          receiveShadow={true}
          visible={mode !== "none"}
        >
          {MaterialComponent && <MaterialComponent displacementScale={0} />}
        </mesh>
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
