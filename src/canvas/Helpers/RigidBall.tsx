import { useKeyboardInput } from "@hooks/useKeyboardInput";
import { Sphere } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { memo, useRef, useState } from "react";
import type { Vector3 } from "three";

export const RigidBall = memo(({ position }: { position: Vector3 }) => {
  return (
    <RigidBody colliders="ball" position={position} scale={1}>
      <Sphere castShadow receiveShadow></Sphere>
    </RigidBody>
  );
});

export const RigidBallSpawner = () => {
  const [items, setItems] = useState<JSX.Element[]>([]);
  const { camera } = useThree();
  const nextId = useRef(0);

  const spawnBall = () => {
    const id = nextId.current++;
    setItems((curr) => [...curr, <RigidBall key={`ball-${id}`} position={camera.position} />]);
  };

  useKeyboardInput((event) => {
    if (event.key === "f") {
      spawnBall();
    }
  });

  return <>{items}</>;
};
