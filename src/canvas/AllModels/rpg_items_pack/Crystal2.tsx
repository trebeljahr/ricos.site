/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
*/

import { useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";
import { Mesh, MeshStandardMaterial } from "three";

type GLTFResult = GLTF & {
  nodes: {
    Crystal2: Mesh;
  };
  materials: {
    Pink: MeshStandardMaterial;
  };
};

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/rpg_items_pack/Crystal2.glb"
  ) as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.Crystal2.geometry}
        material={materials.Pink}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={100}
      />
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/rpg_items_pack/Crystal2.glb");
