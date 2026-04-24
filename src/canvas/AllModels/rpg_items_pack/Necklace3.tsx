import { useGLTF } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Necklace3_1: Mesh;
    Necklace3_2: Mesh;
    Necklace3_3: Mesh;
  };
  materials: {
    DarkBrown: MeshStandardMaterial;
    Golden: MeshStandardMaterial;
    Cyan: MeshStandardMaterial;
  };
};

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/rpg_items_pack/Necklace3.glb",
  ) as unknown as unknown as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <mesh geometry={nodes.Necklace3_1.geometry} material={materials.DarkBrown} />
        <mesh geometry={nodes.Necklace3_2.geometry} material={materials.Golden} />
        <mesh geometry={nodes.Necklace3_3.geometry} material={materials.Cyan} />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/rpg_items_pack/Necklace3.glb");
