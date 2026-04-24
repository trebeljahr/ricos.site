import {
  flatShading,
  mode,
  normalsDebug,
  tileSize,
  wireframe,
} from "@r3f/ChunkGenerationSystem/config";
import { useHelper } from "@react-three/drei";
import { HeightfieldCollider, RigidBody } from "@react-three/rapier";
import { type ReactNode, useRef } from "react";
import { type BufferGeometry, DoubleSide, Material, type Mesh } from "three";
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
  withCollider = true,
}: {
  geometry: BufferGeometry;
  heightfield: number[];
  material?: ((...args: any) => ReactNode) | Material;
  withCollider?: boolean;
}) => {
  const meshRef = useRef<Mesh>(null!);

  useHelper(normalsDebug && meshRef, VertexNormalsHelper, 1, 0xff0000);
  const MaterialComponent =
    !(material instanceof Material) && (material as (...args: any) => ReactNode);

  const resolution = Math.round(Math.sqrt(heightfield.length));
  const divisions = resolution - 1;

  return (
    <>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material instanceof Material ? material : undefined}
        receiveShadow={true}
        visible={mode !== "none"}
      >
        {MaterialComponent && <MaterialComponent displacementScale={0} />}
      </mesh>
      {withCollider && (
        <RigidBody type="fixed" colliders={false}>
          <group rotation={[0, -Math.PI / 2, 0]}>
            <HeightfieldCollider
              args={[divisions, divisions, heightfield, { x: tileSize, y: 1, z: tileSize }]}
            />
          </group>
        </RigidBody>
      )}
    </>
  );
};
