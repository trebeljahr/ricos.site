import { splitIntoRandomGroups } from "@components/canvas/Trees/utils";
import { poissonDiskSample } from "@components/canvas/Yuka/YukaExample";
import { InstancedBirchTree1 } from "@models/nature_pack/BirchTree_1";
import { InstancedBush1 } from "@models/nature_pack/Bush_1";
import { InstancedCommonTree5 } from "@models/nature_pack/CommonTree_5";
import { InstancedPineTree1 } from "@models/nature_pack/PineTree_1";
import { InstancedWillow1 } from "@models/nature_pack/Willow_1";
import { useMemo, useRef } from "react";
import { DoubleSide, Vector2, Vector3 } from "three";
import { debug, tileSize } from "../ChunkGenerationSystem/config";
import { Sphere } from "@react-three/drei";
import { nanoid } from "nanoid";
import { Chunk } from "../ChunkGenerationSystem/WorldManager";
import { InstancedBush2 } from "@models/nature_pack/Bush_2";
export const Forest = ({ chunks }: { chunks: Map<string, Chunk> }) => {
  // Store calculated positions in a ref to persist across renders
  const positionsRef = useRef<Record<string, Vector3[]>>({});

  // Track previous chunks for comparison
  const prevChunksRef = useRef<Set<string>>(new Set());

  const { groups, models } = useMemo(() => {
    const currentChunkKeys = new Set(chunks.keys());
    const prevChunkKeys = prevChunksRef.current;

    const newChunkKeys = Array.from(currentChunkKeys).filter(
      (key) => !prevChunkKeys.has(key)
    );

    const removedChunks = Array.from(prevChunkKeys).filter(
      (key) => !currentChunkKeys.has(key)
    );

    prevChunksRef.current = currentChunkKeys;

    // Clean up positions for removed chunks
    removedChunks.forEach((key) => {
      delete positionsRef.current[key];
    });

    console.log(newChunkKeys);

    // Calculate positions only for new chunks
    newChunkKeys.forEach((chunkKey) => {
      const chunk = chunks.get(chunkKey)!;
      //   console.log(
      //     "Computing new positions for chunk:",
      //     chunk.position.x,
      //     chunk.position.z
      //   );

      const newPositions = poissonDiskSample(tileSize, 3, 20, {
        offset: new Vector2(chunk.position.x, chunk.position.z),
      });

      positionsRef.current[chunkKey] = newPositions.map(
        (pos) =>
          new Vector3(pos.x + chunk.position.x, 0, pos.z + chunk.position.z)
      );
    });

    // Combine all positions
    const allPositions: Vector3[] = Object.values(positionsRef.current).flat();

    const groups = splitIntoRandomGroups(allPositions, 5);
    const models = [
      InstancedBirchTree1,
      InstancedBush2,
      InstancedPineTree1,
      InstancedWillow1,
      InstancedCommonTree5,
    ];

    return { groups, models };
  }, [chunks]);

  return (
    <group>
      {models.map((Model, index) => (
        <Model key={index} positions={groups[index]} />
      ))}
    </group>
  );
};

export const TreeTile = ({
  size = 100,
  offset = new Vector2(0, 0),
}: { size?: number; offset?: Vector2 } = {}) => {
  const positions = useMemo(
    () => poissonDiskSample(size, 3, 20, { offset }),
    [size, offset]
  );

  const groups = splitIntoRandomGroups(positions, 5);
  const models = [
    InstancedBirchTree1,
    InstancedBush1,
    InstancedPineTree1,
    InstancedWillow1,
    InstancedCommonTree5,
  ];

  return (
    <group>
      {models.map((Model, index) => (
        <Model key={index} positions={groups[index]} />
      ))}

      {debug && (
        <>
          <group position={[tileSize / 2, 0, tileSize / 2]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[size, size]} />
              <meshBasicMaterial color={"#6aff00"} side={DoubleSide} />
            </mesh>
          </group>
          {positions.map((position, index) => {
            return (
              <group key={nanoid() + index} position={position}>
                <Sphere args={[0.5, 16, 16]}>
                  <meshBasicMaterial color={"#005105"} />
                </Sphere>
              </group>
            );
          })}
        </>
      )}
    </group>
  );
};
