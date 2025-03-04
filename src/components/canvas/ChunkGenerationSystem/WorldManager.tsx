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
import {
  Chunk,
  ChunkProvider,
  MemoizedChunk,
  useChunkContext,
} from "./ChunkProvider";
import {
  BirchTreesForChunks,
  RocksForChunks,
} from "../InstancedMeshSystem/useInstancedMesh2";
import { TerrainTile } from "./TerrainTile";

export const WorldManager = () => {
  return (
    <ChunkProvider>
      <WorldManagerWithChunks />
      <BirchTreesForChunks />
      <RocksForChunks />
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
            <SingleTile chunkData={chunkData} />
          </MemoizedChunk>
        );
      })}

      {/* <Forest chunks={chunks} /> */}
    </group>
  );
};

export const SingleTile = ({ chunkData }: { chunkData: Chunk }) => {
  const textRef = useRef<any>(null!);
  const position = chunkData.position;

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

      <group>
        {/* <SimpleGrassGroundPlane /> */}

        <TerrainTile
          position={chunkData.position}
          resolution={chunkData.resolution}
          lodLevel={chunkData.lodLevel}
        />
      </group>
    </group>
  );
};
