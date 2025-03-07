import { Chunk, MemoizedChunk, useChunkContext } from "./ChunkProvider";
import { debug } from "./config";
import { DebugTile } from "./DebugTile";
import { TerrainTile } from "./TerrainTile";

export const WorldManager = () => {
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
