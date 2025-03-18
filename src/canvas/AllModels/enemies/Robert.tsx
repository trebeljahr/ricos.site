import * as THREE from "three";
import React from "react";
import { useGraph } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { GLTF, SkeletonUtils } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Cube_1: THREE.SkinnedMesh;
    Cube_2: THREE.SkinnedMesh;
    Cube_3: THREE.SkinnedMesh;
    Body: THREE.Bone;
    TAIL_1: THREE.Bone;
  };
  materials: {
    ["Material.002"]: THREE.MeshStandardMaterial;
    ["Material.001"]: THREE.MeshStandardMaterial;
    ["Material.003"]: THREE.MeshStandardMaterial;
  };
};

export function RobertDinosaur(props: JSX.IntrinsicElements["group"]) {
  const { scene } = useGLTF("/3d-assets/glb/enemies/Robert-transformed.glb");
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <primitive object={nodes.Body} />
      <primitive object={nodes.TAIL_1} />
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <skinnedMesh
          geometry={nodes.Cube_1.geometry}
          material={materials["Material.002"]}
          skeleton={nodes.Cube_1.skeleton}
        />
        <skinnedMesh
          geometry={nodes.Cube_2.geometry}
          material={materials["Material.001"]}
          skeleton={nodes.Cube_2.skeleton}
        />
        <skinnedMesh
          geometry={nodes.Cube_3.geometry}
          material={materials["Material.003"]}
          skeleton={nodes.Cube_3.skeleton}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Robert-transformed.glb");
