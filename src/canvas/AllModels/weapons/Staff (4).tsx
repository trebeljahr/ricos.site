import * as THREE from "three";
import React from "react";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    ["Staff_04_Circle011-Mesh"]: THREE.Mesh;
    ["Staff_04_Circle011-Mesh_1"]: THREE.Mesh;
    ["Staff_04_Circle011-Mesh_2"]: THREE.Mesh;
  };
  materials: {
    Dark_blue: THREE.MeshStandardMaterial;
    Iron_staff_04: THREE.MeshStandardMaterial;
    Cyrstal_staff_04: THREE.MeshStandardMaterial;
  };
};

export function Staff4(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Staff-4-transformed.glb"
  ) as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes["Staff_04_Circle011-Mesh"].geometry}
        material={materials.Dark_blue}
      />
      <mesh
        geometry={nodes["Staff_04_Circle011-Mesh_1"].geometry}
        material={materials.Iron_staff_04}
      />
      <mesh
        geometry={nodes["Staff_04_Circle011-Mesh_2"].geometry}
        material={materials.Cyrstal_staff_04}
      />
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/weapons/Staff-transformed.glb");
