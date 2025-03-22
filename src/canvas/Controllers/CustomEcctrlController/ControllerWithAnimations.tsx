import {
  MixamoCharacter,
  SupportedAnimations,
  useMixamoAnimations,
} from "@r3f/Characters/CharacterWithAnimations";
import { useAnimations, useKeyboardControls } from "@react-three/drei";
import { CustomEcctrlRigidBody } from "ecctrl";
import { MutableRefObject, Suspense, useEffect, useRef } from "react";
import { Group } from "three";
import { useGenericAnimationController } from "../GenericAnimationController";
import { useFrame } from "@react-three/fiber";
import { EcctrlControllerCustom, userDataType } from "./Controller";
import { MixamoCharacterNames } from "@r3f/Characters/Character";
import { pickRandomFromArray } from "src/lib/utils/randomFromArray";
import { useAttachToBone } from "@hooks/useAttachToBone";
import { useSword1, useSword2 } from "@r3f/Dungeon/Enemies/Swords";

export const MixamoEcctrlControllerWithAnimations = () => {
  const characterRef = useRef<CustomEcctrlRigidBody>(null!);
  const prev = useRef<SupportedAnimations>(null!);

  const [_, get] = useKeyboardControls();

  const { animationsForHook } = useMixamoAnimations();
  const { ref: group, actions, mixer } = useAnimations(animationsForHook);
  const {
    updateAnimation,
    mixInAnimation,
    currentAnimationState,
    getMixedAnimationState,
    isAnyMixedAnimationPlaying,
  } = useGenericAnimationController({
    actions,
    mixer,
  });

  useEffect(() => {
    const handleMouseDown = () => {
      if (!characterRef.current) return;
      const userData = characterRef.current.userData as userDataType;
      if (!userData.canJump) return;

      // Only mix in a new animation if no mixed animation is currently playing
      // if (isAnyMixedAnimationPlaying()) {
      //   console.log(
      //     "Skipping attack - another attack animation is still playing"
      //   );
      //   return;
      // }

      const attackActions = [
        SupportedAnimations.SwordR,
        SupportedAnimations.StabR,
        SupportedAnimations.SlashR,
      ];

      const randomAction = pickRandomFromArray(attackActions);
      const success = mixInAnimation(randomAction);

      // if (success) {
      //   console.log(`Mixed in attack animation: ${randomAction}`);
      // }
    };

    document.addEventListener("pointerdown", handleMouseDown);
    return () => {
      document.removeEventListener("pointerdown", handleMouseDown);
    };
  }, [mixInAnimation, isAnyMixedAnimationPlaying]);

  // Optional: Debug animation states
  useFrame(() => {
    // Uncomment to debug
    // const mixedState = getMixedAnimationState();
    // if (mixedState) {
    //   console.log(`Mixed animation: ${mixedState.name}, progress: ${(mixedState.progress * 100).toFixed(0)}%`);
    // }
  });

  useFrame(() => {
    const { forward, backward, leftward, rightward, jump, run } = get();
    const userData = characterRef.current?.userData as userDataType;

    const canJump = userData?.canJump;
    if (!forward && !backward && !leftward && !rightward && !jump && canJump) {
      if (prev.current !== SupportedAnimations.Idle) {
        updateAnimation(SupportedAnimations.Idle, {
          looping: true,
        });
      }
    } else if (jump && canJump) {
      if (prev.current !== SupportedAnimations.JumpingUp) {
        updateAnimation(SupportedAnimations.JumpingUp, {
          looping: false,
          fade: 0.01,
        });
      }
    } else if (canJump && (forward || backward || leftward || rightward)) {
      if (
        (run && prev.current !== SupportedAnimations.Running) ||
        (!run && prev.current !== SupportedAnimations.Walking)
      ) {
        updateAnimation(
          run ? SupportedAnimations.Running : SupportedAnimations.Walking,
          {
            looping: true,
            fade: 0.2,
          }
        );
      }
    } else if (!canJump) {
      if (prev.current !== SupportedAnimations.JumpingUp) {
        updateAnimation(SupportedAnimations.JumpingUp, {
          looping: false,
          fade: 0.01,
        });
      }
    }

    // Update prev reference
    // prev.current = currentAnimationState.name as SupportedAnimations;
  });

  // const sword = useSword2();
  const sword2 = useSword2();

  // sword.scale.set(100, 100, 100);
  sword2.scale.set(100, 100, 100);
  // sword.position.set(-0.5, 0, 0);
  sword2.position.set(0.5, 0.08, 0.01);
  // sword.rotation.set(Math.PI, -Math.PI / 2, Math.PI / 2);
  sword2.rotation.set(-Math.PI, Math.PI / 2, -Math.PI / 2);

  // useAttachToBone(group, "mixamorigLeftHand", sword);
  useAttachToBone(
    group as MutableRefObject<Group>,
    "mixamorigRightHand",
    sword2
  );

  return (
    <Suspense>
      <EcctrlControllerCustom
        position={[0, 40, 0]}
        slopeDownExtraForce={0}
        camCollision={true}
        camCollisionOffset={0.5}
        // mode="FixedCamera"
        ref={characterRef}
      >
        <group position={[0, -0.7, 0]} scale={1}>
          <group ref={group as MutableRefObject<Group>} dispose={null}>
            <MixamoCharacter characterName={MixamoCharacterNames.Eve} />
          </group>
        </group>
      </EcctrlControllerCustom>
    </Suspense>
  );
};
