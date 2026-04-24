import { useGLTF } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Tree2_1: Mesh;
    Tree2_2: Mesh;
  };
  materials: {
    Leaves: MeshStandardMaterial;
    Tree: MeshStandardMaterial;
  };
};

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/simple_nature_pack/Tree2.glb",
  ) as unknown as unknown as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <mesh geometry={nodes.Tree2_1.geometry} material={materials.Leaves} />
        <mesh geometry={nodes.Tree2_2.geometry} material={materials.Tree} />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/simple_nature_pack/Tree2.glb");
