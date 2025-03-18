import * as THREE from "three";
import React from "react";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Skeleton_Axe: THREE.Mesh;
  };
  materials: {
    skeleton: THREE.MeshStandardMaterial;
  };
};

export function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Axe-transformed.glb"
  ) as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.Skeleton_Axe.geometry}
        material={materials.skeleton}
        scale={100}
      />
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/weapons/Axe-transformed.glb");
