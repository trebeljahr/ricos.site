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

  const [chunks, setChunks] = useState(new Map<string, any>());
  const oldCameraGridPosition = useRef(new Vector3(-Infinity, 0, 0));

  useFrame(() => {
    camera.getWorldPosition(tempVec);

    tempVec.divideScalar(tileSize).floor();

    const playerGridX = tempVec.x;
    const playerGridZ = tempVec.z;
    const oldPlayerGridX = oldCameraGridPosition.current.x;
    const oldPlayerGridZ = oldCameraGridPosition.current.z;

    if (playerGridX === oldPlayerGridX && playerGridZ === oldPlayerGridZ) {
      oldCameraGridPosition.current.copy(tempVec);
      return;
    }
    oldCameraGridPosition.current.copy(tempVec);

    const radiusSquared = tilesDistance * tilesDistance * tileSize * tileSize;

    const newChunks = new Map();
    for (let x = -tilesDistance; x <= tilesDistance; x++) {
      const worldX = (x + playerGridX) * tileSize;

      for (let z = -tilesDistance; z <= tilesDistance; z++) {
        const worldZ = (z + playerGridZ) * tileSize;

        const playerX = playerGridX * tileSize;
        const playerZ = playerGridZ * tileSize;

        const distanceSquared =
          (worldX - playerX) * (worldX - playerX) +
          (worldZ - playerZ) * (worldZ - playerZ);

        if (distanceSquared <= radiusSquared) {
          const chunkKey = `${worldX},${worldZ}`;
          const position = new Vector3(worldX, 0, worldZ);

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

    setChunks(newChunks);
  });

  return (
    <group>
      {Array.from(chunks).map(([key, chunkData]) => {
        return (
          <Chunk key={key} chunkId={key} chunkData={chunkData} debug={debug} />
        );
      })}
    </group>
  );
};

const Chunk = memo(
  function MemoChunk({
    chunkData,
    debug,
    chunkId,
  }: {
    chunkData: any;
    debug: boolean;
    chunkId: string;
  }) {
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
  },
  (prevProps, nextProps) => {
    return prevProps.chunkId === nextProps.chunkId;
  }
);

export const DebugTile = ({ position }: { position: Vector3 }) => {
  const textRef = useRef<any>(null!);

  useFrame(({ camera }) => {
    debug && textRef.current.quaternion.copy(camera.quaternion);
  });

  return (
    <group>
      {debug && (
        <>
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
        </>
      )}

      <group position={[-tileSize / 2, 0, -tileSize / 2]}>
        <TreeTile
          size={tileSize}
          offset={new Vector2(position.x, position.z)}
        />
      </group>
    </group>
  );
};
