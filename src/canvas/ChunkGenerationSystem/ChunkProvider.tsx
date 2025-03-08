import { useFrame, useThree } from "@react-three/fiber";
import {
  createContext,
  memo,
  PropsWithChildren,
  useContext,
  useRef,
  useState,
} from "react";
import { Vector3 } from "three";
import {
  baseResolution,
  firstLodLevelDistance,
  maxLodLevel,
  onlyRenderOnce,
  secondLodLevelDistance,
  thirdLodLevelDistance,
  tilesDistance,
  tileSize,
} from "./config";
import { remap } from "src/lib/utils/misc";

const tempVec = new Vector3();

export type Chunk = {
  position: Vector3;
  resolution: number;
  lodLevel: number;
  chunkId: string;
};

export type ChunkMap = Map<string, Chunk>;

const ChunkContext = createContext<ChunkMap>(new Map());

export const useChunkContext = () => useContext(ChunkContext);

export const ChunkProvider = ({ children }: PropsWithChildren) => {
  const { camera } = useThree();

  const [chunks, setChunks] = useState(new Map<string, Chunk>());
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

    const radiusSquared = tilesDistance * tilesDistance * tileSize * tileSize;

    const newChunks = new Map();
    for (let x = -tilesDistance; x <= tilesDistance; x++) {
      const worldX = (x + playerGridX) * tileSize;

      for (let z = -tilesDistance; z <= tilesDistance; z++) {
        const worldZ = (z + playerGridZ) * tileSize;

        const playerX = playerGridX * tileSize;
        const playerZ = playerGridZ * tileSize;

        const distanceSquared =
          (worldX - playerX) * (worldX - playerX) +
          (worldZ - playerZ) * (worldZ - playerZ);

        const chunkId = `${worldX},${worldZ}`;
        const position = new Vector3(worldX, 0, worldZ);

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

        const resolution = Math.pow(2, lodLevel);

        newChunks.set(chunkId, {
          position,
          resolution,
          chunkId,
        });
      }
    }

    renderedOnce.current = true;
    setChunks(newChunks);
  });

  return (
    <ChunkContext.Provider value={chunks}>{children}</ChunkContext.Provider>
  );
};

export const MemoizedChunk = memo(
  function MemoChunk({
    chunkData,
    children,
  }: PropsWithChildren<{ chunkData: Chunk }>) {
    return (
      <group
        position={[chunkData.position.x, 0, chunkData.position.z]}
        rotation={[0, 0, 0]}
      >
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
