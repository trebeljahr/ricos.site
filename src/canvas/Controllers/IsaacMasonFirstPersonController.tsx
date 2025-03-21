import Rapier, { QueryFilterFlags } from "@dimforge/rapier3d-compat";
import { HumanHand } from "@r3f/AllModels/Human hand";
import { RiggedArms } from "@r3f/AllModels/Rigged Fps Arms";
import { Glove, Sword_big } from "@r3f/AllModels/rpg_items_pack";
import { SkeletonShield1 } from "@r3f/AllModels/weapons/Skeleton Shield-1";
import { SkeletonShield2 } from "@r3f/AllModels/weapons/Skeleton Shield-2";
import { Sword1 } from "@r3f/AllModels/weapons/Sword (1)";
import { Sword2 } from "@r3f/AllModels/weapons/Sword (2)";
import { useInventory } from "@r3f/Dungeon/InventorySystem/GameInventoryContext";
import {
  KeyboardControls,
  PointerLockControls,
  useKeyboardControls,
} from "@react-three/drei";
import { ThreeElements, useFrame, useThree } from "@react-three/fiber";
import {
  CapsuleCollider,
  RapierRigidBody,
  RigidBody,
  useRapier,
} from "@react-three/rapier";
import { useControls as useLevaControls } from "leva";
import { RefObject, useEffect, useMemo, useRef } from "react";
import { Group, MathUtils, PerspectiveCamera, Vector3 } from "three";

const direction = new Vector3();
const frontVector = new Vector3();
const sideVector = new Vector3();
const rotation = new Vector3();
const characterLinvel = new Vector3();
const characterTranslation = new Vector3();

const NORMAL_FOV = 60;
const SPRINT_FOV = 75;

type KinematicCharacterControllerProps = {
  characterRigidBody: RefObject<RapierRigidBody>;
  characterColliderRef: RefObject<Rapier.Collider>;
  shieldHandRef: RefObject<Group | null>;
  swordHandRef: RefObject<Group | null>;
  updatingCamera?: boolean;
};

const useKinematicCharacterController = ({
  characterRigidBody,
  characterColliderRef,
  shieldHandRef,
  updatingCamera = true,
  swordHandRef,
}: KinematicCharacterControllerProps) => {
  const rapier = useRapier();

  const camera = useThree((state) => state.camera);

  const characterController = useRef<Rapier.KinematicCharacterController>(
    null!
  );

  const [, getKeyboardControls] = useKeyboardControls();

  const {
    applyImpulsesToDynamicBodies,
    snapToGroundDistance,
    characterShapeOffset,
    autoStepMaxHeight,
    autoStepMinWidth,
    autoStepIncludeDynamicBodies,
    accelerationTimeAirborne,
    accelerationTimeGrounded,
    timeToJumpApex,
    maxJumpHeight,
    minJumpHeight,
    velocityXZSmoothing,
    velocityXZMin,
  } = useLevaControls("controller", {
    applyImpulsesToDynamicBodies: true,
    snapToGroundDistance: 0.1,
    characterShapeOffset: 0.1,
    autoStepMaxHeight: 0.7,
    autoStepMinWidth: 0.3,
    autoStepIncludeDynamicBodies: true,
    accelerationTimeAirborne: 0.2,
    accelerationTimeGrounded: 0.025,
    timeToJumpApex: 0.4,
    maxJumpHeight: 4,
    minJumpHeight: 1,
    velocityXZSmoothing: 0.2,
    velocityXZMin: 0.0001,
  });

  const jumpGravity = useMemo(
    () => -(2 * maxJumpHeight) / Math.pow(timeToJumpApex, 2),
    [maxJumpHeight, timeToJumpApex]
  );

  const maxJumpVelocity = useMemo(
    () => Math.abs(jumpGravity) * timeToJumpApex,
    [jumpGravity, timeToJumpApex]
  );

  const minJumpVelocity = useMemo(
    () => Math.sqrt(2 * Math.abs(jumpGravity) * minJumpHeight),
    [jumpGravity, minJumpHeight]
  );

  const horizontalVelocity = useRef({ x: 0, z: 0 });
  const jumpVelocity = useRef(0);
  const holdingJump = useRef(false);
  const jumpTime = useRef(0);
  const jumping = useRef(false);

  useEffect(() => {
    const { world } = rapier;

    characterController.current =
      world.createCharacterController(characterShapeOffset);
    characterController.current.enableAutostep(
      autoStepMaxHeight,
      autoStepMinWidth,
      autoStepIncludeDynamicBodies
    );
    characterController.current.enableSnapToGround(snapToGroundDistance);
    characterController.current.setApplyImpulsesToDynamicBodies(
      applyImpulsesToDynamicBodies
    );

    return () => {
      world.removeCharacterController(characterController.current);
      characterController.current = null!;
    };
  }, [
    rapier,
    characterShapeOffset,
    autoStepMaxHeight,
    autoStepMinWidth,
    autoStepIncludeDynamicBodies,
    snapToGroundDistance,
    applyImpulsesToDynamicBodies,
  ]);

  useFrame((state, delta) => {
    if (
      !characterRigidBody.current ||
      !characterController.current ||
      !characterColliderRef.current
    ) {
      return;
    }

    const { forward, backward, left, right, jump, sprint } =
      getKeyboardControls();

    const characterCollider = characterColliderRef.current;

    const speed = (1.0 - Math.pow(0.0001, delta)) * (sprint ? 1.5 : 1);

    characterLinvel.copy(characterRigidBody.current.linvel() as Vector3);
    const currentSpeed = characterLinvel.length();
    const movingHorizontally =
      Math.abs(characterLinvel.x) > 0.1 || Math.abs(characterLinvel.z) > 0.1;
    const horizontalSpeed = Math.sqrt(
      characterLinvel.x * characterLinvel.x +
        characterLinvel.z * characterLinvel.z
    );
    const grounded = characterController.current.computedGrounded();

    const smoothing =
      velocityXZSmoothing *
      (grounded ? accelerationTimeGrounded : accelerationTimeAirborne);

    const factor = 1 - Math.pow(smoothing, delta);

    // x and z movement
    frontVector.set(0, 0, Number(backward) - Number(forward));
    sideVector.set(Number(left) - Number(right), 0, 0);

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(speed)
      .applyEuler(camera.rotation);

    horizontalVelocity.current = {
      x: MathUtils.lerp(horizontalVelocity.current.x, direction.x, factor),
      z: MathUtils.lerp(horizontalVelocity.current.z, direction.z, factor),
    };

    // jumping and gravity
    if (jump && grounded) {
      jumping.current = true;
      holdingJump.current = true;
      jumpTime.current = state.clock.elapsedTime;
      jumpVelocity.current = maxJumpVelocity;
    }

    if (!jump && grounded) {
      jumping.current = false;
    }

    if (jumping.current && holdingJump.current && !jump) {
      if (jumpVelocity.current > minJumpVelocity) {
        jumpVelocity.current = minJumpVelocity;
      }
    }

    if (!jump && grounded) {
      jumpVelocity.current = 0;
    } else {
      jumpVelocity.current += jumpGravity * factor;
    }

    holdingJump.current = jump;

    // todo: handle hitting ceiling

    // compute movement direction
    const movementDirection = {
      x: horizontalVelocity.current.x,
      y: jumpVelocity.current * factor,
      z: horizontalVelocity.current.z,
    };

    if (Math.abs(movementDirection.x) < velocityXZMin) {
      movementDirection.x = 0;
    }
    if (Math.abs(movementDirection.z) < velocityXZMin) {
      movementDirection.z = 0;
    }

    // compute collider movement and update rigid body
    characterController.current.computeColliderMovement(
      characterCollider,
      movementDirection,
      QueryFilterFlags.EXCLUDE_SENSORS
    );

    const translation = characterRigidBody.current.translation();

    const newPosition = characterTranslation.copy(translation as Vector3);

    if (newPosition.y < -4) {
      newPosition.y = 20;
      newPosition.x = 0;
      newPosition.z = 0;
    }

    const movement = characterController.current.computedMovement();
    newPosition.x += movement.x;
    newPosition.y += movement.y;
    newPosition.z += movement.z;

    characterRigidBody.current.setNextKinematicTranslation(newPosition);

    // update camera
    if (updatingCamera) {
      camera.position.set(translation.x, translation.y, translation.z);
      if (camera instanceof PerspectiveCamera) {
        camera.fov = MathUtils.lerp(
          camera.fov,
          sprint && currentSpeed > 0.1 ? SPRINT_FOV : NORMAL_FOV,
          10 * delta
        );
        camera.updateProjectionMatrix();
      }
    }

    // update hands
    const handRotationSpeed = sprint ? 15 : 10;
    const handBobSpeed = sprint ? 15 : 10;
    const handBobHeight = 0.5;

    const bob = (group: Group | null, side: "left" | "right") => {
      if (!group) return;

      const rotationScalar = MathUtils.clamp(currentSpeed / 10, 0, 1);

      const yRot =
        Math.sin(
          (currentSpeed > 0.1 ? 1 : 0) *
            state.clock.elapsedTime *
            handRotationSpeed
        ) / 6;

      const item = group.children[0];
      if (item) {
        item.rotation.x = MathUtils.lerp(
          item.rotation.x,
          yRot * rotationScalar * (side === "left" ? -1 : 1),
          0.1
        );
      }

      if (updatingCamera) {
        group.rotation.copy(camera.rotation);

        group.position
          .copy(camera.position)
          .add(camera.getWorldDirection(rotation).multiplyScalar(1));
      }

      const bobScalar = MathUtils.clamp(horizontalSpeed / 10, 0, 1);

      const yPos =
        (Math.sin(
          (movingHorizontally ? 1 : 0) * state.clock.elapsedTime * handBobSpeed
        ) /
          6) *
        handBobHeight;

      group.position.y += yPos * (side === "left" ? -1 : 1) * bobScalar;
    };

    bob(shieldHandRef.current, "left");
    bob(swordHandRef.current, "right");
  });
};

export const Player = (props: ThreeElements["group"]) => {
  const characterRigidBody = useRef<RapierRigidBody>(null!);
  const characterColliderRef = useRef<Rapier.Collider>(null!);
  const shieldHandRef = useRef<Group>(null);
  const swordHandRef = useRef<Group>(null);
  const { equippedItems } = useInventory();

  useKinematicCharacterController({
    characterRigidBody,
    characterColliderRef,
    shieldHandRef,
    swordHandRef,
    updatingCamera: true,
  });

  return (
    <group>
      <RigidBody
        {...props}
        ref={characterRigidBody}
        colliders={false}
        mass={1}
        type="kinematicPosition"
        enabledRotations={[false, false, false]}
        activeCollisionTypes={60943}
      >
        <CapsuleCollider ref={characterColliderRef} args={[1, 0.5]} />
      </RigidBody>

      <group ref={shieldHandRef}>
        <group position={[0, 0, -0.5]}>
          {equippedItems.leftHand && (
            <SkeletonShield1
              position={[-0.3, -0.4, 0.3]}
              rotation-y={Math.PI}
              scale={0.7}
            />
          )}
          {/* <Glove
            scale={[-0.3, 0.3, 0.3]}
            rotation-y={Math.PI}
            rotation-z={-Math.PI / 3}
            position={[-0.5, -0.4, 0.3]}
          /> */}

          <group
            scale={0.1}
            position={[-0.5, -0.5, 0]}
            rotation={[-Math.PI / 2, Math.PI / 6, Math.PI / 2]}
          >
            <axesHelper args={[1]} position={[0, 0, 0]} />
            <HumanHand />
          </group>
        </group>
      </group>

      <group
        ref={swordHandRef}
        onPointerMissed={() => {
          const sword = swordHandRef.current;
          if (sword) {
            sword.children[0].rotation.x = -1;
            sword.children[0].position.z = -0.5;
          }
        }}
      >
        <group
          scale={[-0.1, 0.1, 0.1]}
          position={[0.5, -0.5, 0]}
          rotation={[0, -Math.PI / 4, -Math.PI / 2]}
        >
          {equippedItems.rightHand && (
            <Sword_big
              // position={[0]}
              position={[8, 3, 1]}
              // rotation-x={-Math.PI / 2}
              scale={6}
            />
          )}
          <axesHelper args={[1]} position={[0, 0, 0]} />
          <HumanHand />
        </group>
      </group>
    </group>
  );
};

export function FirstPersonControllerWithWeapons() {
  return (
    <>
      <KeyboardControls
        map={[
          { name: "forward", keys: ["ArrowUp", "w", "W"] },
          { name: "backward", keys: ["ArrowDown", "s", "S"] },
          { name: "left", keys: ["ArrowLeft", "a", "A"] },
          { name: "right", keys: ["ArrowRight", "d", "D"] },
          { name: "jump", keys: ["Space"] },
          { name: "sprint", keys: ["Shift"] },
        ]}
      >
        <Player position={[0, 50, -10]} />
        <PointerLockControls makeDefault />
      </KeyboardControls>
    </>
  );
}
