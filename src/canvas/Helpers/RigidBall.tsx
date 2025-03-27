import { useKeyboardInput } from "@hooks/useKeyboardInput";
import { Sphere, useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { memo, useState } from "react";
import { SnowMaterial } from "src/Materials/TextureMaterials";
import { Vector3 } from "three";

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

  const spawnBall = () => {
    setItems((curr) => [
      ...curr,
      <RigidBall
        key={Math.random() * Math.random()}
        position={camera.position}
      />,
    ]);
  };

  useKeyboardInput((event) => {
    if (event.key === "f") {
      spawnBall();
    }
  });

  return <>{items}</>;
};
