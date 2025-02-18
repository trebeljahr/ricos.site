import { OrbitControls, useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { RapierRigidBody, RigidBody, useRapier } from "@react-three/rapier";
import { MutableRefObject, useEffect, useRef } from "react";
import { Group, Quaternion, Vector3 } from "three";
import { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Trex } from "./Trex";
import { KinematicCharacterController, Ray } from "@dimforge/rapier3d-compat";

const velocity = 20;

export const lerp = (x: number, y: number, a: number) => x * (1 - a) + y * a;

export function useCharacterController(
  rigidBodyRef: MutableRefObject<RapierRigidBody>,
  orbitControlsRef: MutableRefObject<OrbitControlsImpl>
) {
  const walkDirectionRef = useRef(new Vector3());
  const rotateAngleRef = useRef(new Vector3(0, 1, 0));
  const rotateQuaternionRef = useRef(new Quaternion());
  const cameraTargetRef = useRef(new Vector3());
  const storedFallRef = useRef(0);
  const rapier = useRapier();

  const characterControllerRef = useRef<
    ReturnType<typeof rapier.world.createCharacterController>
  >(null!);

  const { camera } = useThree();
  useEffect(() => {
    const world = rapier.world;
    const offset = 0.01;
    characterControllerRef.current = world.createCharacterController(offset);
    characterControllerRef.current.setSlideEnabled(true);
  }, [rapier.world]);

  const [, get] = useKeyboardControls();

  useEffect(() => {
    camera.position.x = 13.215805596242717;
    camera.position.y = 11.909650511238405;
    camera.position.z = 6.833426473391409;
  }, [camera]);

  // useEffect(() => {
  //   const cameraTarget = cameraTargetRef.current
  //   const orbitControls = orbitControlsRef.current

  //   if (!orbitControls || !cameraTarget) return

  //   cameraTarget.x = model.position.x
  //   cameraTarget.y = model.position.y + 10
  //   cameraTarget.z = model.position.z
  //   orbitControls.target = cameraTarget
  // }, [orbitControlsRef, cameraTargetRef])

  useFrame((_, delta) => {
    const walkDirection = walkDirectionRef.current;
    const rotateAngle = rotateAngleRef.current;
    const rotateQuaternion = rotateQuaternionRef.current;
    const cameraTarget = cameraTargetRef.current;
    const orbitControls = orbitControlsRef.current;
    const rigidBody = rigidBodyRef.current;
    const characterController = characterControllerRef.current;

    if (
      !characterController ||
      !walkDirection ||
      !rotateAngle ||
      !rotateQuaternion ||
      !cameraTarget ||
      !orbitControls ||
      !rigidBody
    ) {
      return;
    }

    function updateCameraTarget(offset: Vector3) {
      const pos = rigidBody.translation();
      camera.position.x = pos.x + offset.x;
      camera.position.y = pos.y + offset.y;
      camera.position.z = pos.z + offset.z;

      cameraTarget.x = pos.x;
      cameraTarget.y = pos.y + 10;
      cameraTarget.z = pos.z;

      orbitControls.target = cameraTarget;
    }

    function getDirectionOffset() {
      let directionOffset = 0;
      const { forward, left, right, backward } = get();
      if (!forward && !left && !right && !backward)
        return { directionOffset, isMoving: false };

      if (forward) {
        if (left) {
          directionOffset = Math.PI / 4;
        } else if (right) {
          directionOffset = -Math.PI / 4;
        }
      } else if (backward) {
        if (left) {
          directionOffset = Math.PI / 4 + Math.PI / 2;
        } else if (right) {
          directionOffset = -Math.PI / 4 - Math.PI / 2;
        } else {
          directionOffset = Math.PI;
        }
      } else if (left) {
        directionOffset = Math.PI / 2;
      } else if (right) {
        directionOffset = -Math.PI / 2;
      }

      return { directionOffset, isMoving: true };
    }

    function updateCamera() {
      const { directionOffset, isMoving } = getDirectionOffset();
      if (!isMoving) return;

      const position = rigidBody.translation();
      const angleYCameraDirection = Math.atan2(
        camera.position.x - position.x,
        camera.position.z - position.z
      );

      // rotateQuaternion.setFromAxisAngle(rotateAngle, angleYCameraDirection + directionOffset)
      // model.quaternion.rotateTowards(rotateQuaternion, 0.2)

      camera.getWorldDirection(walkDirection);
      walkDirection.y = 0;
      walkDirection.normalize();
      walkDirection.applyAxisAngle(rotateAngle, directionOffset);

      const translation = rigidBody.translation();
      if (translation.y < -1) {
        rigidBody.setNextKinematicTranslation({
          x: 0,
          y: 10,
          z: 0,
        });
      } else {
        const cameraPositionOffset = camera.position.sub(
          new Vector3(position.x, position.y, position.z)
        );
        // model.position.x = translation.x
        // model.position.y = translation.y
        // model.position.z = translation.z
        updateCameraTarget(cameraPositionOffset);

        const world = rapier.world;

        // const ray = world.castRay(, { x: 0, y: -1, z: 0 }))

        walkDirection.y += lerp(storedFallRef.current, -9.81 * delta, 0.1);
        storedFallRef.current = walkDirection.y;
        const ray = new Ray(translation, { x: 0, y: -1, z: 0 });
        let hit = world.castRay(ray, 0.5, false, 1);
        if (hit) {
          const grounded =
            hit && hit.collider && Math.abs(hit.timeOfImpact) <= 1.75;
          if (grounded) {
            storedFallRef.current = 0;
            walkDirection.y = lerp(0, Math.abs(hit.timeOfImpact), 0.5);
          }
        }

        walkDirection.x = walkDirection.x * velocity * delta;
        walkDirection.z = walkDirection.z * velocity * delta;

        const collider = world.getCollider(rigidBody.handle);
        const api = rigidBody;
        const collider2 = api.collider(0);

        const desiredTranslation = {
          x: translation.x + walkDirection.x,
          y: translation.y + walkDirection.y,
          z: translation.z + walkDirection.z,
        };
        characterController.computeColliderMovement(
          collider2,
          desiredTranslation
        );

        let correctedMovement = characterController.computedMovement();
        const { x, y, z } = correctedMovement;
        rigidBody.setNextKinematicTranslation({ x, y: 0, z });
      }
    }

    updateCamera();
  });
}
export function ImprovedPlayerController() {
  const modelRef = useRef<Group>(null!);
  const rigidBodyRef = useRef<RapierRigidBody>(null!);
  const orbitControlsRef = useRef<OrbitControlsImpl>(null!);

  useCharacterController(rigidBodyRef, orbitControlsRef);

  const orbitControlsProps = {
    enableDamping: true,
    minDistance: 5,
    maxDistance: 30,
    enablePan: false,
    maxPolarAngle: Math.PI / 2 - 0.05,
  };

  return (
    <>
      <RigidBody
        colliders="hull"
        ref={rigidBodyRef}
        type="kinematicPosition"
        enabledRotations={[false, false, false]}
      >
        <Trex withAnimations={true} />
      </RigidBody>
      <OrbitControls ref={orbitControlsRef} {...orbitControlsProps} />
    </>
  );
}
