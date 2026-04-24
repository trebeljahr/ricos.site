import { useGLTF } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Arrow_Golden_1: Mesh;
    Arrow_Golden_2: Mesh;
  };
  materials: {
    Golden: MeshStandardMaterial;
    LightWood: MeshStandardMaterial;
  };
};

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/rpg_items_pack/Arrow_Golden.glb",
  ) as unknown as unknown as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <mesh geometry={nodes.Arrow_Golden_1.geometry} material={materials.Golden} />
        <mesh geometry={nodes.Arrow_Golden_2.geometry} material={materials.LightWood} />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/rpg_items_pack/Arrow_Golden.glb");
