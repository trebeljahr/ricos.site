import * as THREE from "three";
import React from "react";
import { useGraph } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { GLTF, SkeletonUtils } from "three-stdlib";

type ActionName =
  | "1H_Melee_Attack_Chop"
  | "1H_Melee_Attack_Jump_Chop"
  | "1H_Melee_Attack_Slice_Diagonal"
  | "1H_Melee_Attack_Slice_Horizontal"
  | "1H_Melee_Attack_Stab"
  | "1H_Ranged_Aiming"
  | "1H_Ranged_Reload"
  | "1H_Ranged_Shoot"
  | "1H_Ranged_Shooting"
  | "2H_Melee_Attack_Chop"
  | "2H_Melee_Attack_Slice"
  | "2H_Melee_Attack_Spin"
  | "2H_Melee_Attack_Spinning"
  | "2H_Melee_Attack_Stab"
  | "2H_Melee_Idle"
  | "2H_Ranged_Aiming"
  | "2H_Ranged_Reload"
  | "2H_Ranged_Shoot"
  | "2H_Ranged_Shooting"
  | "Block"
  | "Block_Attack"
  | "Block_Hit"
  | "Blocking"
  | "Cheer"
  | "Death_A"
  | "Death_A_Pose"
  | "Death_B"
  | "Death_B_Pose"
  | "Death_C_Pose"
  | "Death_C_Skeletons"
  | "Death_C_Skeletons_Resurrect"
  | "Dodge_Backward"
  | "Dodge_Forward"
  | "Dodge_Left"
  | "Dodge_Right"
  | "Dualwield_Melee_Attack_Chop"
  | "Dualwield_Melee_Attack_Slice"
  | "Dualwield_Melee_Attack_Stab"
  | "Hit_A"
  | "Hit_B"
  | "Idle"
  | "Idle_Combat"
  | "Interact"
  | "Jump_Full_Long"
  | "Jump_Full_Short"
  | "Jump_Idle"
  | "Jump_Start"
  | "Jump_Land"
  | "Lie_Down"
  | "Lie_Idle"
  | "Lie_Pose"
  | "Lie_StandUp"
  | "PickUp"
  | "Running_A"
  | "Running_B"
  | "Running_C"
  | "Running_Strafe_Left"
  | "Running_Strafe_Right"
  | "Sit_Chair_Down"
  | "Sit_Chair_Idle"
  | "Sit_Chair_Pose"
  | "Sit_Floor_Down"
  | "Sit_Floor_Idle"
  | "Sit_Floor_Pose"
  | "Sit_Chair_StandUp"
  | "Sit_Floor_StandUp"
  | "Skeleton_Inactive_Standing_Pose"
  | "Skeletons_Awaken_Floor"
  | "Skeletons_Awaken_Floor_Long"
  | "Skeletons_Inactive_Floor_Pose"
  | "Skeletons_Awaken_Standing"
  | "Spawn_Air"
  | "Spawn_Ground"
  | "Spawn_Ground_Skeletons"
  | "Spellcast_Long"
  | "Spellcast_Raise"
  | "Spellcast_Shoot"
  | "Spellcast_Summon"
  | "Spellcasting"
  | "Taunt"
  | "Taunt_Longer"
  | "Throw"
  | "Unarmed_Idle"
  | "Unarmed_Melee_Attack_Kick"
  | "Unarmed_Melee_Attack_Punch_A"
  | "Unarmed_Melee_Attack_Punch_B"
  | "Unarmed_Pose"
  | "Use_Item"
  | "Walking_A"
  | "Walking_B"
  | "Walking_Backwards"
  | "Walking_C"
  | "Walking_D_Skeletons"
  | "Idle_B";

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    Skeleton_Rogue_Hood: THREE.Mesh;
    Skeleton_Rogue_Cape: THREE.Mesh;
    Skeleton_Rogue_ArmLeft: THREE.SkinnedMesh;
    Skeleton_Rogue_ArmRight: THREE.SkinnedMesh;
    Skeleton_Rogue_Body: THREE.SkinnedMesh;
    Skeleton_Rogue_LegLeft: THREE.SkinnedMesh;
    Skeleton_Rogue_LegRight: THREE.SkinnedMesh;
    Skeleton_Rogue_Eyes: THREE.SkinnedMesh;
    Skeleton_Rogue_Head: THREE.SkinnedMesh;
    Skeleton_Rogue_Jaw: THREE.SkinnedMesh;
    root: THREE.Bone;
  };
  materials: {
    skeleton: THREE.MeshStandardMaterial;
    Glow: THREE.MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

export function SkeletonRogue(props: JSX.IntrinsicElements["group"]) {
  const group = React.useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Skeleton Rogue-transformed.glb"
  );
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as GLTFResult;
  const { actions } = useAnimations(animations, group);
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
