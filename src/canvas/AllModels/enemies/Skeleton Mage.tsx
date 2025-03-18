import React, { useEffect, useMemo, useRef } from "react";
import { GroupProps, useGraph } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { GLTF, SkeletonUtils } from "three-stdlib";
import { CommonActions } from "@r3f/Dungeon/BuildingBlocks/CommonEnemy";
import {
  AnimationClip,
  Bone,
  Group,
  Mesh,
  MeshStandardMaterial,
  SkinnedMesh,
} from "three";
import { useGenericAnimationController } from "@r3f/Controllers/GenericAnimationController";
import {
  mapCommonActionToSkeletonAction,
  SkeletonActionName,
} from "@r3f/Dungeon/BuildingBlocks/SkeletonEnemy";

interface GLTFAction extends AnimationClip {
  name: SkeletonActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    Skeleton_Mage_Hat: Mesh;
    Skeleton_Mage_ArmLeft: SkinnedMesh;
    Skeleton_Mage_ArmRight: SkinnedMesh;
    Skeleton_Mage_Body: SkinnedMesh;
    Skeleton_Mage_LegLeft: SkinnedMesh;
    Skeleton_Mage_LegRight: SkinnedMesh;
    Skeleton_Mage_Eyes: SkinnedMesh;
    Skeleton_Mage_Jaw: SkinnedMesh;
    Skeleton_Mage_Skull: SkinnedMesh;
    root: Bone;
  };
  materials: {
    skeleton: MeshStandardMaterial;
    Glow: MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

export function SkeletonMage({
  animationToPlay = CommonActions.Idle,
  ...props
}: GroupProps & { animationToPlay?: CommonActions }) {
  const group = useRef<Group>(null!);
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Skeleton Mage-transformed.glb"
  );
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
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
          name="Skeleton_Mage_ArmLeft"
          geometry={nodes.Skeleton_Mage_ArmLeft.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Mage_ArmLeft.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Mage_ArmRight"
          geometry={nodes.Skeleton_Mage_ArmRight.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Mage_ArmRight.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Mage_Body"
          geometry={nodes.Skeleton_Mage_Body.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Mage_Body.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Mage_LegLeft"
          geometry={nodes.Skeleton_Mage_LegLeft.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Mage_LegLeft.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Mage_LegRight"
          geometry={nodes.Skeleton_Mage_LegRight.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Mage_LegRight.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Mage_Eyes"
          geometry={nodes.Skeleton_Mage_Eyes.geometry}
          material={materials.Glow}
          skeleton={nodes.Skeleton_Mage_Eyes.skeleton}
          position={[0, 1.22, 0]}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Mage_Jaw"
          geometry={nodes.Skeleton_Mage_Jaw.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Mage_Jaw.skeleton}
          position={[0, 1.31, -0.03]}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Mage_Skull"
          geometry={nodes.Skeleton_Mage_Skull.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Mage_Skull.skeleton}
          position={[0, 1.22, 0]}
          scale={100}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Skeleton Mage-transformed.glb");
