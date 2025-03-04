import { PointerLockControls, useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import { PropsWithChildren, RefObject, useEffect, useRef } from "react";
import { Vector3 } from "three";
import { clamp, lerp } from "three/src/math/MathUtils";

const SPEED = 5;
const direction = new Vector3();
const frontVector = new Vector3();
const sideVector = new Vector3();

export function MinecraftCreativeController({
  speed = SPEED,
  children,
}: PropsWithChildren<{ speed?: number }>) {
  const [, get] = useKeyboardControls();
  const rigidBodyRef = useRef<RapierRigidBody>(null!);
  const { camera, gl } = useThree();

  useFrame(() => {
    if (!rigidBodyRef.current) return;

    const { forward, backward, left, right, jump, descend } = get();

    const { x, y, z } = rigidBodyRef.current.translation();
    camera.position.set(x, y, z);

    frontVector.set(0, 0, +backward - +forward);
    sideVector.set(+left - +right, 0, 0);

    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(speed)
      .applyEuler(camera.rotation)
      .setY((+jump - +descend) * speed);

    rigidBodyRef.current.setLinvel(
      { x: direction.x, y: direction.y, z: direction.z },
      true
    );
  });

  if (!gl.domElement) return null;

  return (
    <>
      <RigidBody
        ref={rigidBodyRef}
        colliders={false}
        mass={1}
        type="dynamic"
        position={[0, 10, 0]}
        enabledRotations={[false, false, false]}
      >
        {children}
      </RigidBody>
      <PointerLockControls domElement={gl.domElement} />
    </>
  );
}
