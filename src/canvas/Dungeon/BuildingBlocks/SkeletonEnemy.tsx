import { SkeletonMage } from "@r3f/AllModels/enemies/Skeleton Mage";
import { SkeletonMinion } from "@r3f/AllModels/enemies/Skeleton Minion";
import { SkeletonRogue } from "@r3f/AllModels/enemies/Skeleton Rogue";
import { SkeletonWarrior } from "@r3f/AllModels/enemies/Skeleton Warrior";
import { GroupProps } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AnimationClip,
  Bone,
  Group,
  MeshStandardMaterial,
  Object3D,
  SkinnedMesh,
} from "three";
import { GLTF } from "three-stdlib";
import { CommonActions } from "./CommonEnemy";
import { WeaponTypes, useItem } from "../Enemies/Weapons";

export type SkeletonEnemyProps = GroupProps & {
  animationToPlay?: CommonActions;
};

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

export enum SkeletonTypes {
  Rogue = "Rogue",
  Warrior = "Warrior",
  Mage = "Mage",
  Minion = "Minion",
}

export const SkeletonWithWeapons = ({
  ItemRight: ProvidedItemRight,
  ItemLeft: ProvidedItemLeft,
  skeletonType = SkeletonTypes.Warrior,
  animationToPlay = CommonActions.Idle,
  ...props
}: SkeletonEnemyProps & {
  ItemRight: WeaponTypes;
  ItemLeft: WeaponTypes;
  skeletonType?: SkeletonTypes;
}) => {
  const itemRight = useItem(ProvidedItemRight);
  const itemLeft = useItem(ProvidedItemLeft);

  const groupRef = useRef<Group>(null!);

  useEffect(() => {
    let leftHand: Object3D<Bone>;
    let rightHand: Object3D<Bone>;
    groupRef.current.traverse((child) => {
      if (child.name === "handslotl" && itemLeft) {
        if (ProvidedItemLeft === WeaponTypes.Bow1) {
          itemLeft.scale.set(
            itemLeft.scale.x,
            -itemLeft.scale.y,
            itemLeft.scale.z
          );
        }

        if (ProvidedItemLeft === WeaponTypes.Sword5) {
          itemLeft.scale.set(
            -itemLeft.scale.x,
            itemLeft.scale.y,
            itemLeft.scale.z
          );
        }
        child.add(itemLeft);

        leftHand = child as Object3D<Bone>;
      }
      if (child.name === "handslotr" && itemRight) {
        child.add(itemRight);

        rightHand = child as Object3D<Bone>;
      }
    });

    return () => {
      if (leftHand && itemLeft) {
        leftHand.remove(itemLeft);
      }
      if (rightHand && itemRight) {
        rightHand.remove(itemRight);
      }
    };
  }, [itemLeft, itemRight]);

  const SkeletonOfType = useMemo(() => {
    switch (skeletonType) {
      case SkeletonTypes.Rogue:
        return SkeletonRogue;
      case SkeletonTypes.Warrior:
        return SkeletonWarrior;
      case SkeletonTypes.Mage:
        return SkeletonMage;
      case SkeletonTypes.Minion:
        return SkeletonMinion;
      default:
        return SkeletonWarrior;
    }
  }, [skeletonType]);

  return (
    <group ref={groupRef}>
      <SkeletonOfType animationToPlay={animationToPlay} {...props} />
    </group>
  );
};
