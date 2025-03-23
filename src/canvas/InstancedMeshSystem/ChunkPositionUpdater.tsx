import { useEffect, useRef } from "react";
import { useChunkContext } from "../ChunkGenerationSystem/ChunkProvider";
import {
  addPositions,
  removePositions,
} from "./useInstancedMesh2multiMaterial";
import { XYZ } from "src/@types";

export type PositionsUpdateHookProps = {
  addPositions: addPositions;
  removePositions: removePositions;
};

export const ChunkPositionUpdater = ({
  addPositions,
  removePositions,
}: PositionsUpdateHookProps) => {
  const chunks = useChunkContext();

  const indicesPerChunk = useRef<Record<string, number[]>>({});
  const prevChunksRef = useRef<Set<string>>(new Set());

  const workerRef = useRef<Worker>();

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../my-workers/noiseWorker.ts", import.meta.url)
    );

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (!workerRef.current) return;

    workerRef.current.onmessage = (
      event: MessageEvent<{
        positions: XYZ[];
        scales: number[];
        rotations: XYZ[];
        chunkId: string;
      }>
    ) => {
      const { positions, scales, rotations, chunkId } = event.data;

      const indices = addPositions(positions, rotations, scales);
      indicesPerChunk.current[chunkId] = indices;
    };
  }, [addPositions]);

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
      if (!indicesPerChunk.current[key]) return;

      removePositions(indicesPerChunk.current[key] || []);
      delete indicesPerChunk.current[key];
    });

    newChunkKeys.forEach((chunkId) => {
      const chunk = chunks.get(chunkId)!;

      if (!workerRef.current) return;

      workerRef.current?.postMessage(chunk.position);
    });
  }, [chunks, addPositions, removePositions]);

  return null;
};
