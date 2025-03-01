/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
*/

import { useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial } from "three";
import { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    BirchTree_Snow_5_1: Mesh;
    BirchTree_Snow_5_2: Mesh;
    BirchTree_Snow_5_3: Mesh;
    BirchTree_Snow_5_4: Mesh;
    BirchTree_Snow_5_5: Mesh;
  };
  materials: {
    White: MeshStandardMaterial;
    Black: MeshStandardMaterial;
    Green: MeshStandardMaterial;
    Snow: MeshStandardMaterial;
    DarkGreen: MeshStandardMaterial;
  };
};

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/nature_pack/BirchTree_Snow_5.glb"
  ) as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <mesh
          geometry={nodes.BirchTree_Snow_5_1.geometry}
          material={materials.White}
        />
        <mesh
          geometry={nodes.BirchTree_Snow_5_2.geometry}
          material={materials.Black}
        />
        <mesh
          geometry={nodes.BirchTree_Snow_5_3.geometry}
          material={materials.Green}
        />
        <mesh
          geometry={nodes.BirchTree_Snow_5_4.geometry}
          material={materials.Snow}
        />
        <mesh
          geometry={nodes.BirchTree_Snow_5_5.geometry}
          material={materials.DarkGreen}
        />
      </group>
    </group>
  );
}
