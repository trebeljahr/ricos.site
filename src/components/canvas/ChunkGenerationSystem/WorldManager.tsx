import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Vector3 } from "three";
import {
  baseResolution,
  debug,
  lodDistanceFactor,
  lodLevels,
  tilesDistance,
  tileSize,
} from "./config";
import { TerrainTile } from "./TerrainTile";

export const WorldManager = () => {
  const { camera } = useThree();
  const [cameraGridPosition, setCameraGridPosition] = useState(
    new Vector3(
      Math.floor(camera.position.x / tileSize),
      0,
      Math.floor(camera.position.z / tileSize)
    )
  );

  const activeChunks = useRef(new Map());

  useFrame(() => {
    const currentGridX = Math.floor(camera.position.x / tileSize);
    const currentGridZ = Math.floor(camera.position.z / tileSize);

    if (
      currentGridX !== cameraGridPosition.x ||
      currentGridZ !== cameraGridPosition.z
    ) {
      setCameraGridPosition(new Vector3(currentGridX, 0, currentGridZ));
    }
  });

  const visibleChunks = useMemo(() => {
    const radiusSquared = tilesDistance * tilesDistance;
    const playerGridX = cameraGridPosition.x;
    const playerGridZ = cameraGridPosition.z;

    const newVisibleChunks = new Map();

    for (
      let x = playerGridX - tilesDistance;
      x <= playerGridX + tilesDistance;
      x++
    ) {
      for (
        let z = playerGridZ - tilesDistance;
        z <= playerGridZ + tilesDistance;
        z++
      ) {
        const distanceSquared =
          (x - playerGridX) * (x - playerGridX) +
          (z - playerGridZ) * (z - playerGridZ);

        if (distanceSquared <= radiusSquared) {
          const chunkKey = `${x},${z}`;
          const position = new Vector3(x * tileSize, 0, z * tileSize);

          // Calculate LOD level based on distance
          const distance = Math.sqrt(distanceSquared);
          let lodLevel = Math.floor(
            Math.log(distance + 1) / Math.log(lodDistanceFactor)
          );

          // Clamp LOD level between 0 (highest detail) and lodLevels-1 (lowest detail)
          lodLevel = Math.max(0, Math.min(lodLevels - 1, lodLevel));

          // Calculate resolution for this LOD level
          // Each level halves the resolution from the previous level
          const resolution = Math.max(
            4,
            Math.floor(baseResolution / Math.pow(2, lodLevel))
          );

          newVisibleChunks.set(chunkKey, { position, resolution, lodLevel });
        }
      }
    }

    return newVisibleChunks;
  }, [cameraGridPosition]);

  const [chunks, setChunks] = useState(new Map());

  useEffect(() => {
    const currentActiveChunks = activeChunks.current;
    const newChunks = new Map(chunks);

    currentActiveChunks.forEach((_, key) => {
      if (!visibleChunks.has(key)) {
        newChunks.delete(key);
        currentActiveChunks.delete(key);
      }
    });

    visibleChunks.forEach((chunkData, key) => {
      if (!currentActiveChunks.has(key)) {
        newChunks.set(key, chunkData);
        currentActiveChunks.set(key, true);
      } else {
        // Update existing chunk if LOD level has changed
        const existingChunk = newChunks.get(key);
        if (existingChunk.lodLevel !== chunkData.lodLevel) {
          newChunks.set(key, chunkData);
        }
      }
    });

    setChunks(newChunks);
  }, [visibleChunks, chunks]);

  return (
    <group>
      {Array.from(chunks).map(([key, chunkData]) => {
        return (
          <group key={key}>
            <TerrainTile
              position={chunkData.position}
              resolution={chunkData.resolution}
              lodLevel={chunkData.lodLevel}
            />
            {debug && <Tile position={chunkData.position} />}
          </group>
        );
      })}
    </group>
  );
};

export const Tile = ({ position }: { position: Vector3 }) => {
  return <gridHelper args={[tileSize, 1]} position={position} />;
};
