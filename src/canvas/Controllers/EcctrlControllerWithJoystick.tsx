import {
  MichelleCharacter,
  michelleGlbUrl,
} from "@r3f/AllModels/MichelleCharacter";
import {
  GroupProps,
  Object3DProps,
  useFrame,
  useThree,
} from "@react-three/fiber";
import {
  ForwardRefExoticComponent,
  MutableRefObject,
  PropsWithChildren,
  PropsWithRef,
  RefAttributes,
  useRef,
  useState,
} from "react";
import { Group, Quaternion, Vector3 } from "three";
import { JoystickControl } from "./JoystickControl";
import { JoystickData } from "@hooks/useJoystick";
import { EcctrlControllerCustom } from "./CustomEcctrlController/Controller";
import { MixamoCharacterNames } from "../Characters/Character";
import {
  SupportedAnimations,
  useMixamoAnimations,
} from "../Characters/CharacterWithAnimations";
import { useGenericAnimationController } from "./GenericAnimationController";
import { useAnimations } from "@react-three/drei";

export type SimpleModelType = (
  props: JSX.IntrinsicElements["group"]
) => JSX.Element;

export type ForwardedRefModelType = ForwardRefExoticComponent<
  Omit<GroupProps, "ref"> & RefAttributes<Group>
>;

export type ModelType = SimpleModelType | ForwardedRefModelType;

export interface EcctrlControllerWithJoystickProps {
  Model?: ModelType;
  position?: Object3DProps["position"];
  enableJoystick?: boolean;
  fixedCamera?: boolean;
  children?: React.ReactNode;
  characterName?: MixamoCharacterNames;
}

export const EcctrlControllerWithJoystick = ({
  Model = MichelleCharacter,
  position = [0, 0, 5],
  enableJoystick = true,
  fixedCamera = false,
  children,
  characterName = MixamoCharacterNames.XBot,
}: EcctrlControllerWithJoystickProps) => {
  const [ecctrlRef, setEcctrlRef] = useState<any>(null);
  const movementVector = useRef(new Vector3());
  const camera = useThree((state) => state.camera);
  const targetQuaternion = useRef(new Quaternion());
  const groupRef = useRef<Group>(null!);

  // Animation setup
  const { animationsForHook } = useMixamoAnimations();
  const { actions, mixer } = useAnimations(animationsForHook, groupRef);
  const { updateAnimation, mixInAnimation } = useGenericAnimationController({
    actions,
    mixer,
  });

  // Process camera joystick input
  const handleCameraJoystick = (data: JoystickData) => {
    if (!ecctrlRef || !enableJoystick) return;

    // Apply camera rotation based on joystick input
    if (Math.abs(data.leveledX) > 0.1 || Math.abs(data.leveledY) > 0.1) {
      const rotationSpeed = 0.01;
      ecctrlRef.rotateCamera?.(
        -data.leveledY * rotationSpeed,
        -data.leveledX * rotationSpeed
      );
    }
  };

  // Process movement joystick input
  const handleMovementJoystick = (data: JoystickData) => {
    if (!ecctrlRef || !enableJoystick) return;

    movementVector.current.set(-data.leveledX, 0, -data.leveledY);
  };

  // Determine the mode for the controller
  const getControllerMode = () => {
    const modes = [];
    if (fixedCamera) modes.push("FixedCamera");
    return modes.join(" ");
  };

  // Handle animations based on movement
  useFrame(() => {
    if (!ecctrlRef || !mixer) return;

    const userData = ecctrlRef.userData || {};
    const canJump = userData.canJump;

    try {
      // Get velocity from userData or use fallback
      const velocityX = userData.velocity?.x || 0;
      const velocityZ = userData.velocity?.z || 0;
      const isMoving = Math.abs(velocityX) > 0.1 || Math.abs(velocityZ) > 0.1;
      const isSprinting = !!userData.isSprinting;

      if (!canJump) {
        updateAnimation(SupportedAnimations.JumpingUp, {
          looping: false,
          fade: 0.1,
        });
      } else if (isMoving) {
        updateAnimation(
          isSprinting
            ? SupportedAnimations.Running
            : SupportedAnimations.Walking,
          {
            looping: true,
            fade: 0.2,
          }
        );
      } else {
        updateAnimation(SupportedAnimations.Idle, {
          looping: true,
          fade: 0.2,
        });
      }
    } catch (error) {
      console.error("Animation error:", error);
      // Fallback to idle animation if there's an error
      updateAnimation(SupportedAnimations.Idle, {
        looping: true,
        fade: 0.2,
      });
    }
  });

  return (
    <>
      {enableJoystick && (
        <JoystickControl
          enabled={enableJoystick}
          mode="third-person"
          onCameraJoystickMove={handleCameraJoystick}
          onMovementJoystickMove={handleMovementJoystick}
        />
      )}

      <EcctrlControllerCustom
        ref={(el) => {
          setEcctrlRef(el);
        }}
        position={position}
        animated
        slopeDownExtraForce={0}
        camCollision={true}
        camCollisionOffset={0.5}
        turnSpeed={10}
        mode={getControllerMode()}
        sprintMult={3}
      >
        <group position={[0, -1.1, 0]} scale={1.4} ref={groupRef}>
          <Model />
          {children}
        </group>
      </EcctrlControllerCustom>
    </>
  );
};
