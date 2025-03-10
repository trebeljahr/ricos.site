import { TerrainData } from "@r3f/Workers/terrain/worker";
import { useFrame, useThree } from "@react-three/fiber";
import {
  createContext,
  memo,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";
import {
  firstLodLevelDistance,
  maxLodLevel,
  onlyRenderOnce,
  secondLodLevelDistance,
  thirdLodLevelDistance,
  tilesDistance,
  tileSize,
  debug,
} from "./config";
import next from "next";
import { DebugTile } from "./DebugTile";
import { HeightfieldTileWithCollider } from "@r3f/Scenes/HeightfieldTileWithCollider";

const tempVec = new Vector3();

export type Chunk = {
  position: Vector3;
  resolution: number;
  ready: boolean;
  lodLevel: number;
  chunkId: string;
  data: { geo: BufferGeometry; heightfield: number[] } | null;
};

export type ChunkMap = Map<string, Chunk>;

const ChunkContext = createContext<ChunkMap>(new Map());

const initialChunks = new Map<string, Chunk>();

for (let i = -tilesDistance; i <= tilesDistance; i++) {
  for (let j = -tilesDistance; j <= tilesDistance; j++) {
    const chunkId = `${i * tileSize},${j * tileSize}`;

    initialChunks.set(chunkId, {
      position: new Vector3(i * tileSize, 0, j * tileSize),
      resolution: 32,
      ready: false,
      lodLevel: 0,
      chunkId,
      data: null,
    });
  }
}

export const useChunkContext = () => useContext(ChunkContext);

export const ChunkProvider = ({ children }: PropsWithChildren) => {
  const { camera } = useThree();

  const [chunks, setChunks] = useState(new Map<string, Chunk>(initialChunks));
  const oldCameraGridPosition = useRef(new Vector3(0, 0, 0));

  const renderedOnce = useRef(false);

  useFrame(() => {
    if (renderedOnce.current && onlyRenderOnce) return;

    camera.getWorldPosition(tempVec);

    const playerGridX = Math.round(tempVec.x / tileSize); // tempVec.x;
    const playerGridZ = Math.round(tempVec.z / tileSize); // tempVec.z;

    tempVec.setX(playerGridX);
    tempVec.setZ(playerGridZ);

    const oldPlayerGridX = oldCameraGridPosition.current.x;
    const oldPlayerGridZ = oldCameraGridPosition.current.z;

    if (playerGridX === oldPlayerGridX && playerGridZ === oldPlayerGridZ) {
      oldCameraGridPosition.current.copy(tempVec);
      return;
    }

    const difference = tempVec.clone().sub(oldCameraGridPosition.current);
    console.log(difference);

    const newChunksToSpawn = [];
    const chunksToDelete = [];

    if (difference.x === 1) {
      for (let z = -tilesDistance; z <= tilesDistance; z++) {
        newChunksToSpawn.push({
          x: playerGridX + tilesDistance,
          z: playerGridZ + z,
        });

        chunksToDelete.push({
          x: playerGridX - tilesDistance,
          z: playerGridZ + z,
        });
      }
    } else if (difference.x === -1) {
      for (let z = -tilesDistance; z <= tilesDistance; z++) {
        newChunksToSpawn.push({
          x: playerGridX - tilesDistance,
          z: playerGridZ + z,
        });

        chunksToDelete.push({
          x: playerGridX + tilesDistance,
          z: playerGridZ + z,
        });
      }
    } else if (difference.z === 1) {
      for (let x = -tilesDistance; x <= tilesDistance; x++) {
        newChunksToSpawn.push({
          x: playerGridX + x,
          z: playerGridZ + tilesDistance,
        });

        chunksToDelete.push({
          x: playerGridX + x,
          z: playerGridZ - tilesDistance,
        });
      }
    }
    if (difference.z === -1) {
      for (let x = -tilesDistance; x <= tilesDistance; x++) {
        newChunksToSpawn.push({
          x: playerGridX + x,
          z: playerGridZ - tilesDistance,
        });

        chunksToDelete.push({
          x: playerGridX + x,
          z: playerGridZ + tilesDistance,
        });
      }
    }
    console.log(newChunksToSpawn);

    oldCameraGridPosition.current.copy(tempVec);

    const newChunks: ChunkMap = new Map(chunks);
    newChunksToSpawn.forEach(({ x, z }) => {
      const chunkId = `${x * tileSize},${z * tileSize}`;

      if (newChunks.has(chunkId)) return;

      newChunks.set(chunkId, {
        position: new Vector3(x * tileSize, 0, z * tileSize),
        resolution: 32,
        ready: false,
        lodLevel: 0,
        chunkId,
        data: null,
      });
    });

    chunksToDelete.forEach(({ x, z }) => {
      const chunkId = `${x * tileSize},${z * tileSize}`;
      if (!newChunks.has(chunkId)) return;

      newChunks.delete(chunkId);
    });

    let lodLevel = maxLodLevel;

    // const distanceInTiles = Math.max(Math.abs(x), Math.abs(z));
    // const stepDecrease = Math.floor(maxLodLevel / 3);
    // if (distanceInTiles > firstLodLevelDistance) {
    //   lodLevel -= stepDecrease;
    // }
    // if (distanceInTiles > secondLodLevelDistance) {
    //   lodLevel -= stepDecrease;
    // }
    // if (distanceInTiles > thirdLodLevelDistance) {
    //   lodLevel -= 1;
    // }

    const resolution = 32; // Math.pow(2, lodLevel);

    renderedOnce.current = true;
    setChunks(newChunks);
  });

  const workerRef = useRef<Worker>();
  const prevChunksRef = useRef(new Set<string>());

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../workers/terrain/worker.ts", import.meta.url)
    );

    workerRef.current.onmessage = (event: MessageEvent<TerrainData>) => {
      const { normals, uvs, vertices, colors, indices, heightfield, chunkId } =
        event.data;

      const geo = new BufferGeometry();

      geo.setAttribute("normal", new Float32BufferAttribute(normals, 3));
      geo.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
      geo.setAttribute("position", new Float32BufferAttribute(vertices, 3));
      geo.setAttribute("color", new Float32BufferAttribute(colors, 3));

      geo.setIndex(indices);
      geo.attributes.position.needsUpdate = true;
      geo.attributes.normal.needsUpdate = true;
      geo.attributes.uv.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;

      setChunks((prevChunks) => {
        const chunk = prevChunks.get(chunkId);

        if (!chunk) return prevChunks;

        chunk.data = { geo, heightfield };
        chunk.ready = true;
        return prevChunks;
      });
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    console.log(chunks);
  }, [chunks]);

  useEffect(() => {
    if (!workerRef.current) return;

    const currentChunkKeys = new Set(chunks.keys());
    const prevChunkKeys = prevChunksRef.current;

    const newChunkKeys = Array.from(currentChunkKeys).filter(
      (key) => !prevChunkKeys.has(key)
    );

    for (const chunkId of newChunkKeys) {
      const chunk = chunks.get(chunkId)!;

      workerRef.current.postMessage({
        worldOffset: { x: chunk.position.x, z: chunk.position.z },
        divisions: chunk.resolution,
        chunkId,
      });
    }

    prevChunksRef.current = currentChunkKeys;
  }, [chunks]);

  return (
    <ChunkContext.Provider value={chunks}>{children}</ChunkContext.Provider>
  );
};

export const MemoizedChunk = memo(
  function MemoChunk({
    chunkData,
    children,
  }: PropsWithChildren<{ chunkData: Chunk }>) {
    if (!chunkData.data) return null;
    // console.log("rendering memoized chunk");

    return (
      <group position={[chunkData.position.x, 0, chunkData.position.z]}>
        {debug && <DebugTile position={chunkData.position} />}

        {children}

        <HeightfieldTileWithCollider
          geo={chunkData.data!.geo}
          heightfield={chunkData.data!.heightfield}
        />
      </group>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.chunkData.chunkId === nextProps.chunkData.chunkId &&
      prevProps.chunkData.resolution === nextProps.chunkData.resolution &&
      prevProps.chunkData.ready === nextProps.chunkData.ready
    );
  }
);
