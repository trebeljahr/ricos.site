import { useGenericAnimationController } from "@r3f/Controllers/GenericAnimationController";
import { CommonActions } from "@r3f/Dungeon/BuildingBlocks/CommonEnemy";
import {
  mapCommonActionToSkeletonAction,
  SkeletonActionName,
  SkeletonEnemyProps,
} from "@r3f/Dungeon/BuildingBlocks/SkeletonEnemy";
import { useAnimations, useGLTF } from "@react-three/drei";
import { useGraph } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AnimationClip,
  Bone,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SkinnedMesh,
} from "three";
import { GLTF, SkeletonUtils } from "three-stdlib";
import { SkeletonStaff } from "../weapons/Staff (6)";
interface GLTFAction extends AnimationClip {
  name: SkeletonActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    Skeleton_Warrior_Helmet: Mesh;
    Skeleton_Warrior_ArmLeft: SkinnedMesh;
    Skeleton_Warrior_ArmRight: SkinnedMesh;
    Skeleton_Warrior_Body: SkinnedMesh;
    Skeleton_Warrior_Cloak: SkinnedMesh;
    Skeleton_Warrior_LegLeft: SkinnedMesh;
    Skeleton_Warrior_LegRight: SkinnedMesh;
    Skeleton_Warrior_Eyes: SkinnedMesh;
    Skeleton_Warrior_Head: SkinnedMesh;
    Skeleton_Warrior_Jaw: SkinnedMesh;
    root: Bone;
  };
  materials: {
    skeleton: MeshStandardMaterial;
    Glow: MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

export function SkeletonWarrior({
  animationToPlay = CommonActions.Idle,
  ...props
}: SkeletonEnemyProps) {
  const group = useRef<Group>(null!);
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Skeleton Warrior-transformed.glb"
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
          name="Skeleton_Warrior_ArmLeft"
          geometry={nodes.Skeleton_Warrior_ArmLeft.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Warrior_ArmLeft.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Warrior_ArmRight"
          geometry={nodes.Skeleton_Warrior_ArmRight.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Warrior_ArmRight.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Warrior_Body"
          geometry={nodes.Skeleton_Warrior_Body.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Warrior_Body.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Warrior_Cloak"
          geometry={nodes.Skeleton_Warrior_Cloak.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Warrior_Cloak.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Warrior_LegLeft"
          geometry={nodes.Skeleton_Warrior_LegLeft.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Warrior_LegLeft.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Warrior_LegRight"
          geometry={nodes.Skeleton_Warrior_LegRight.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Warrior_LegRight.skeleton}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Warrior_Eyes"
          geometry={nodes.Skeleton_Warrior_Eyes.geometry}
          material={materials.Glow}
          skeleton={nodes.Skeleton_Warrior_Eyes.skeleton}
          position={[0, 1.22, 0]}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Warrior_Head"
          geometry={nodes.Skeleton_Warrior_Head.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Warrior_Head.skeleton}
          position={[0, 1.22, 0]}
          scale={100}
        />
        <skinnedMesh
          name="Skeleton_Warrior_Jaw"
          geometry={nodes.Skeleton_Warrior_Jaw.geometry}
          material={materials.skeleton}
          skeleton={nodes.Skeleton_Warrior_Jaw.skeleton}
          position={[0, 1.31, -0.03]}
          scale={100}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Skeleton Warrior-transformed.glb");
