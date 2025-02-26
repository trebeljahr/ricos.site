import { useThree, useFrame } from "@react-three/fiber";
import { useMemo, useState } from "react";
import { Vector3 } from "three";

const cellSize = 10;
const visibleRadius = 10; // Radius in tile units, adjust as needed

export const WorldManager = () => {
  const { camera } = useThree();
  // Store the camera position in a state to trigger re-renders
  const [cameraGridPosition, setCameraGridPosition] = useState(
    new Vector3(
      Math.floor(camera.position.x / cellSize),
      0,
      Math.floor(camera.position.z / cellSize)
    )
  );

  // Subscribe to frame updates to check for camera movement
  useFrame(() => {
    // Calculate current grid position
    const currentGridX = Math.floor(camera.position.x / cellSize);
    const currentGridZ = Math.floor(camera.position.z / cellSize);

    // Only update state if the grid position has changed
    if (
      currentGridX !== cameraGridPosition.x ||
      currentGridZ !== cameraGridPosition.z
    ) {
      setCameraGridPosition(new Vector3(currentGridX, 0, currentGridZ));
    }
  });

  // Generate chunks based on camera grid position
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
          chunks.push(
            <Tile
              key={`${x},${z}`}
              position={new Vector3(x * cellSize, 0, z * cellSize)}
            />
          );
        }
      }
    }
    return chunks;
  }, [cameraGridPosition]);

  return <group>{chunks}</group>;
};

export const Tile = ({ position }: { position: Vector3 }) => {
  return <gridHelper args={[cellSize, 1]} position={position} />;
};
