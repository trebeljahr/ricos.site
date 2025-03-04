import { extend, Object3DNode, useThree } from "@react-three/fiber";
import { InstancedMesh2 } from "@three.ez/instanced-mesh";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { BufferGeometry, Material, Object3D, Vector2, Vector3 } from "three";
import {
  GenericGltfResult,
  GenericInstancingProps,
  MeshMaterialCombos,
  SingleInstanceProps,
} from "./GenericInstancingSystem";
import { usePrevious } from "@hooks/usePrevious";
import { useGLTF } from "@react-three/drei";
import { nanoid } from "nanoid";
import { pickRandomFromArray } from "../ChunkGenerationSystem/utils";
import {
  tileSize,
  treeMaxDistance,
  treeMinDistance,
} from "../ChunkGenerationSystem/config";
import { useChunkContext } from "../ChunkGenerationSystem/ChunkProvider";
import { poissonDiskSample } from "../Yuka/YukaExample";
import { splitIntoRandomGroups } from "../Helpers/utils";
import { getHeight } from "../ChunkGenerationSystem/TerrainTile";

declare module "@react-three/fiber" {
  interface ThreeElements {
    instancedMesh2: Object3DNode<InstancedMesh2, typeof InstancedMesh2>;
  }
}

extend({ InstancedMesh2 });

const temp = new Object3D();
const center = new Vector3(-tileSize / 2, 0, -tileSize / 2);
type SingleHookProps = {
  material: Material;
  geometry: BufferGeometry;
};

type PositionsUpdateHookProps = {
  addPositions: (
    positionsToAdd: Vector3[],
    rotations?: Vector3[],
    scales?: number[]
  ) => void;
  removePositions: (positionsToRemove: Vector3[]) => void;
};
const ChunkPositionUpdater = ({
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
          const { height } = getHeight(
            worldPosition.x + center.x,
            worldPosition.z + center.z
          );
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

const meshMaterialCombos: MeshMaterialCombos = [
  ["BirchTree_1_1", "White"],
  ["BirchTree_1_2", "Black"],
  ["BirchTree_1_3", "DarkGreen"],
  ["BirchTree_1_4", "Green"],
];

export const BirchTreesForChunks = memo(() => {
  const modelPath = "/3d-assets/glb/nature_pack/BirchTree_1.glb";
  const { InstancedMeshes, addPositions, removePositions } =
    useMultiInstancedMesh2({
      meshMaterialCombos,
      modelPath,
    });

  return (
    <>
      <ChunkPositionUpdater
        addPositions={addPositions}
        removePositions={removePositions}
      />
      <InstancedMeshes />
    </>
  );
});

export const RocksForChunks = memo(() => {
  const modelPath = "/3d-assets/glb/nature_pack/Rock_1.glb";
  const rockMeshMaterialCombos: MeshMaterialCombos = [["Rock_1", "Rock"]];

  const { InstancedMeshes, addPositions, removePositions } =
    useMultiInstancedMesh2({
      meshMaterialCombos: rockMeshMaterialCombos,
      modelPath,
    });

  return (
    <>
      <ChunkPositionUpdater
        addPositions={addPositions}
        removePositions={removePositions}
      />
      <InstancedMeshes />
    </>
  );
});

const emptyRotation = new Vector3(0, 0, 0);

export const useMultiInstancedMesh2 = ({
  meshMaterialCombos,
  modelPath,
}: {
  meshMaterialCombos: MeshMaterialCombos;
  modelPath: string;
}) => {
  const { nodes, materials } = useGLTF(modelPath) as any as GenericGltfResult;
  const { gl } = useThree();
  const refs = useRef<InstancedMesh2[]>([]);
  const addPositionFunctions = useRef<
    ((
      newPositions: Vector3[],
      rotations?: Vector3[],
      scales?: number[]
    ) => void)[]
  >([]);
  const removePositionFunctions = useRef<
    ((positionsToRemove: Vector3[]) => void)[]
  >([]);

  const addPositions = (
    positionsToAdd: Vector3[],
    rotations?: Vector3[],
    scales?: number[]
  ) => {
    addPositionFunctions.current.forEach((fn) =>
      fn(positionsToAdd, rotations, scales)
    );
  };

  const removePositions = (positionsToRemove: Vector3[]) => {
    removePositionFunctions.current.forEach((fn) => fn(positionsToRemove));
  };

  const InstancedMeshes = () => {
    return meshMaterialCombos.map(([meshName, materialName], index) => {
      return (
        <instancedMesh2
          key={index}
          args={[
            nodes[meshName].geometry,
            materials[materialName],
            { renderer: gl, createEntities: true },
          ]}
          ref={(node) => {
            if (!node) return;

            const i = refs.current.length || 0;

            refs.current.push(node);
            refs.current[i].computeBVH();
            (refs.current[i] as any).frustumCulled = false;
            const addPositions = (
              newPositions: Vector3[],
              newRotations?: Vector3[],
              scales?: number[]
            ) => {
              const instancedMesh2Ref = refs.current[i];

              if (!instancedMesh2Ref) return;

              let posIndex = 0;
              instancedMesh2Ref.addInstances(newPositions.length, (obj) => {
                obj.matrix.copy(temp.matrix);
                obj.scale.set(1, 1, 1);
                obj.position.copy(newPositions[posIndex]);

                const rotation = newRotations
                  ? newRotations[posIndex] || emptyRotation
                  : emptyRotation;

                temp.rotation.set(-Math.PI / 2, 0, rotation.y);
                obj.quaternion.copy(temp.quaternion);

                const scale = scales ? scales[posIndex] : 1;
                obj.scale.multiplyScalar(100 * scale);

                posIndex++;
              });
            };

            const removePositions = (positionsToRemove: Vector3[]) => {
              const instancedMesh2Ref = node;
              if (!instancedMesh2Ref) return;

              const instances = instancedMesh2Ref.instances || [];
              const indexes = instances
                .map((instance, index) => {
                  const found = positionsToRemove.find((positionToRemove) =>
                    positionToRemove.equals(instance.position)
                  );

                  if (found) {
                    return index;
                  }

                  return -1;
                })
                .filter((index) => index !== -1);

              instancedMesh2Ref.removeInstances(...indexes);
            };

            addPositionFunctions.current.push(addPositions);
            removePositionFunctions.current.push(removePositions);
          }}
        />
      );
    });
  };

  return {
    InstancedMeshes,
    addPositions,
    removePositions,
    refs,
  };
};

export const useInstancedMesh2 = ({ material, geometry }: SingleHookProps) => {
  const ref = useRef<InstancedMesh2>(null!);
  const { gl } = useThree();

  const addPositions = (newPositions: Vector3[]) => {
    const instancedMesh2 = ref.current;
    if (!instancedMesh2.instances) return;

    let counter = 0;
    instancedMesh2.addInstances(newPositions.length, (obj) => {
      obj.matrix.copy(temp.matrix);
      obj.scale.set(1, 1, 1);
      obj.position.copy(newPositions[counter++]);

      temp.rotation.set(-Math.PI / 2, 0, 0);
      obj.quaternion.copy(temp.quaternion);
      obj.scale.multiplyScalar(100);
    });
  };

  const removePositions = (positionsToRemove: Vector3[]) => {
    const instancedMesh2 = ref.current;
    if (!instancedMesh2) return;

    const indexes = instancedMesh2.instances
      .map((instance, index) => {
        const found = positionsToRemove.find((positionToRemove) =>
          positionToRemove.equals(instance.position)
        );

        if (found) {
          return index;
        }

        return -1;
      })
      .filter((index) => index !== -1);

    instancedMesh2.removeInstances(...indexes);
  };

  const InstancedMesh = () => {
    useEffect(() => {
      const instancedMesh2 = ref.current;
      if (!instancedMesh2) return;

      instancedMesh2.computeBVH();
      (instancedMesh2 as any).frustumCulled = false;
    }, []);

    return (
      <instancedMesh2
        args={[geometry, material, { renderer: gl, createEntities: true }]}
        ref={ref}
      />
    );
  };

  return { InstancedMesh, ref, addPositions, removePositions };
};

export const InstancedTileSpawner = ({
  geometry,
  material,
}: SingleHookProps) => {
  const { InstancedMesh, addPositions, removePositions, ref } =
    useInstancedMesh2({ geometry, material });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;

      const pressedF = key === "f";
      const pressedG = key === "g";

      if (pressedF) {
        const newPositions = [
          new Vector3(Math.random() * tileSize, 0, Math.random() * tileSize),
        ];
        addPositions(newPositions);
      }

      if (pressedG) {
        const randomPositions = pickRandomFromArray(
          ref.current.instances
            .filter((obj) => obj.active)
            .map((obj) => obj.position),
          1
        );

        removePositions(randomPositions);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [removePositions, addPositions, ref]);

  return <InstancedMesh />;
};

export const MultiInstancedTileSpawner = ({
  meshMaterialCombos,
  modelPath,
}: {
  meshMaterialCombos: MeshMaterialCombos;
  modelPath: string;
}) => {
  const { InstancedMeshes, addPositions, removePositions, refs } =
    useMultiInstancedMesh2({
      meshMaterialCombos,
      modelPath,
    });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;

      const pressedF = key === "f";
      const pressedG = key === "g";

      if (pressedF) {
        const newPositions = [
          new Vector3(Math.random() * tileSize, 0, Math.random() * tileSize),
        ];
        addPositions(newPositions);
      }

      if (pressedG) {
        const randomPositions = pickRandomFromArray(
          refs.current[0].instances
            .filter((obj) => obj.active)
            .map((obj) => obj.position),
          1
        );

        removePositions(randomPositions);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [removePositions, addPositions, refs]);

  return <InstancedMeshes />;
};

export const InstancedMesh2Group = ({
  meshMaterialCombos,
  modelPath,
  positions,
}: GenericInstancingProps) => {
  const { nodes, materials } = useGLTF(
    modelPath
  ) as unknown as GenericGltfResult;

  const meshMaterialCombosWithIds: [string, string, string][] = useMemo(
    () => meshMaterialCombos.map((combo) => [...combo, nanoid()]),
    [meshMaterialCombos]
  );

  return (
    <>
      {meshMaterialCombosWithIds.map(([meshName, materialName, id]) => {
        return (
          <Single
            key={id}
            positions={positions}
            geo={nodes[meshName].geometry}
            material={materials[materialName]}
          />
        );
      })}
    </>
  );
};

export const Single = ({ positions, geo, material }: SingleInstanceProps) => {
  const prevPositions = usePrevious(positions);

  const { InstancedMesh, addPositions, removePositions, ref } =
    useInstancedMesh2({
      material,
      geometry: geo,
    });

  useEffect(() => {
    const prev = prevPositions || [];

    const newPositions = positions.filter(
      (pos) => !prev.some((prevPos) => prevPos.equals(pos))
    );

    const removedPositions = prev.filter(
      (prevPos) => !positions.some((pos) => pos.equals(prevPos))
    );

    addPositions(newPositions);
    removePositions(removedPositions);
  }, [positions, prevPositions, addPositions, removePositions]);

  return <InstancedMesh />;
};
