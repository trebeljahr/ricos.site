import * as THREE from "three";
import React from "react";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    mesh2096346305: THREE.Mesh;
    mesh2096346305_1: THREE.Mesh;
    group1762687703: THREE.Mesh;
  };
  materials: {
    mat20: THREE.MeshStandardMaterial;
    mat17: THREE.MeshStandardMaterial;
    mat2: THREE.MeshStandardMaterial;
  };
};

export function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/Magick wand-transformed.glb"
  ) as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.group1762687703.geometry}
        material={materials.mat2}
      />
      <mesh
        geometry={nodes.mesh2096346305.geometry}
        material={materials.mat20}
      />
      <mesh
        geometry={nodes.mesh2096346305_1.geometry}
        material={materials.mat17}
      />
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/weapons/Magick wand-transformed.glb");
