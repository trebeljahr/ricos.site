import { useGLTF } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Table_Small_1: Mesh;
    Table_Small_2: Mesh;
    Table_Small_3: Mesh;
  };
  materials: {
    Wood: MeshStandardMaterial;
    DarkWood: MeshStandardMaterial;
    DarkMetal: MeshStandardMaterial;
  };
};

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/modular_dungeon_1/Table_Small.glb",
  ) as unknown as unknown as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <mesh geometry={nodes.Table_Small_1.geometry} material={materials.Wood} />
        <mesh geometry={nodes.Table_Small_2.geometry} material={materials.DarkWood} />
        <mesh geometry={nodes.Table_Small_3.geometry} material={materials.DarkMetal} />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/modular_dungeon_1/Table_Small.glb");
