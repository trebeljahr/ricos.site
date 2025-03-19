import * as THREE from "three";
import React from "react";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    ["Staff_02_Circle001-Mesh"]: THREE.Mesh;
    ["Staff_02_Circle001-Mesh_1"]: THREE.Mesh;
    ["Staff_02_Circle001-Mesh_2"]: THREE.Mesh;
    ["Staff_02_Circle001-Mesh_3"]: THREE.Mesh;
  };
  materials: {
    Iron_staff_02: THREE.MeshStandardMaterial;
    Wood_staff_02: THREE.MeshStandardMaterial;
    Green_crystal: THREE.MeshStandardMaterial;
    Purple_ribbon: THREE.MeshStandardMaterial;
  };
};

export function Staff2(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Staff (2)-transformed.glb"
  ) as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes["Staff_02_Circle001-Mesh"].geometry}
        material={materials.Iron_staff_02}
      />
      <mesh
        geometry={nodes["Staff_02_Circle001-Mesh_1"].geometry}
        material={materials.Wood_staff_02}
      />
      <mesh
        geometry={nodes["Staff_02_Circle001-Mesh_2"].geometry}
        material={materials.Green_crystal}
      />
      <mesh
        geometry={nodes["Staff_02_Circle001-Mesh_3"].geometry}
        material={materials.Purple_ribbon}
      />
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/weapons/Staff (2)-transformed.glb");
