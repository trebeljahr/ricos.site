import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import {
  Chunk,
  ChunkProvider,
  MemoizedChunk,
  useChunkContext,
} from "./ChunkProvider";
import { debug, tileSize } from "./config";
import { TerrainTile } from "./TerrainTile";
import { BirchTreesForChunks, RocksForChunks } from "./ChunkInstancedMeshes";
import { Vector3 } from "three";

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
    </group>
  );
};

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
      <gridHelper args={[tileSize, 1]} />
      <axesHelper args={[6]} position={[0, 0.5, 0]} />
    </>
  );
};

export const SingleTile = ({ chunkData }: { chunkData: Chunk }) => {
  return (
    <group>
      {debug && <DebugTile position={chunkData.position} />}
      <TerrainTile
        position={chunkData.position}
        resolution={chunkData.resolution}
        lodLevel={chunkData.lodLevel}
      />
    </group>
  );
};
