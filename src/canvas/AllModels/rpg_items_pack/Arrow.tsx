import { useGLTF } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Arrow_1: Mesh;
    Arrow_2: Mesh;
    Arrow_3: Mesh;
    Arrow_4: Mesh;
  };
  materials: {
    DarkRed: MeshStandardMaterial;
    LightWood: MeshStandardMaterial;
    Steel: MeshStandardMaterial;
    LightSteel: MeshStandardMaterial;
  };
};

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/rpg_items_pack/Arrow.glb",
  ) as unknown as unknown as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <mesh geometry={nodes.Arrow_1.geometry} material={materials.DarkRed} />
        <mesh geometry={nodes.Arrow_2.geometry} material={materials.LightWood} />
        <mesh geometry={nodes.Arrow_3.geometry} material={materials.Steel} />
        <mesh geometry={nodes.Arrow_4.geometry} material={materials.LightSteel} />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/rpg_items_pack/Arrow.glb");
