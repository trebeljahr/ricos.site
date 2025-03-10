/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
*/

import { useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial } from "three";
import { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    BushBerries_1_1: Mesh;
    BushBerries_1_2: Mesh;
  };
  materials: {
    Green: MeshStandardMaterial;
    Berry: MeshStandardMaterial;
  };
};

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/nature_pack/BushBerries_1.glb"
  ) as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <mesh
          geometry={nodes.BushBerries_1_1.geometry}
          material={materials.Green}
        />
        <mesh
          geometry={nodes.BushBerries_1_2.geometry}
          material={materials.Berry}
        />
      </group>
    </group>
  );
}
