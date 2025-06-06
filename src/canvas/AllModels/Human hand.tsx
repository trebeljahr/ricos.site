import React from "react";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";
import { Mesh, MeshStandardMaterial } from "three";

type GLTFResult = GLTF & {
  nodes: {
    pasted__Arm_pasted__Body_LowRes_group: Mesh;
  };
  materials: {
    lambert2SG: MeshStandardMaterial;
  };
};

export function HumanHand(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/Human hand-transformed.glb"
  ) as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.pasted__Arm_pasted__Body_LowRes_group.geometry}
        material={materials.lambert2SG}
      />
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/Human hand-transformed.glb");
