import { HeightfieldTileWithCollider } from "@r3f/Scenes/HeightfieldTileWithCollider";
import { Chunk, MemoizedChunk, useChunkContext } from "./ChunkProvider";
import { debug, flatShading, wireframe } from "./config";
import { DebugTile } from "./DebugTile";
import { DoubleSide, MeshStandardMaterial } from "three";

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
  if (!chunkData.data) return null;

  return (
    <group>
      {debug && <DebugTile position={chunkData.position} />}
      <HeightfieldTileWithCollider
        geometry={chunkData.data.geo}
        heightfield={chunkData.data.heightfield}
        material={
          new MeshStandardMaterial({
            // color="#dee6ef"
            vertexColors: true,
            side: DoubleSide,
            flatShading: flatShading,
            wireframe: wireframe,
          })
        }
      />
    </group>
  );
};
