import { getHeight } from "@r3f/ChunkGenerationSystem/getHeight";
import { PointerLockControls, useKeyboardControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { RapierRigidBody, RigidBody } from "@react-three/rapier";
import { PropsWithChildren, useEffect, useLayoutEffect, useRef } from "react";
import { Group, Vector3 } from "three";

const SPEED = 5;
const direction = new Vector3();
const frontVector = new Vector3();
const sideVector = new Vector3();

type Props = {
  speed?: number;
  initialPosition?: [number, number, number];
  initialLookat?: [number, number, number];
};

export function MinecraftCreativeController({
  speed = SPEED,
  initialPosition = [0, 0, -1],
  initialLookat = [0, 0, 0],
  children,
}: PropsWithChildren<Props>) {
  const [, get] = useKeyboardControls();
  const rigidBodyRef = useRef<RapierRigidBody>(null!);
  const { camera, gl } = useThree();

  useLayoutEffect(() => {
    camera.lookAt(...initialLookat);
    camera.position.fromArray(initialPosition);
  }, [camera, initialLookat, initialPosition]);

  useFrame(() => {
    if (!rigidBodyRef.current) return;

    const { forward, backward, leftward, rightward, jump, descend, run } =
      get();

    const { x, y, z } = rigidBodyRef.current.translation();
    camera.position.set(x, y, z);

    frontVector.set(0, 0, +backward - +forward);
    sideVector.set(+leftward - +rightward, 0, 0);

    const sprintMultiplier = run ? 2 : 1;
    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(speed * sprintMultiplier)
      .applyEuler(camera.rotation)
      .setY((+jump - +descend) * speed);

    rigidBodyRef.current.setLinvel(
      { x: direction.x, y: direction.y, z: direction.z },
      true
    );
  });

  return (
    <>
      <RigidBody
        ref={rigidBodyRef}
        colliders={false}
        mass={1}
        type="dynamic"
        position={initialPosition || camera.position}
        enabledRotations={[false, false, false]}
      >
        {children}
      </RigidBody>
      <PointerLockControls selector={"canvas"} />
    </>
  );
}

export function MinecraftSpectatorController({
  speed = SPEED,
  initialPosition = [0, 0, -1],
  initialLookat = [0, 0, 0],
  children,
}: PropsWithChildren<Props>) {
  const [, get] = useKeyboardControls();
  const ref = useRef<Group>(null!);
  const { camera } = useThree();

  useFrame(() => {
    const { forward, backward, leftward, rightward, jump, descend, run } =
      get();

    frontVector.set(0, 0, +backward - +forward);
    sideVector.set(+leftward - +rightward, 0, 0);

    const sprintMultiplier = run ? 2 : 1;
    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .multiplyScalar(speed * sprintMultiplier)
      .applyEuler(camera.rotation)
      .setY((+jump - +descend) * speed);

    camera.position.add(direction);
    camera.getWorldDirection(ref.current.position);
  });

  return (
    <group ref={ref}>
      {children}
      <PointerLockControls selector={"canvas"} />
    </group>
  );
}
