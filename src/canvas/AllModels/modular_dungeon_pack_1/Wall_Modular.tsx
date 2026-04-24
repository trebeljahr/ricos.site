import { useGLTF } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Wall_Modular_1: Mesh;
    Wall_Modular_2: Mesh;
    Wall_Modular_3: Mesh;
  };
  materials: {
    Wall_Dark: MeshStandardMaterial;
    Wall_Medium: MeshStandardMaterial;
    Wall_Highlights: MeshStandardMaterial;
  };
};

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/modular_dungeon_1/Wall_Modular.glb",
  ) as unknown as unknown as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <mesh geometry={nodes.Wall_Modular_1.geometry} material={materials.Wall_Dark} />
        <mesh geometry={nodes.Wall_Modular_2.geometry} material={materials.Wall_Medium} />
        <mesh geometry={nodes.Wall_Modular_3.geometry} material={materials.Wall_Highlights} />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/modular_dungeon_1/Wall_Modular.glb");
