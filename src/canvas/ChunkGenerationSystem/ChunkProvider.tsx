import { TerrainData } from "@r3f/my-workers/terrainWorker";
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
  debug,
  firstLodLevelDistance,
  maxLodLevel,
  onlyRenderOnce,
  secondLodLevelDistance,
  thirdLodLevelDistance,
  tilesDistance,
  tileSize,
} from "./config";
import { DebugTile } from "./DebugTile";

const tempVec = new Vector3();

export type Chunk = {
  position: Vector3;
  resolution: number;
  ready: boolean;
  lodLevel: number;
  chunkId: string;
  data: { geo: BufferGeometry; heightfield: number[] } | null;
};

const initialChunkIds = new Set<string>();

for (let i = -tilesDistance; i <= tilesDistance; i++) {
  for (let j = -tilesDistance; j <= tilesDistance; j++) {
    const chunkId = `${i * tileSize},${j * tileSize}`;

    initialChunkIds.add(chunkId);
  }
}

export type ChunkMap = Map<string, Chunk>;

const ChunkContext = createContext<ChunkMap>(new Map());

export const useChunkContext = () => useContext(ChunkContext);

export const ChunkProvider = ({ children }: PropsWithChildren) => {
  const { camera } = useThree();

  const [chunks, setChunks] = useState(new Map<string, Chunk>());
  const [chunkIds, setChunkIds] = useState<Set<string>>(initialChunkIds);
  const oldCameraGridPosition = useRef(new Vector3(-Infinity, 0, 0));

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

    oldCameraGridPosition.current.copy(tempVec);

    const newChunkIds = new Set<string>();
    for (let x = -tilesDistance; x <= tilesDistance; x++) {
      const worldX = (x + playerGridX) * tileSize;

      for (let z = -tilesDistance; z <= tilesDistance; z++) {
        const worldZ = (z + playerGridZ) * tileSize;

        const chunkId = `${worldX},${worldZ}`;
        newChunkIds.add(chunkId);
      }
    }

    setChunkIds(newChunkIds);

    renderedOnce.current = true;
  });

  const workerRef = useRef<Worker>();
  const prevChunksRef = useRef(new Set<string>());

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../my-workers/terrainWorker.ts", import.meta.url)
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
        const newChunks = new Map(prevChunks);
        const [worldX, worldZ] = chunkId.split(",").map(Number);
        const position = new Vector3(worldX, 0, worldZ);
        let lodLevel = maxLodLevel;

        const resolution = 32;
        newChunks.set(chunkId, {
          position,
          resolution,
          chunkId: chunkId,
          ready: true,
          lodLevel,
          data: { geo, heightfield },
        });

        return newChunks;
      });
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (!workerRef.current) return;

    const currentChunkKeys = chunkIds;
    const prevChunkKeys = prevChunksRef.current;

    const newChunkKeys = Array.from(currentChunkKeys).filter(
      (key) => !prevChunkKeys.has(key)
    );

    const deletedChunkKeys = Array.from(prevChunkKeys).filter(
      (key) => !currentChunkKeys.has(key)
    );

    for (const chunkId of deletedChunkKeys) {
      setChunks((prevChunks) => {
        const newChunks = new Map(prevChunks);
        newChunks.delete(chunkId);
        return newChunks;
      });
    }

    for (const chunkId of newChunkKeys) {
      let [chunkX, chunkZ] = chunkId.split(",").map(Number);
      camera.getWorldPosition(tempVec);

      const playerGridX = Math.round(tempVec.x / tileSize); // tempVec.x;
      const playerGridZ = Math.round(tempVec.z / tileSize); // tempVec.z;
      const x = chunkX - playerGridX;
      const z = chunkZ - playerGridZ;

      const distanceInTiles = Math.max(Math.abs(x), Math.abs(z));

      let lodLevel = maxLodLevel;
      const stepDecrease = Math.floor(maxLodLevel / 3);
      if (distanceInTiles > firstLodLevelDistance) {
        lodLevel -= stepDecrease;
      }
      if (distanceInTiles > secondLodLevelDistance) {
        lodLevel -= stepDecrease;
      }
      if (distanceInTiles > thirdLodLevelDistance) {
        lodLevel -= 1;
      }

      const resolution = 64; //Math.pow(2, lodLevel);

      workerRef.current.postMessage({
        worldOffset: { x: chunkX, z: chunkZ },
        divisions: resolution,
        chunkId,
      });
    }

    prevChunksRef.current = currentChunkKeys;
  }, [chunkIds]);

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

    return (
      <group position={[chunkData.position.x, 0, chunkData.position.z]}>
        {debug && <DebugTile position={chunkData.position} />}

        {children}
      </group>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.chunkData.chunkId === nextProps.chunkData.chunkId &&
      prevProps.chunkData.resolution === nextProps.chunkData.resolution
    );
  }
);
