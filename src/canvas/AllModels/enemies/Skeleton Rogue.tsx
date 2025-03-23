import { useEffect, useMemo, useRef } from "react";
import { useGraph } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { GLTF, SkeletonUtils } from "three-stdlib";
import { useGenericAnimationController } from "@r3f/Controllers/GenericAnimationController";
import {
  mapCommonActionToSkeletonAction,
  SkeletonActionName,
  SkeletonEnemyProps,
} from "@r3f/Dungeon/BuildingBlocks/SkeletonEnemy";
import {
  AnimationClip,
  Bone,
  Group,
  Mesh,
  MeshStandardMaterial,
  SkinnedMesh,
} from "three";
import { CommonActions } from "@r3f/Dungeon/BuildingBlocks/CommonEnemy";

interface GLTFAction extends AnimationClip {
  name: SkeletonActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    Skeleton_Rogue_Hood: Mesh;
    Skeleton_Rogue_Cape: Mesh;
    Skeleton_Rogue_ArmLeft: SkinnedMesh;
    Skeleton_Rogue_ArmRight: SkinnedMesh;
    Skeleton_Rogue_Body: SkinnedMesh;
    Skeleton_Rogue_LegLeft: SkinnedMesh;
    Skeleton_Rogue_LegRight: SkinnedMesh;
    Skeleton_Rogue_Eyes: SkinnedMesh;
    Skeleton_Rogue_Head: SkinnedMesh;
    Skeleton_Rogue_Jaw: SkinnedMesh;
    root: Bone;
  };
  materials: {
    skeleton: MeshStandardMaterial;
    Glow: MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

export function SkeletonRogue({
  animationToPlay = CommonActions.Idle,
  ...props
}: SkeletonEnemyProps) {
  const group = useRef<Group>(null!);
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Skeleton Rogue-transformed.glb"
  );
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as GLTFResult;
  const { actions, mixer } = useAnimations(animations, group);

  const result = useGenericAnimationController({
    actions,
    mixer,
    defaultFadeDuration: 0.5,
  });
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
          name="Skeleton_Rogue_ArmLeft"
          geometry={nodes.Skeleton_Rogue_ArmLeft.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Rogue_ArmLeft.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Rogue_ArmRight"
          geometry={nodes.Skeleton_Rogue_ArmRight.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Rogue_ArmRight.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Rogue_Body"
          geometry={nodes.Skeleton_Rogue_Body.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Rogue_Body.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Rogue_LegLeft"
          geometry={nodes.Skeleton_Rogue_LegLeft.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Rogue_LegLeft.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Rogue_LegRight"
          geometry={nodes.Skeleton_Rogue_LegRight.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Rogue_LegRight.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Rogue_Eyes"
          geometry={nodes.Skeleton_Rogue_Eyes.geometry}
          material={materials.Glow}
          skeleton={nodes.Skeleton_Rogue_Eyes.skeleton}
          position={[0, 1.22, 0]}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Rogue_Head"
          geometry={nodes.Skeleton_Rogue_Head.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Rogue_Head.skeleton}
          position={[0, 1.22, 0]}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Rogue_Jaw"
          geometry={nodes.Skeleton_Rogue_Jaw.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Rogue_Jaw.skeleton}
          position={[0, 1.31, -0.03]}
          scale={100}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Skeleton Rogue-transformed.glb");
