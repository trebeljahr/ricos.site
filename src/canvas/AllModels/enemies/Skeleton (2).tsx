import * as THREE from "three";
import React from "react";
import { useGraph } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { GLTF, SkeletonUtils } from "three-stdlib";

type ActionName =
  | "SkeletonArmature|Skeleton_Attack"
  | "SkeletonArmature|Skeleton_Death"
  | "SkeletonArmature|Skeleton_Idle"
  | "SkeletonArmature|Skeleton_Running"
  | "SkeletonArmature|Skeleton_Spawn";

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    Cylinder001: THREE.SkinnedMesh;
    Hips: THREE.Bone;
  };
  materials: {
    Skeleton: THREE.MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

export function Model(props: JSX.IntrinsicElements["group"]) {
  const group = React.useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Skeleton (2)-transformed.glb"
  );
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as GLTFResult;
  const { actions } = useAnimations(animations, group);
  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Root_Scene">
        <group
          name="SkeletonArmature"
          position={[0.01, 1.35, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={100}
        >
          <primitive object={nodes.Hips} />
        </group>
        <skinnedMesh
          name="Cylinder001"
          geometry={nodes.Cylinder001.geometry}
          material={materials.Skeleton}
          skeleton={nodes.Cylinder001.skeleton}
          position={[0, 3, 0.12]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={100}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Skeleton (2)-transformed.glb");
