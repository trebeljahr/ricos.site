import { HeightfieldTileWithCollider } from "@r3f/Scenes/HeightfieldTileWithCollider";
import type { Material } from "three";
import { MemoizedChunk, useChunkContext } from "./ChunkProvider";

export const ChunkRenderer = ({
  material,
  withCollider = true,
}: {
  material?: Material;
  withCollider?: boolean;
}) => {
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
              withCollider={withCollider}
            />
          </MemoizedChunk>
        );
      })}
    </group>
  );
};
