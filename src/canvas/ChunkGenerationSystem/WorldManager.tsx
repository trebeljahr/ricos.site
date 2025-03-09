import { HeightfieldTileWithCollider } from "@r3f/Scenes/HeightfieldTileWithCollider";
import { Chunk, MemoizedChunk, useChunkContext } from "./ChunkProvider";
import { debug } from "./config";
import { DebugTile } from "./DebugTile";

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
      <HeightfieldTileWithCollider
        worldOffset={chunkData.position}
        divisions={chunkData.resolution}
      />
    </group>
  );
};
