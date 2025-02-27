import { Sphere, useKeyboardControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { memo, useEffect, useState } from "react";
import { Vector3 } from "three";

export const RigidBall = memo(({ position }: { position: Vector3 }) => {
  const color = "#ff0000";

  return (
    <RigidBody colliders="ball" position={position} scale={1}>
      <Sphere castShadow receiveShadow>
        {/* <meshPhysicalMaterial color={color} /> */}
      </Sphere>
    </RigidBody>
  );
});

export const RigidBallSpawner = () => {
  const [subscribe] = useKeyboardControls();

  const [items, setItems] = useState<JSX.Element[]>([]);
  const { camera } = useThree();

  const spawnBall = () => {
    setItems((curr) => [
      ...curr,
      <RigidBall
        key={Math.random() * Math.random()}
        position={camera.position}
      />,
    ]);
  };

  useEffect(() => {
    subscribe(
      (state) => state.attack,
      (pressed) => {
        if (pressed) spawnBall();
      }
    );
  }, [subscribe]);

  return <>{items}</>;
};
