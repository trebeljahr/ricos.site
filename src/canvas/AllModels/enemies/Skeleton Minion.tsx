import * as THREE from "three";
import React, { useEffect } from "react";
import { GroupProps, useGraph } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { GLTF, SkeletonUtils } from "three-stdlib";
import { CommonActions } from "@r3f/Dungeon/BuildingBlocks/CommonEnemy";
import { useGenericAnimationController } from "@r3f/Controllers/GenericAnimationController";
import { ActionName } from "../animals_pack/Stag";
import { mapCommonActionToSkeletonAction } from "@r3f/Dungeon/BuildingBlocks/SkeletonEnemy";

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    Skeleton_Minion_ArmLeft: THREE.SkinnedMesh;
    Skeleton_Minion_ArmRight: THREE.SkinnedMesh;
    Skeleton_Minion_Body: THREE.SkinnedMesh;
    Skeleton_Minion_Cloak: THREE.SkinnedMesh;
    Skeleton_Minion_LegLeft: THREE.SkinnedMesh;
    Skeleton_Minion_LegRight: THREE.SkinnedMesh;
    Skeleton_Minion_Eyes: THREE.SkinnedMesh;
    Skeleton_Minion_Head: THREE.SkinnedMesh;
    Skeleton_Minion_Jaw: THREE.SkinnedMesh;
    root: THREE.Bone;
  };
  materials: {
    skeleton: THREE.MeshStandardMaterial;
    Glow: THREE.MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

export function SkeletonMinion({
  animationToPlay = CommonActions.Idle,
  ...props
}: GroupProps & { animationToPlay?: CommonActions }) {
  const group = React.useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Skeleton Minion-transformed.glb"
  );
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as GLTFResult;
  const { actions } = useAnimations(animations, group);

  const result = useGenericAnimationController({ actions, fadeDuration: 0.5 });
  const { updateAnimation } = result;

  useEffect(() => {
    updateAnimation(mapCommonActionToSkeletonAction[animationToPlay], {
      looping: true,
    });
  }, [updateAnimation, animationToPlay]);

  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Root_Scene">
        <group name="Rig" scale={100}>
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh
          name="Skeleton_Minion_ArmLeft"
          geometry={nodes.Skeleton_Minion_ArmLeft.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Minion_ArmLeft.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Minion_ArmRight"
          geometry={nodes.Skeleton_Minion_ArmRight.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Minion_ArmRight.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Minion_Body"
          geometry={nodes.Skeleton_Minion_Body.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Minion_Body.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Minion_Cloak"
          geometry={nodes.Skeleton_Minion_Cloak.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Minion_Cloak.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Minion_LegLeft"
          geometry={nodes.Skeleton_Minion_LegLeft.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Minion_LegLeft.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Minion_LegRight"
          geometry={nodes.Skeleton_Minion_LegRight.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Minion_LegRight.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Minion_Eyes"
          geometry={nodes.Skeleton_Minion_Eyes.geometry}
          material={materials.Glow}
          skeleton={nodes.Skeleton_Minion_Eyes.skeleton}
          position={[0, 1.22, 0]}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Minion_Head"
          geometry={nodes.Skeleton_Minion_Head.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Minion_Head.skeleton}
          position={[0, 1.22, 0]}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Minion_Jaw"
          geometry={nodes.Skeleton_Minion_Jaw.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Minion_Jaw.skeleton}
          position={[0, 1.31, -0.03]}
          scale={100}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Skeleton Minion-transformed.glb");
