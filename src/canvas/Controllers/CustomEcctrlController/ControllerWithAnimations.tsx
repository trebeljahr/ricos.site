import { useAttachToBone } from "@hooks/useAttachToBone";
import { useSubscribeToKeyPress } from "@hooks/useKeyboardInput";
import { MixamoCharacterNames } from "@r3f/Characters/Character";
import {
  MixamoCharacter,
  SupportedAnimations,
  useMixamoAnimations,
} from "@r3f/Characters/CharacterWithAnimations";
import {
  SwordTypes,
  useWeapon,
  WeaponTypes,
} from "@r3f/Dungeon/Enemies/Weapons";
import {
  useAnimations,
  useKeyboardControls,
  useProgress,
} from "@react-three/drei";
import { GroupProps, useFrame } from "@react-three/fiber";
import { CustomEcctrlRigidBody } from "ecctrl";
import { MutableRefObject, Suspense, useRef } from "react";
import { Group } from "three";
import { useGenericAnimationController } from "../GenericAnimationController";
import { EcctrlControllerCustom, userDataType } from "./Controller";
import { playerQuery } from "@r3f/AI/ecs";

const useWeaponForMixamoCharacter = (weaponType: WeaponTypes) => {
  let weapon = useWeapon(weaponType);

  type Transforms = {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  };

  const transformsRightHand: Record<WeaponTypes, Transforms> = {
    Sword1: {
      position: [0.5, 0.08, 0.01],
      rotation: [-Math.PI, Math.PI / 2, -Math.PI / 2],
      scale: [100, 100, 100],
    },
    Sword2: {
      position: [0.5, 0.08, 0.01],
      rotation: [-Math.PI, Math.PI / 2, -Math.PI / 2],
      scale: [100, 100, 100],
    },
    Sword3: {
      position: [0.5, 0.08, 0.01],
      rotation: [-Math.PI, Math.PI / 2, -Math.PI / 2],
      scale: [100, 100, 100],
    },
    Sword4: {
      position: [0.5, 0.08, 0.01],
      rotation: [-Math.PI, Math.PI / 2, -Math.PI / 2],
      scale: [100, 100, 100],
    },
    Sword5: {
      position: [0.5, 0.08, 0.01],
      rotation: [-Math.PI, Math.PI / 2, -Math.PI / 2],
      scale: [100, 100, 100],
    },
    Sword6: {
      position: [-0.1, 0.08, 0.01],
      rotation: [-Math.PI, Math.PI / 2, -Math.PI / 2],
      scale: [30, 40, 40],
    },

    Axe1: {
      position: [0.5, 0.08, 0.01],
      rotation: [-Math.PI, Math.PI / 2, -Math.PI / 2],
      scale: [100, 100, 100],
    },

    Bow1: {
      position: [0.5, 0.08, 0.01],
      rotation: [-Math.PI, Math.PI / 2, -Math.PI / 2],
      scale: [100, 100, 100],
    },

    Staff1: {
      position: [0.5, 0.08, 0.01],
      rotation: [-Math.PI, Math.PI / 2, -Math.PI / 2],
      scale: [100, 100, 100],
    },

    Staff2: {
      position: [0.5, 0.08, 0.01],
      rotation: [-Math.PI, Math.PI / 2, -Math.PI / 2],
      scale: [100, 100, 100],
    },

    Staff3: {
      position: [0.5, 0.08, 0.01],
      rotation: [-Math.PI, Math.PI / 2, -Math.PI / 2],
      scale: [100, 100, 100],
    },

    Staff4: {
      position: [0.5, 0.08, 0.01],
      rotation: [-Math.PI, Math.PI / 2, -Math.PI / 2],
      scale: [100, 100, 100],
    },

    Staff5: {
      position: [0.5, 0.08, 0.01],
      rotation: [-Math.PI, Math.PI / 2, -Math.PI / 2],
      scale: [100, 100, 100],
    },

    Staff6: {
      position: [0.5, 0.08, 0.01],
      rotation: [-Math.PI, Math.PI / 2, -Math.PI / 2],
      scale: [100, 100, 100],
    },

    Staff7: {
      position: [0.5, 0.08, 0.01],
      rotation: [-Math.PI, Math.PI / 2, -Math.PI / 2],
      scale: [100, 100, 100],
    },

    Shield1: {
      position: [0.5, 0.08, 0.01],
      rotation: [-Math.PI, Math.PI / 2, -Math.PI / 2],
      scale: [100, 100, 100],
    },

    Shield2: {
      position: [0.5, 0.08, 0.01],
      rotation: [-Math.PI, Math.PI / 2, -Math.PI / 2],
      scale: [100, 100, 100],
    },

    Shield3: {
      position: [0.5, 0.08, 0.01],
      rotation: [-Math.PI, Math.PI / 2, -Math.PI / 2],
      scale: [100, 100, 100],
    },

    Shield4: {
      position: [0.5, 0.08, 0.01],
      rotation: [-Math.PI, Math.PI / 2, -Math.PI / 2],
      scale: [100, 100, 100],
    },
  };

  const { position, rotation, scale } = transformsRightHand[weaponType];

  weapon.scale.set(...scale);
  weapon.rotation.set(...rotation);
  weapon.position.set(...position);

  return weapon;
};

export const MixamoEcctrlControllerWithAnimations = ({
  position = [0, 0, 5],
}: {
  position?: GroupProps["position"];
}) => {
  // const characterRef = useRef<CustomEcctrlRigidBody>(null!);

  const [_, get] = useKeyboardControls();

  const { animationsForHook } = useMixamoAnimations();
  const { ref: group, actions, mixer } = useAnimations(animationsForHook);
  const {
    updateAnimation,
    mixInAnimation,
    animationState: currentAnimationState,
    mixedInAnimationState,
  } = useGenericAnimationController({
    actions,
    mixer,
  });

  const lastAttack = useRef<SupportedAnimations | null>(null);
  const isAttacking = useRef(false);

  useSubscribeToKeyPress("f", () => {
    const player = playerQuery.first;
    if (!player?.rigidBody) return;
    const userData = player?.rigidBody.userData as userDataType;

    if (
      !userData.canJump ||
      (mixedInAnimationState.current.progress <= 0.8 &&
        mixedInAnimationState.current.isPlaying)
    )
      return;

    const nextAttack =
      lastAttack.current === SupportedAnimations.SwordR3
        ? SupportedAnimations.SwordR
        : SupportedAnimations.SwordR3;

    lastAttack.current = nextAttack;
    isAttacking.current = true;

    mixInAnimation(nextAttack);
  });

  useFrame(() => {
    const player = playerQuery.first;
    if (!player) return;
    const { forward, backward, leftward, rightward, jump, run } = get();
    const userData = player.rigidBody?.userData as userDataType;

    isAttacking.current =
      mixedInAnimationState.current.isPlaying &&
      mixedInAnimationState.current.progress < 0.8;

    const canJump = userData?.canJump;

    if (userData) {
      userData.isDoingStationaryAction = isAttacking.current;
    }

    if (!forward && !backward && !leftward && !rightward && !jump && canJump) {
      updateAnimation(SupportedAnimations.Idle, {
        looping: true,
      });
    } else if (jump && canJump && !isAttacking.current) {
      updateAnimation(SupportedAnimations.JumpingUp, {
        looping: false,
        fade: 0.01,
      });
    } else if (canJump && (forward || backward || leftward || rightward)) {
      updateAnimation(
        run ? SupportedAnimations.Running : SupportedAnimations.Walking,
        {
          looping: true,
          fade: 0.2,
        }
      );
    } else if (!canJump && !isAttacking.current) {
      updateAnimation(SupportedAnimations.JumpingUp, {
        looping: false,
        fade: 0.01,
      });
    }
  });

  const weapon = useWeaponForMixamoCharacter(SwordTypes.Sword6);

  const { progress } = useProgress();

  useAttachToBone(
    group as MutableRefObject<Group>,
    "mixamorigRightHand",
    weapon
  );

  return (
    <EcctrlControllerCustom
      position={position}
      slopeDownExtraForce={0}
      camCollision={true}
      camCollisionOffset={0.5}
      sprintMult={3}
    >
      <Suspense fallback={null}>
        <group position={[0, -1.1, 0]} scale={1.4}>
          <group ref={group as MutableRefObject<Group>} dispose={null}>
            <MixamoCharacter characterName={MixamoCharacterNames.Eve} />
          </group>
        </group>
      </Suspense>
    </EcctrlControllerCustom>
  );
};
