/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
*/

import React, { useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";
import { Mesh, MeshStandardMaterial } from "three";

type GLTFResult = GLTF & {
  nodes: {
    Wheat: Mesh;
  };
  materials: {
    Yellow: MeshStandardMaterial;
  };
};

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/nature_pack/Wheat.glb"
  ) as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.Wheat.geometry}
        material={materials.Yellow}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={100}
      />
    </group>
  );
}
