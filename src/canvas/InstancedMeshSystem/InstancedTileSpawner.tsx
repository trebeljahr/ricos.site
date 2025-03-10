import { useKeyboardInput } from "@hooks/useKeyboardInput";
import { usePrevious } from "@hooks/usePrevious";
import { useGLTF } from "@react-three/drei";
import { extend, Object3DNode, useThree } from "@react-three/fiber";
import { InstancedMesh2 } from "@three.ez/instanced-mesh";
import { nanoid } from "nanoid";
import { useEffect, useMemo, useRef } from "react";
import { BufferGeometry, Material, Object3D, Vector3 } from "three";
import { pickRandomFromArray } from "../../lib/utils/randomFromArray";
import { tileSize } from "../ChunkGenerationSystem/config";
import {
  GenericGltfResult,
  GenericInstancingProps,
  MeshMaterialCombos,
  SingleInstanceProps,
} from "./GenericInstancingSystem";
import { useMultiInstancedMesh2 } from "./useMultiInstancedMesh2";
import { SingleHookProps, useInstancedMesh2 } from "./useInstancedMesh2";
import { useInstancedMeshMultiMaterial } from "./useInstancedMesh2multiMaterial";

export const InstancedTileSpawner = ({
  geometry,
  material,
}: SingleHookProps) => {
  const { InstancedMesh, addPositions, removePositions, ref } =
    useInstancedMesh2({ geometry, material });

  const indicesRef = useRef<number[]>([]);

  useKeyboardInput(({ key }) => {
    const pressedF = key === "f";
    const pressedG = key === "g";

    if (pressedF) {
      const newPositions = [
        new Vector3(Math.random() * tileSize, 0, Math.random() * tileSize),
      ];
      const indices = addPositions(newPositions);
      indicesRef.current = indices;
    }

    if (pressedG) {
      const randomPositions = pickRandomFromArray(indicesRef.current, 1);

      removePositions(randomPositions);
    }
  });

  return <InstancedMesh />;
};

export const InstancedMeshSpawnerMultiMaterial = ({
  modelPath,
}: {
  modelPath: string;
}) => {
  const { InstancedMesh, addPositions, removePositions } =
    useInstancedMeshMultiMaterial({
      modelPath,
    });
  const indexRef = useRef<number[]>([]);

  useKeyboardInput(({ key }) => {
    const pressedF = key === "f";
    const pressedG = key === "g";

    if (pressedF) {
      const newPositions = [
        new Vector3(Math.random() * tileSize, 0, Math.random() * tileSize),
      ];
      const indexes = addPositions(newPositions);
      indexRef.current.push(...indexes);
    }

    if (pressedG) {
      const randomPositions = pickRandomFromArray(indexRef.current, 1);
      indexRef.current.splice(indexRef.current.indexOf(randomPositions[0]), 1);
      removePositions(randomPositions);
    }
  });

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

  const indexRef = useRef<number[]>([]);

  useKeyboardInput(({ key }) => {
    const pressedF = key === "f";
    const pressedG = key === "g";

    if (pressedF) {
      const newPositions = [
        new Vector3(Math.random() * tileSize, 0, Math.random() * tileSize),
      ];
      const indexes = addPositions(newPositions);
      indexRef.current = indexes;
    }

    if (pressedG) {
      const randomPositions = pickRandomFromArray(indexRef.current, 1);
      removePositions(randomPositions);
    }
  });

  return <InstancedMeshes />;
};
