import * as THREE from "three";
import React from "react";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Skeleton_Blade: THREE.Mesh;
  };
  materials: {
    skeleton: THREE.MeshStandardMaterial;
  };
};

export function SkeletonBlade(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Blade-transformed.glb"
  ) as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.Skeleton_Blade.geometry}
        material={materials.skeleton}
        scale={100}
      />
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/weapons/Blade-transformed.glb");
