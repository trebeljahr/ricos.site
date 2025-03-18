import * as THREE from "three";
import React from "react";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Geo_Dragon: THREE.Mesh;
  };
  materials: {
    lambert2SG: THREE.MeshStandardMaterial;
  };
};

export function Dragon(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/enemies/Dragon-transformed.glb"
  ) as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.Geo_Dragon.geometry}
        material={materials.lambert2SG}
      />
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Dragon-transformed.glb");
