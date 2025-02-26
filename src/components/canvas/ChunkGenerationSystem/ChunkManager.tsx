import { useFrame, useThree } from "@react-three/fiber";
import React, { useMemo, useRef, useState } from "react";
import { Frustum, Matrix4, Sphere, Vector3 } from "three";

// Type definitions
export type ChunkId = string;
export type ChunkCoord = [number, number, number]; // x, y, z grid coordinates
export type LoadedChunk = {
  id: ChunkId;
  coord: ChunkCoord;
  position: Vector3;
  object: React.ReactNode;
  lastUsed: number; // timestamp for LRU tracking
};

// Interface for customizing chunk loading behavior
export interface ChunkSystem {
  // Called when a new chunk should be created
  createChunk: (coord: ChunkCoord, position: Vector3) => React.ReactNode;

  // Optional callbacks for chunk lifecycle events
  onChunkLoad?: (chunk: LoadedChunk) => void;
  onChunkUnload?: (chunk: LoadedChunk) => void;

  // Configuration
  chunkSize: number; // Size of each chunk in world units
  maxActiveChunks?: number; // Maximum chunks to keep in memory (default: 256)
  loadingStrategy?: "distance" | "frustum-first" | "hybrid"; // How to prioritize loading
  viewDistance?: number; // Max distance to load chunks (in chunk units)
}

// Helper function to create a chunk ID from coordinates
const createChunkId = (coord: ChunkCoord): ChunkId => {
  return `chunk_${coord[0]}_${coord[1]}_${coord[2]}`;
};

// Helper to convert world position to chunk coordinates
export const worldToChunkCoord = (
  position: Vector3,
  chunkSize: number
): ChunkCoord => {
  return [
    Math.floor(position.x / chunkSize),
    Math.floor(position.y / chunkSize),
    Math.floor(position.z / chunkSize),
  ];
};

// Helper to convert chunk coordinates to world position (chunk center)
export const chunkCoordToWorld = (
  coord: ChunkCoord,
  chunkSize: number
): Vector3 => {
  return new Vector3(
    (coord[0] + 0.5) * chunkSize,
    (coord[1] + 0.5) * chunkSize,
    (coord[2] + 0.5) * chunkSize
  );
};

// Main hook that provides chunk management functionality
export const useChunkManager = (chunkSystem: ChunkSystem) => {
  // Extract configuration from the chunk system
  const {
    createChunk,
    onChunkLoad,
    onChunkUnload,
    chunkSize,
    maxActiveChunks = 256,
    loadingStrategy = "hybrid",
    viewDistance = 10,
  } = chunkSystem;

  // Access to the camera and scene
  const { camera } = useThree();

  // State to track loaded chunks
  const [loadedChunks, setLoadedChunks] = useState<Map<ChunkId, LoadedChunk>>(
    new Map()
  );

  // Create and cache a frustum for culling
  const frustumRef = useRef(new Frustum());
  const projScreenMatrixRef = useRef(new Matrix4());

  // Camera position tracking
  const lastCameraPosRef = useRef(new Vector3());
  const cameraMoveDistanceRef = useRef(0);

  // Update the frustum and handle chunk loading/unloading
  useFrame(() => {
    // Update the view frustum for culling
    camera.updateMatrixWorld();
    projScreenMatrixRef.current.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustumRef.current.setFromProjectionMatrix(projScreenMatrixRef.current);

    // Calculate camera movement since last frame
    const cameraPos = camera.position.clone();
    cameraMoveDistanceRef.current = cameraPos.distanceTo(
      lastCameraPosRef.current
    );
    lastCameraPosRef.current.copy(cameraPos);

    // Skip update if camera barely moved and we're at max chunks
    if (
      cameraMoveDistanceRef.current < 0.1 &&
      loadedChunks.size >= maxActiveChunks
    ) {
      return;
    }

    // Update chunks
    updateChunks();
  });

  // Calculate which chunks should be visible
  const calculateVisibleChunks = () => {
    const cameraPos = camera.position;
    const cameraChunkCoord = worldToChunkCoord(cameraPos, chunkSize);
    const visibleChunks = new Set<string>();

    // Get chunks in a cubic area around the camera
    for (let x = -viewDistance; x <= viewDistance; x++) {
      for (let y = -viewDistance; y <= viewDistance; y++) {
        for (let z = -viewDistance; z <= viewDistance; z++) {
          const coord: ChunkCoord = [
            cameraChunkCoord[0] + x,
            cameraChunkCoord[1] + y,
            cameraChunkCoord[2] + z,
          ];

          // Calculate chunk center position
          const chunkPos = chunkCoordToWorld(coord, chunkSize);

          // Create a sphere representing the chunk for distance and frustum check
          const chunkSphere = new Sphere(chunkPos, chunkSize * 0.87); // Roughly sqrt(3)/2 for diagonal

          // Check if chunk is within view distance
          const distanceToCamera = chunkPos.distanceTo(cameraPos);
          if (distanceToCamera > viewDistance * chunkSize) {
            continue;
          }

          // Check if chunk is in view frustum (for frustum-first and hybrid strategies)
          if (loadingStrategy !== "distance") {
            if (!frustumRef.current.intersectsSphere(chunkSphere)) {
              // If using hybrid strategy, we still include chunks close to the camera
              if (
                loadingStrategy === "hybrid" &&
                distanceToCamera < 2 * chunkSize
              ) {
                visibleChunks.add(createChunkId(coord));
              }
              continue;
            }
          }

          visibleChunks.add(createChunkId(coord));
        }
      }
    }

    return visibleChunks;
  };

  // Update which chunks are loaded and unloaded
  const updateChunks = () => {
    const visibleChunkIds = calculateVisibleChunks();
    const currentTime = Date.now();
    const newChunks = new Map(loadedChunks);

    // Update existing chunks and mark them as used
    for (const chunkId of visibleChunkIds) {
      if (newChunks.has(chunkId)) {
        const chunk = newChunks.get(chunkId)!;
        chunk.lastUsed = currentTime;
        newChunks.set(chunkId, chunk);
      } else {
        // Create a new chunk if it doesn't exist and we have space
        if (
          newChunks.size < maxActiveChunks ||
          findChunkToRemove(newChunks, chunkId)
        ) {
          // Parse the coordinates from the ID
          const parts = chunkId.split("_");
          const coord: ChunkCoord = [
            parseInt(parts[1]),
            parseInt(parts[2]),
            parseInt(parts[3]),
          ];

          // Calculate position
          const position = chunkCoordToWorld(coord, chunkSize);

          // Create the chunk
          const object = createChunk(coord, position);

          // Add to loaded chunks
          const newChunk: LoadedChunk = {
            id: chunkId,
            coord,
            position,
            object,
            lastUsed: currentTime,
          };

          newChunks.set(chunkId, newChunk);

          // Call the onChunkLoad callback if provided
          if (onChunkLoad) {
            onChunkLoad(newChunk);
          }
        }
      }
    }

    // Remove chunks that are no longer visible
    for (const [chunkId, chunk] of newChunks.entries()) {
      if (!visibleChunkIds.has(chunkId)) {
        // Use a time-based unloading strategy to prevent thrashing
        const timeSinceUsed = currentTime - chunk.lastUsed;

        // Only unload if it hasn't been used recently
        if (timeSinceUsed > 5000) {
          // 5 seconds grace period
          // Call the onChunkUnload callback if provided
          if (onChunkUnload) {
            onChunkUnload(chunk);
          }

          newChunks.delete(chunkId);
        }
      }
    }

    // Update state if changes were made
    if (newChunks.size !== loadedChunks.size) {
      setLoadedChunks(newChunks);
    }
  };

  // Find a chunk that can be removed to make space for a new one
  const findChunkToRemove = (
    chunks: Map<ChunkId, LoadedChunk>,
    newChunkId: ChunkId
  ): boolean => {
    if (chunks.size < maxActiveChunks) {
      return false; // No need to remove anything
    }

    // Find the least recently used chunk
    let oldestChunk: LoadedChunk | null = null;
    let oldestTime = Infinity;

    for (const chunk of chunks.values()) {
      if (chunk.lastUsed < oldestTime) {
        oldestTime = chunk.lastUsed;
        oldestChunk = chunk;
      }
    }

    if (oldestChunk) {
      // Call the unload callback
      if (onChunkUnload) {
        onChunkUnload(oldestChunk);
      }

      // Remove the chunk
      chunks.delete(oldestChunk.id);
      return true;
    }

    return false;
  };

  // Return the currently loaded chunks as a renderable list
  const chunkObjects = useMemo(() => {
    return Array.from(loadedChunks.values()).map((chunk) => (
      <group key={chunk.id} position={chunk.position}>
        {chunk.object}
      </group>
    ));
  }, [loadedChunks]);

  // Expose the current chunks and helper methods
  return {
    chunks: loadedChunks,
    chunkObjects,

    // Helper to manually refresh chunks
    refreshChunks: updateChunks,

    // Helper to get currently loaded chunk IDs
    getLoadedChunkIds: () => new Set(loadedChunks.keys()),

    // Helper to check if a specific chunk is loaded
    isChunkLoaded: (coord: ChunkCoord) =>
      loadedChunks.has(createChunkId(coord)),

    // Helper to manually load a specific chunk
    loadChunk: (coord: ChunkCoord) => {
      const chunkId = createChunkId(coord);
      if (!loadedChunks.has(chunkId)) {
        const position = chunkCoordToWorld(coord, chunkSize);
        const object = createChunk(coord, position);
        const newChunk: LoadedChunk = {
          id: chunkId,
          coord,
          position,
          object,
          lastUsed: Date.now(),
        };

        setLoadedChunks((prev) => {
          const newChunks = new Map(prev);
          newChunks.set(chunkId, newChunk);
          if (onChunkLoad) onChunkLoad(newChunk);
          return newChunks;
        });
      }
    },

    // Helper to manually unload a specific chunk
    unloadChunk: (coord: ChunkCoord) => {
      const chunkId = createChunkId(coord);
      if (loadedChunks.has(chunkId)) {
        const chunk = loadedChunks.get(chunkId)!;
        if (onChunkUnload) onChunkUnload(chunk);

        setLoadedChunks((prev) => {
          const newChunks = new Map(prev);
          newChunks.delete(chunkId);
          return newChunks;
        });
      }
    },
  };
};

// Component wrapper for the hook
export const ChunkManager: React.FC<{
  children?: React.ReactNode;
  chunkSystem: ChunkSystem;
}> = ({ children, chunkSystem }) => {
  const { chunkObjects } = useChunkManager(chunkSystem);

  return (
    <>
      {chunkObjects}
      {children}
    </>
  );
};
