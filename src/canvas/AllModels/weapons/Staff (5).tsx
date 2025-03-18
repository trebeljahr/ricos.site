import * as THREE from "three";
import React from "react";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    ["Staff_05_Circle016-Mesh"]: THREE.Mesh;
    ["Staff_05_Circle016-Mesh_1"]: THREE.Mesh;
    ["Staff_05_Circle016-Mesh_2"]: THREE.Mesh;
  };
  materials: {
    Brown: THREE.MeshStandardMaterial;
    Moon: THREE.MeshStandardMaterial;
    Spikes: THREE.MeshStandardMaterial;
  };
};

export function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Staff (5)-transformed.glb"
  ) as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes["Staff_05_Circle016-Mesh"].geometry}
        material={materials.Brown}
      />
      <mesh
        geometry={nodes["Staff_05_Circle016-Mesh_1"].geometry}
        material={materials.Moon}
      />
      <mesh
        geometry={nodes["Staff_05_Circle016-Mesh_2"].geometry}
        material={materials.Spikes}
      />
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/weapons/Staff (5)-transformed.glb");
