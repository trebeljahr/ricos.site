import { Text } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { memo, useRef, useState } from "react";
import { Vector2, Vector3 } from "three";
import { Forest, SimpleGrassGroundPlane, TreeTile } from "../Trees/TreeTile";
import {
  baseResolution,
  debug,
  lodDistanceFactor,
  lodLevels,
  tilesDistance,
  tileSize,
} from "./config";
import { ChunkProvider, MemoizedChunk, useChunkContext } from "./ChunkProvider";
import { InstancedMeshForChunks } from "../Trees/useInstancedMesh2";

export const WorldManager = () => {
  return (
    <ChunkProvider>
      <WorldManagerWithChunks />
      <InstancedMeshForChunks />
    </ChunkProvider>
  );
};

const WorldManagerWithChunks = () => {
  const chunks = useChunkContext();

  return (
    <group>
      {Array.from(chunks).map(([key, chunkData]) => {
        return (
          <MemoizedChunk key={key} chunkData={chunkData}>
            <SingleTile position={chunkData.position} />
          </MemoizedChunk>
        );
      })}

      {/* <Forest chunks={chunks} /> */}
    </group>
  );
};

export const SingleTile = ({ position }: { position: Vector3 }) => {
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
            position={[0, 10, 0]}
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
        <SimpleGrassGroundPlane />
        {/* <TreeTile
          size={tileSize}
          offset={new Vector2(position.x, position.z)}
        /> */}
        {/* <TerrainTile
          position={chunkData.position}
          resolution={chunkData.resolution}
          lodLevel={chunkData.lodLevel}
        /> */}
      </group>
    </group>
  );
};
