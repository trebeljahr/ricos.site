import { useGLTF } from "@react-three/drei";
import { extend, Object3DNode, useThree } from "@react-three/fiber";
import { InstancedMesh2 } from "@three.ez/instanced-mesh";
import { useEffect, useMemo, useRef } from "react";
import { GLTFResult, XYZ } from "src/@types";
import {
  BoxGeometry,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from "three";
import { mergeBufferGeometries } from "three-stdlib";
import { GenericGltfResult } from "./GenericInstancingSystem";
import { useInstancedMesh2 } from "./useInstancedMesh2";

declare module "@react-three/fiber" {
  interface ThreeElements {
    instancedMesh2: Object3DNode<
      InstancedMesh2 & Object3D,
      typeof InstancedMesh2
    >;
  }
}

extend({ InstancedMesh2 });

const emptyRotation = new Vector3(0, 0, 0);
const temp = new Object3D();

export type InstancedMeshMultiMaterialHook = ReturnType<
  typeof useInstancedMeshMultiMaterial
>;

export type addPositions = InstancedMeshMultiMaterialHook["addPositions"];
export type removePositions = InstancedMeshMultiMaterialHook["removePositions"];

const mergeMaterialsAndGeos = ({ nodes, materials }: GLTFResult) => {
  const mergedGeos = mergeBufferGeometries(
    Object.values(nodes)
      .filter((x) => {
        return x instanceof Mesh;
      })
      .map((x) => x.geometry),
    true
  );

  if (!mergedGeos) {
    throw Error("No geometries found");
  }

  const mergedMaterials = Object.values(materials);

  return { mergedGeos, mergedMaterials };
};

export const useInstancedMeshMultiMaterial = ({
  modelPath,
  defaultScale = 1,
  emissive,
  emissiveIntensity,
}: {
  modelPath: string;
  defaultScale?: number;
  emissive?: string;
  emissiveIntensity?: number;
}) => {
  const result = useGLTF(modelPath) as any as GenericGltfResult;
  const { mergedGeos, mergedMaterials } = mergeMaterialsAndGeos(result);
  const { InstancedMesh, addPositions, removePositions, ref } =
    useInstancedMesh2({
      geometry: mergedGeos,
      material: mergedMaterials,
      defaultScale,
      emissiveColor: emissive,
      emissiveIntensity,
    });

  return {
    InstancedMesh,
    addPositions,
    removePositions,
    ref,
  };
};
