import * as THREE from "three";
import React from "react";
import { useGraph } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { GLTF, SkeletonUtils } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    v3001_1: THREE.SkinnedMesh;
    v3001_2: THREE.SkinnedMesh;
    v3001_3: THREE.SkinnedMesh;
    v3001_4: THREE.SkinnedMesh;
    v3001_5: THREE.SkinnedMesh;
    v3001_6: THREE.SkinnedMesh;
    spine002: THREE.Bone;
  };
  materials: {
    PaletteMaterial001: THREE.MeshStandardMaterial;
    PaletteMaterial002: THREE.MeshStandardMaterial;
    PaletteMaterial003: THREE.MeshStandardMaterial;
  };
};

export function Model(props: JSX.IntrinsicElements["group"]) {
  const { scene } = useGLTF(
    "/3d-assets/glb/enemies/Rigged robot-transformed.glb"
  );
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <primitive object={nodes.spine002} />
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <skinnedMesh
          geometry={nodes.v3001_1.geometry}
          material={materials.PaletteMaterial001}
          skeleton={nodes.v3001_1.skeleton}
        />
        <skinnedMesh
          geometry={nodes.v3001_2.geometry}
          material={materials.PaletteMaterial001}
          skeleton={nodes.v3001_2.skeleton}
        />
        <skinnedMesh
          geometry={nodes.v3001_3.geometry}
          material={materials.PaletteMaterial001}
          skeleton={nodes.v3001_3.skeleton}
        />
        <skinnedMesh
          geometry={nodes.v3001_4.geometry}
          material={materials.PaletteMaterial002}
          skeleton={nodes.v3001_4.skeleton}
        />
        <skinnedMesh
          geometry={nodes.v3001_5.geometry}
          material={materials.PaletteMaterial002}
          skeleton={nodes.v3001_5.skeleton}
        />
        <skinnedMesh
          geometry={nodes.v3001_6.geometry}
          material={materials.PaletteMaterial003}
          skeleton={nodes.v3001_6.skeleton}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Rigged robot-transformed.glb");
