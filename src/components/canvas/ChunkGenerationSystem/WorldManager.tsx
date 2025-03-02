import { useFrame, useThree } from "@react-three/fiber";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Vector2, Vector3 } from "three";
import { TreeTile } from "../Trees/TreeTile";
import {
  baseResolution,
  debug,
  lodDistanceFactor,
  lodLevels,
  tilesDistance,
  tileSize,
} from "./config";
import { Text } from "@react-three/drei";

const tempVec = new Vector3();

export const WorldManager = () => {
  const { camera } = useThree();
  const [cameraGridPosition, setCameraGridPosition] = useState(
    new Vector3(
      Math.floor(camera.position.x / tileSize),
      0,
      Math.floor(camera.position.z / tileSize)
    )
  );

  useFrame(() => {
    camera.getWorldPosition(tempVec);

    const currentGridX = Math.floor(tempVec.x / tileSize);
    const currentGridZ = Math.floor(tempVec.z / tileSize);

    if (
      currentGridX !== cameraGridPosition.x ||
      currentGridZ !== cameraGridPosition.z
    ) {
      setCameraGridPosition(new Vector3(currentGridX, 0, currentGridZ));
    }
  });

  const [chunks, setChunks] = useState(new Map());

  useEffect(() => {
    setChunks((prev) => {
      const radiusSquared = tilesDistance * tilesDistance;
      const playerGridX = cameraGridPosition.x;
      const playerGridZ = cameraGridPosition.z;

      const newChunks = new Map();
      for (let x = -tilesDistance; x <= tilesDistance; x++) {
        const worldX = x + playerGridX;

        for (let z = -tilesDistance; z <= tilesDistance; z++) {
          const worldZ = z + playerGridZ;

          const distanceSquared =
            (worldX - playerGridX) * (worldX - playerGridX) +
            (worldZ - playerGridZ) * (worldZ - playerGridZ);

          if (distanceSquared <= radiusSquared) {
            const chunkKey = `${worldX},${worldZ}`;
            const position = new Vector3(
              worldX * tileSize,
              0,
              worldZ * tileSize
            );

            const distance = Math.sqrt(distanceSquared);
            let lodLevel = Math.floor(
              Math.log(distance + 1) / Math.log(lodDistanceFactor)
            );

            lodLevel = Math.max(0, Math.min(lodLevels - 1, lodLevel));

            const resolution = Math.max(
              4,
              Math.floor(baseResolution / Math.pow(2, lodLevel))
            );

            newChunks.set(chunkKey, {
              position,
              resolution,
              lodLevel,
            });
          }
        }
      }

      // console.log(newChunks);

      return newChunks;
    });

    // return newVisibleChunks;
  }, [cameraGridPosition]);

  // console.log("rendering chunks");

  return (
    <group>
      {Array.from(chunks).map(([key, chunkData]) => {
        return <Chunk key={key} chunkData={chunkData} debug={debug} />;
      })}
    </group>
  );
};

const Chunk = memo(function MemoChunk({
  chunkData,
  debug,
}: {
  chunkData: any;
  debug: boolean;
}) {
  // console.log(chunkData.position);
  return (
    <group position={chunkData.position}>
      {/* <TerrainTile
        position={chunkData.position}
        resolution={chunkData.resolution}
        lodLevel={chunkData.lodLevel}
      /> */}
      {/* <TreeTile
        size={tileSize}
        offset={new Vector2(chunkData.position.x, chunkData.position.z)}
      /> */}
      {debug && <DebugTile position={chunkData.position} />}
    </group>
  );
});

export const DebugTile = ({ position }: { position: Vector3 }) => {
  const textRef = useRef<any>(null!);

  useFrame(({ camera }) => {
    textRef.current.quaternion.copy(camera.quaternion);
  });

  return (
    <group>
      <Text
        ref={textRef}
        position={[0, 0, 0]}
        scale={[1, 1, 1]}
        fontSize={2}
        color={"#000000"}
      >
        {position.x},{position.z}
      </Text>
      <gridHelper args={[tileSize, 1]} />
      <axesHelper args={[6]} position={[0, 0.5, 0]} />

      <group position={[-tileSize / 2, 0, -tileSize / 2]}>
        <TreeTile
          size={tileSize}
          offset={new Vector2(position.x, position.z)}
        />
      </group>
    </group>
  );
};
