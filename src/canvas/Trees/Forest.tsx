import { InstancedBirchTree1 } from "@r3f/AllModels/nature_pack/BirchTree_1";
import { InstancedBush2 } from "@r3f/AllModels/nature_pack/Bush_2";
import { InstancedCommonTree5 } from "@r3f/AllModels/nature_pack/CommonTree_5";
import { InstancedPineTree1 } from "@r3f/AllModels/nature_pack/PineTree_1";
import { InstancedWillow1 } from "@r3f/AllModels/nature_pack/Willow_1";
import { useMemo, useRef } from "react";
import { splitIntoRandomGroups } from "src/lib/utils/randomGroups";
import { Vector2, Vector3 } from "three";
import { poissonDiskSample } from "../../lib/utils/noise";
import type { ChunkMap } from "../ChunkGenerationSystem/ChunkProvider";
import { tileSize } from "../ChunkGenerationSystem/config";

export const Forest = ({ chunks }: { chunks: ChunkMap }) => {
  const positionsRef = useRef<Record<string, Vector3[][]>>({});

  const prevChunksRef = useRef<Set<string>>(new Set());

  const { groups, models } = useMemo(() => {
    const models = [
      InstancedBirchTree1,
      InstancedBush2,
      InstancedPineTree1,
      InstancedWillow1,
      InstancedCommonTree5,
    ];

    const currentChunkKeys = new Set(chunks.keys());
    const prevChunkKeys = prevChunksRef.current;

    const newChunkKeys = Array.from(currentChunkKeys).filter((key) => !prevChunkKeys.has(key));

    const removedChunks = Array.from(prevChunkKeys).filter((key) => !currentChunkKeys.has(key));

    prevChunksRef.current = currentChunkKeys;

    for (const key of removedChunks) {
      delete positionsRef.current[key];
    }

    for (const chunkId of newChunkKeys) {
      const chunk = chunks.get(chunkId)!;

      const newPositions = poissonDiskSample(tileSize, 3, 20, {
        offset: new Vector2(chunk.position.x, chunk.position.z),
      });

      const groups = splitIntoRandomGroups(
        newPositions.map(
          (pos) => new Vector3(pos.x + chunk.position.x, 0, pos.z + chunk.position.z),
        ),
        5,
      );

      positionsRef.current[chunkId] = groups;
    }

    const mergedGroups: Vector3[][] = Array.from({ length: models.length }, () => []);

    for (const chunkGroups of Object.values(positionsRef.current)) {
      chunkGroups.forEach((group, groupIndex) => {
        if (!mergedGroups[groupIndex]) {
          mergedGroups[groupIndex] = [];
        }

        mergedGroups[groupIndex].push(...group);
      });
    }

    const groups = mergedGroups;

    return { groups, models };
  }, [chunks]);

  return (
    <group>
      {models.map((Model, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: stable list rendered once, no reorder
        <Model key={index} positions={groups[index]} />
      ))}
    </group>
  );
};
