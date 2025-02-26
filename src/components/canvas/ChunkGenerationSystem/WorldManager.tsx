import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import { Vector3 } from "three";

const cellSize = 10;
const visibleRadius = 10;

export const WorldManager = () => {
  const { camera } = useThree();
  const [cameraGridPosition, setCameraGridPosition] = useState(
    new Vector3(
      Math.floor(camera.position.x / cellSize),
      0,
      Math.floor(camera.position.z / cellSize)
    )
  );

  useFrame(() => {
    const currentGridX = Math.floor(camera.position.x / cellSize);
    const currentGridZ = Math.floor(camera.position.z / cellSize);

    if (
      currentGridX !== cameraGridPosition.x ||
      currentGridZ !== cameraGridPosition.z
    ) {
      setCameraGridPosition(new Vector3(currentGridX, 0, currentGridZ));
    }
  });

  const chunks = useMemo(() => {
    const chunks = [];
    const radiusSquared = visibleRadius * visibleRadius;

    const playerGridX = cameraGridPosition.x;
    const playerGridZ = cameraGridPosition.z;

    for (
      let x = playerGridX - visibleRadius;
      x <= playerGridX + visibleRadius;
      x++
    ) {
      for (
        let z = playerGridZ - visibleRadius;
        z <= playerGridZ + visibleRadius;
        z++
      ) {
        const distanceSquared =
          (x - playerGridX) * (x - playerGridX) +
          (z - playerGridZ) * (z - playerGridZ);

        if (distanceSquared <= radiusSquared) {
          chunks.push(new Vector3(x * cellSize, 0, z * cellSize));
        }
      }
    }
    return chunks;
  }, [cameraGridPosition]);

  return (
    <group>
      {chunks.map((pos) => {
        return <Tile key={`${pos.x},${pos.z}`} position={pos} />;
      })}
    </group>
  );
};

export const Tile = ({ position }: { position: Vector3 }) => {
  return <gridHelper args={[cellSize, 1]} position={position} />;
};
