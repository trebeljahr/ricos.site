import { useEffect, useMemo, useRef } from "react";
import { CommonActions } from "./CommonEnemy";
import {
  AnimationClip,
  Bone,
  Group,
  Mesh,
  MeshStandardMaterial,
  SkinnedMesh,
} from "three";
import { GLTF, SkeletonUtils } from "three-stdlib";
import { GroupProps, useGraph } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { useGenericAnimationController } from "@r3f/Controllers/GenericAnimationController";

interface GLTFAction extends AnimationClip {
  name: SkeletonActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    [name: string]: SkinnedMesh;
  };
  materials: {
    skeleton: MeshStandardMaterial;
    Glow: MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

export enum SkeletonActions {
  "1H_Melee_Attack_Chop" = "1H_Melee_Attack_Chop",
  "1H_Melee_Attack_Jump_Chop" = "1H_Melee_Attack_Jump_Chop",
  "1H_Melee_Attack_Slice_Diagonal" = "1H_Melee_Attack_Slice_Diagonal",
  "1H_Melee_Attack_Slice_Horizontal" = "1H_Melee_Attack_Slice_Horizontal",
  "1H_Melee_Attack_Stab" = "1H_Melee_Attack_Stab",
  "1H_Ranged_Aiming" = "1H_Ranged_Aiming",
  "1H_Ranged_Reload" = "1H_Ranged_Reload",
  "1H_Ranged_Shoot" = "1H_Ranged_Shoot",
  "1H_Ranged_Shooting" = "1H_Ranged_Shooting",
  "2H_Melee_Attack_Chop" = "2H_Melee_Attack_Chop",
  "2H_Melee_Attack_Slice" = "2H_Melee_Attack_Slice",
  "2H_Melee_Attack_Spin" = "2H_Melee_Attack_Spin",
  "2H_Melee_Attack_Spinning" = "2H_Melee_Attack_Spinning",
  "2H_Melee_Attack_Stab" = "2H_Melee_Attack_Stab",
  "2H_Melee_Idle" = "2H_Melee_Idle",
  "2H_Ranged_Aiming" = "2H_Ranged_Aiming",
  "2H_Ranged_Reload" = "2H_Ranged_Reload",
  "2H_Ranged_Shoot" = "2H_Ranged_Shoot",
  "2H_Ranged_Shooting" = "2H_Ranged_Shooting",
  "Block" = "Block",
  "Block_Attack" = "Block_Attack",
  "Block_Hit" = "Block_Hit",
  "Blocking" = "Blocking",
  "Cheer" = "Cheer",
  "Death_A" = "Death_A",
  "Death_A_Pose" = "Death_A_Pose",
  "Death_B" = "Death_B",
  "Death_B_Pose" = "Death_B_Pose",
  "Death_C_Pose" = "Death_C_Pose",
  "Death_C_Skeletons" = "Death_C_Skeletons",
  "Death_C_Skeletons_Resurrect" = "Death_C_Skeletons_Resurrect",
  "Dodge_Backward" = "Dodge_Backward",
  "Dodge_Forward" = "Dodge_Forward",
  "Dodge_Left" = "Dodge_Left",
  "Dodge_Right" = "Dodge_Right",
  "Dualwield_Melee_Attack_Chop" = "Dualwield_Melee_Attack_Chop",
  "Dualwield_Melee_Attack_Slice" = "Dualwield_Melee_Attack_Slice",
  "Dualwield_Melee_Attack_Stab" = "Dualwield_Melee_Attack_Stab",
  "Hit_A" = "Hit_A",
  "Hit_B" = "Hit_B",
  "Idle" = "Idle",
  "Idle_Combat" = "Idle_Combat",
  "Interact" = "Interact",
  "Jump_Full_Long" = "Jump_Full_Long",
  "Jump_Full_Short" = "Jump_Full_Short",
  "Jump_Idle" = "Jump_Idle",
  "Jump_Start" = "Jump_Start",
  "Jump_Land" = "Jump_Land",
  "Lie_Down" = "Lie_Down",
  "Lie_Idle" = "Lie_Idle",
  "Lie_Pose" = "Lie_Pose",
  "Lie_StandUp" = "Lie_StandUp",
  "PickUp" = "PickUp",
  "Running_A" = "Running_A",
  "Running_B" = "Running_B",
  "Running_C" = "Running_C",
  "Running_Strafe_Left" = "Running_Strafe_Left",
  "Running_Strafe_Right" = "Running_Strafe_Right",
  "Sit_Chair_Down" = "Sit_Chair_Down",
  "Sit_Chair_Idle" = "Sit_Chair_Idle",
  "Sit_Chair_Pose" = "Sit_Chair_Pose",
  "Sit_Floor_Down" = "Sit_Floor_Down",
  "Sit_Floor_Idle" = "Sit_Floor_Idle",
  "Sit_Floor_Pose" = "Sit_Floor_Pose",
  "Sit_Chair_StandUp" = "Sit_Chair_StandUp",
  "Sit_Floor_StandUp" = "Sit_Floor_StandUp",
  "Skeleton_Inactive_Standing_Pose" = "Skeleton_Inactive_Standing_Pose",
  "Skeletons_Awaken_Floor" = "Skeletons_Awaken_Floor",
  "Skeletons_Awaken_Floor_Long" = "Skeletons_Awaken_Floor_Long",
  "Skeletons_Inactive_Floor_Pose" = "Skeletons_Inactive_Floor_Pose",
  "Skeletons_Awaken_Standing" = "Skeletons_Awaken_Standing",
  "Spawn_Air" = "Spawn_Air",
  "Spawn_Ground" = "Spawn_Ground",
  "Spawn_Ground_Skeletons" = "Spawn_Ground_Skeletons",
  "Spellcast_Long" = "Spellcast_Long",
  "Spellcast_Raise" = "Spellcast_Raise",
  "Spellcast_Shoot" = "Spellcast_Shoot",
  "Spellcast_Summon" = "Spellcast_Summon",
  "Spellcasting" = "Spellcasting",
  "Taunt" = "Taunt",
  "Taunt_Longer" = "Taunt_Longer",
  "Throw" = "Throw",
  "Unarmed_Idle" = "Unarmed_Idle",
  "Unarmed_Melee_Attack_Kick" = "Unarmed_Melee_Attack_Kick",
  "Unarmed_Melee_Attack_Punch_A" = "Unarmed_Melee_Attack_Punch_A",
  "Unarmed_Melee_Attack_Punch_B" = "Unarmed_Melee_Attack_Punch_B",
  "Unarmed_Pose" = "Unarmed_Pose",
  "Use_Item" = "Use_Item",
  "Walking_A" = "Walking_A",
  "Walking_B" = "Walking_B",
  "Walking_Backwards" = "Walking_Backwards",
  "Walking_C" = "Walking_C",
  "Walking_D_Skeletons" = "Walking_D_Skeletons",
  "Idle_B" = "Idle_B",
}

export type SkeletonActionName = keyof typeof SkeletonActions;

export const mapCommonActionToSkeletonAction: Record<
  CommonActions,
  SkeletonActionName
> = {
  [CommonActions.Idle]: "Idle",
  [CommonActions.Walk]: "Walking_A",
  [CommonActions.Run]: "Running_A",
  [CommonActions.Jump]: "Jump_Full_Short",
  [CommonActions.Death]: "Death_A",
  [CommonActions.Attack]: "Dualwield_Melee_Attack_Stab",
  [CommonActions.HitReact]: "Hit_A",
};

export function SkeletonMage() {
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Skeleton Mage-transformed.glb"
  );

  return (
    <SkeletonGeneric
      scene={scene}
      animations={animations}
      animationToPlay={CommonActions.Idle}
      prefix={"Skeleton_Mage_"}
    />
  );
}

export function SkeletonWarrior() {
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Skeleton Warrior-transformed.glb"
  );

  return (
    <SkeletonGeneric
      scene={scene}
      animations={animations}
      animationToPlay={CommonActions.Idle}
      prefix={"Skeleton_Warrior_"}
    />
  );
}

export function SkeletonRogue({
  animationToPlay,
}: GroupProps & { animationToPlay?: CommonActions }) {
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Skeleton Rogue-transformed.glb"
  );

  return (
    <SkeletonGeneric
      scene={scene}
      animations={animations}
      animationToPlay={animationToPlay}
      prefix={"Skeleton_Rogue_"}
    />
  );
}

export function SkeletonMinion() {
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Skeleton Minion-transformed.glb"
  );
  return (
    <SkeletonGeneric
      scene={scene}
      animations={animations}
      animationToPlay={CommonActions.Idle}
      prefix={"Skeleton_Minion_"}
    />
  );
}

function SkeletonGeneric({
  scene,
  prefix = "",
  animations,
  animationToPlay = CommonActions.Idle,
  ...props
}: GroupProps & {
  prefix?: string;
  animationToPlay?: CommonActions;
  scene: any;
  animations: any;
}) {
  const group = useRef<Group>(null!);

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

  const ArmLeft = prefix + "ArmLeft";
  const ArmRight = prefix + "ArmRight";
  const Body = prefix + "Body";
  const LegLeft = prefix + "LegLeft";
  const LegRight = prefix + "LegRight";
  const Eyes = prefix + "Eyes";
  const Jaw = prefix + "Jaw";
  const Skull = prefix + "Skull";

  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Root_Scene">
        <group name="Rig" scale={100}>
          <primitive object={nodes.root} />
        </group>
        <skinnedMesh
          name={ArmLeft}
          geometry={nodes[ArmLeft].geometry}
          material={materials.skeleton}
          skeleton={nodes[ArmLeft].skeleton}
          scale={100}
        />
        <skinnedMesh
          name={ArmRight}
          geometry={nodes[ArmRight].geometry}
          material={materials.skeleton}
          skeleton={nodes[ArmRight].skeleton}
          scale={100}
        />
        <skinnedMesh
          name={Body}
          geometry={nodes[Body].geometry}
          material={materials.skeleton}
          skeleton={nodes[Body].skeleton}
          scale={100}
        />
        <skinnedMesh
          name={LegLeft}
          geometry={nodes[LegLeft].geometry}
          material={materials.skeleton}
          skeleton={nodes[LegLeft].skeleton}
          scale={100}
        />
        <skinnedMesh
          name={LegRight}
          geometry={nodes[LegRight].geometry}
          material={materials.skeleton}
          skeleton={nodes[LegRight].skeleton}
          scale={100}
        />
        <skinnedMesh
          name={Eyes}
          geometry={nodes[Eyes].geometry}
          material={materials.Glow}
          skeleton={nodes[Eyes].skeleton}
          position={[0, 1.22, 0]}
          scale={100}
        />
        <skinnedMesh
          name={Jaw}
          geometry={nodes[Jaw].geometry}
          material={materials.skeleton}
          skeleton={nodes[Jaw].skeleton}
          position={[0, 1.31, -0.03]}
          scale={100}
        />
        <skinnedMesh
          name={Skull}
          geometry={nodes[Skull].geometry}
          material={materials.skeleton}
          skeleton={nodes[Skull].skeleton}
          position={[0, 1.22, 0]}
          scale={100}
        />
      </group>
    </group>
  );
}
