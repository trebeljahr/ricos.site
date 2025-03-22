import {
  MixamoCharacter,
  SupportedAnimations,
  useMixamoAnimations,
} from "@r3f/Characters/CharacterWithAnimations";
import { useAnimations, useKeyboardControls } from "@react-three/drei";
import { CustomEcctrlRigidBody } from "ecctrl";
import { Suspense, useEffect, useRef } from "react";
import { Group } from "three";
import { useGenericAnimationController } from "../GenericAnimationController";
import { useFrame } from "@react-three/fiber";
import { EcctrlControllerCustom, userDataType } from "./Controller";
import { MixamoCharacterNames } from "@r3f/Characters/Character";

export const useMouseClicked = () => {
  const mouseClicked = useRef(false);

  useEffect(() => {
    const handleMouseDown = () => {
      mouseClicked.current = true;
    };

    document.addEventListener("pointerdown", handleMouseDown);
    return () => {
      document.removeEventListener("pointerdown", handleMouseDown);
    };
  }, []);

  return mouseClicked;
};

export const MixamoEcctrlControllerWithAnimations = () => {
  const characterRef = useRef<CustomEcctrlRigidBody>(null!);
  const prev = useRef<SupportedAnimations>(null!);

  const [_, get] = useKeyboardControls();

  const group = useRef<Group>(null!);
  const { animationsForHook } = useMixamoAnimations();
  const { actions } = useAnimations(animationsForHook, group);
  const { updateAnimation, mixInAnimation } = useGenericAnimationController({
    actions,
  });

  const mouseClicked = useMouseClicked();

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

    if (mouseClicked.current) {
      console.log("mouse was clicked");

      if (prev.current !== SupportedAnimations.Wave) {
        mixInAnimation(SupportedAnimations.Wave);
      }

      mouseClicked.current = false;
    }
  });

  return (
    <>
      <EcctrlControllerCustom
        position={[0, 40, 0]}
        slopeDownExtraForce={0}
        camCollision={true}
        camCollisionOffset={0.5}
        mode="FixedCamera"
        ref={characterRef}
      >
        <group position={[0, -0.7, 0]} scale={0.7}>
          <Suspense fallback={null}>
            <group ref={group} dispose={null}>
              <MixamoCharacter characterName={MixamoCharacterNames.XBot} />
            </group>
          </Suspense>
        </group>
      </EcctrlControllerCustom>
    </>
  );
};
