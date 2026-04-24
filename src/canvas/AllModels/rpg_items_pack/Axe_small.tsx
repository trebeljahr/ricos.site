import { useGLTF } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Axe_small_1: Mesh;
    Axe_small_2: Mesh;
    Axe_small_3: Mesh;
    Axe_small_4: Mesh;
  };
  materials: {
    DarkWood: MeshStandardMaterial;
    LightWood: MeshStandardMaterial;
    Steel: MeshStandardMaterial;
    LightSteel: MeshStandardMaterial;
  };
};

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/rpg_items_pack/Axe_small.glb",
  ) as unknown as unknown as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <mesh geometry={nodes.Axe_small_1.geometry} material={materials.DarkWood} />
        <mesh geometry={nodes.Axe_small_2.geometry} material={materials.LightWood} />
        <mesh geometry={nodes.Axe_small_3.geometry} material={materials.Steel} />
        <mesh geometry={nodes.Axe_small_4.geometry} material={materials.LightSteel} />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/rpg_items_pack/Axe_small.glb");
