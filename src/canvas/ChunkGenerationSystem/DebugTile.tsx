import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";
import { tileSize } from "./config";

export const DebugTile = ({ position }: { position: Vector3 }) => {
  const textRef = useRef<any>(null!);

  useFrame(({ camera }) => {
    textRef.current.quaternion.copy(camera.quaternion);
  });

  return (
    <>
      <Text
        ref={textRef}
        position={[0, 10, 0]}
        scale={[1, 1, 1]}
        fontSize={2}
        color={"#000000"}
      >
        {position.x},{position.z}
      </Text>
      <gridHelper args={[tileSize, tileSize / 10]} />
      <axesHelper args={[1]} position={[0, 0.5, 0]} />
    </>
  );
};
