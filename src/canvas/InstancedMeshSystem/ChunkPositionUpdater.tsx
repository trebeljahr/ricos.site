import { useEffect, useRef } from "react";
import { Vector2, Vector3 } from "three";
import { poissonDiskSample } from "../../lib/utils/noise";
import { useChunkContext } from "../ChunkGenerationSystem/ChunkProvider";
import {
  tileSize,
  treeMaxDistance,
  treeMinDistance,
} from "../ChunkGenerationSystem/config";
import { getHeight } from "../ChunkGenerationSystem/getHeight";

const center = new Vector3(-tileSize / 2, 0, -tileSize / 2);

type PositionsUpdateHookProps = {
  addPositions: (
    positionsToAdd: Vector3[],
    rotations?: Vector3[],
    scales?: number[]
  ) => void;
  removePositions: (positionsToRemove: Vector3[]) => void;
};

export const ChunkPositionUpdater = ({
  addPositions,
  removePositions,
}: PositionsUpdateHookProps) => {
  const chunks = useChunkContext();

  const positionsRef = useRef<Record<string, Vector3[]>>({});

  const prevChunksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentChunkKeys = new Set(chunks.keys());
    const prevChunkKeys = prevChunksRef.current;

    const newChunkKeys = Array.from(currentChunkKeys).filter(
      (key) => !prevChunkKeys.has(key)
    );

    const removedChunks = Array.from(prevChunkKeys).filter(
      (key) => !currentChunkKeys.has(key)
    );

    prevChunksRef.current = currentChunkKeys;

    removedChunks.forEach((key) => {
      if (!positionsRef.current[key]) return;

      removePositions(positionsRef.current[key]);
      delete positionsRef.current[key];
    });

    newChunkKeys.forEach((chunkKey) => {
      const chunk = chunks.get(chunkKey)!;

      const { positions, scales, rotations } = poissonDiskSample(
        tileSize,
        treeMinDistance,
        treeMaxDistance,
        {
          offset: new Vector2(chunk.position.x, chunk.position.z),
        }
      ).reduce(
        (agg, pos) => {
          const worldPosition = pos.add(chunk.position).add(center);
          const { height } = getHeight(worldPosition.x, worldPosition.z);
          const position = worldPosition.setY(height);
          const scale = 1; // Math.random() + 1;
          const rotation = new Vector3(0, Math.random() * Math.PI * 2, 0);
          agg.positions.push(position);
          agg.scales.push(scale);
          agg.rotations.push(rotation);

          return agg;
        },
        {
          positions: [] as Vector3[],
          scales: [] as number[],
          rotations: [] as Vector3[],
        }
      );

      positionsRef.current[chunkKey] = positions;

      if (!positionsRef.current[chunkKey]) return;

      addPositions(positions, rotations, scales);
    });
  }, [chunks, addPositions, removePositions]);

  return null;
};
