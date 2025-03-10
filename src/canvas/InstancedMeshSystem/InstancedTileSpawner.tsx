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

export const InstancedTileSpawner = ({
  geometry,
  material,
}: SingleHookProps) => {
  const { InstancedMesh, addPositions, removePositions, ref } =
    useInstancedMesh2({ geometry, material });

  useKeyboardInput(({ key }) => {
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

  useKeyboardInput(({ key }) => {
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
          .map((obj, index) => index),
        1
      );

      removePositions(randomPositions);
    }
  });

  return <InstancedMeshes />;
};
