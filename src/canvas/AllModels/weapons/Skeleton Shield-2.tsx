import * as THREE from "three";
import React from "react";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Skeleton_Shield_Small_B: THREE.Mesh;
  };
  materials: {
    skeleton: THREE.MeshStandardMaterial;
  };
};

export function SkeletonShield2(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Skeleton Shield-vS3QC5AvpV-transformed.glb"
  ) as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.Skeleton_Shield_Small_B.geometry}
        material={materials.skeleton}
        scale={100}
      />
    </group>
  );
}

useGLTF.preload(
  "/3d-assets/glb/weapons/Skeleton Shield-vS3QC5AvpV-transformed.glb"
);
