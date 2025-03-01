/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
*/

import React, { useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";
import { Mesh, MeshStandardMaterial } from "three";

type GLTFResult = GLTF & {
  nodes: {
    WoodLog_1: Mesh;
    WoodLog_2: Mesh;
    WoodLog_3: Mesh;
  };
  materials: {
    Wood: MeshStandardMaterial;
    Mushroom_Top: MeshStandardMaterial;
    Mushroom_Bottom: MeshStandardMaterial;
  };
};

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/nature_pack/WoodLog.glb"
  ) as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <mesh geometry={nodes.WoodLog_1.geometry} material={materials.Wood} />
        <mesh
          geometry={nodes.WoodLog_2.geometry}
          material={materials.Mushroom_Top}
        />
        <mesh
          geometry={nodes.WoodLog_3.geometry}
          material={materials.Mushroom_Bottom}
        />
      </group>
    </group>
  );
}
