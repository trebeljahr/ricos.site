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
import { generateInstanceDataFromWorker } from "@r3f/Workers/noise/pool";

const center = new Vector3(-tileSize / 2, 0, -tileSize / 2);

type PositionsUpdateHookProps = {
  addPositions: (
    positionsToAdd: (Vector3 | XYZ)[],
    rotations?: (Vector3 | XYZ)[],
    scales?: number[]
  ) => void;
  removePositions: (positionsToRemove: (Vector3 | XYZ)[]) => void;
};

export type XYZ = {
  x: number;
  y: number;
  z: number;
};

export const ChunkPositionUpdater = ({
  addPositions,
  removePositions,
}: PositionsUpdateHookProps) => {
  const chunks = useChunkContext();

  const positionsRef = useRef<Record<string, XYZ[]>>({});

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

      removePositions(positionsRef.current[key] || []);
      delete positionsRef.current[key];
    });

    newChunkKeys.forEach(async (chunkKey) => {
      const chunk = chunks.get(chunkKey)!;

      const { positions, rotations, scales } =
        await generateInstanceDataFromWorker(chunk.position);

      positionsRef.current[chunkKey] = positions;

      if (!positionsRef.current[chunkKey]) return;

      addPositions(positions, rotations, scales);
    });
  }, [chunks, addPositions, removePositions]);

  return null;
};
