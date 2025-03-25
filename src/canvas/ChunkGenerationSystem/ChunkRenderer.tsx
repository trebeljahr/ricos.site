import { Material } from "three";
import { MemoizedChunk, useChunkContext } from "./ChunkProvider";
import { HeightfieldTileWithCollider } from "@r3f/Scenes/HeightfieldTileWithCollider";

export const ChunkRenderer = ({ material }: { material?: Material }) => {
  const chunks = useChunkContext();

  return (
    <group>
      {Array.from(chunks).map(([key, chunkData]) => {
        return (
          <MemoizedChunk key={key} chunkData={chunkData}>
            <HeightfieldTileWithCollider
              geometry={chunkData.data!.geo}
              heightfield={chunkData.data!.heightfield}
              material={material}
            />
          </MemoizedChunk>
        );
      })}
    </group>
  );
};
