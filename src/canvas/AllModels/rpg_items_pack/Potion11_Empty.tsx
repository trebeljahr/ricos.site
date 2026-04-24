import { useGLTF } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Potion11_Empty_1: Mesh;
    Potion11_Empty_2: Mesh;
  };
  materials: {
    Glass: MeshStandardMaterial;
    Brown: MeshStandardMaterial;
  };
};

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/rpg_items_pack/Potion11_Empty.glb",
  ) as unknown as unknown as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <mesh geometry={nodes.Potion11_Empty_1.geometry} material={materials.Glass} />
        <mesh geometry={nodes.Potion11_Empty_2.geometry} material={materials.Brown} />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/rpg_items_pack/Potion11_Empty.glb");
