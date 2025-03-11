import { useGLTF } from "@react-three/drei";
import { extend, Object3DNode, useThree } from "@react-three/fiber";
import { InstancedMesh2 } from "@three.ez/instanced-mesh";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  Vector3,
} from "three";
import { mergeBufferGeometries } from "three-stdlib";
import { XYZ } from "./ChunkPositionUpdater";
import { GenericGltfResult } from "./GenericInstancingSystem";

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

export const useInstancedMeshMultiMaterial = ({
  modelPath,
}: {
  modelPath: string;
}) => {
  const result = useGLTF(modelPath) as any as GenericGltfResult;
  const { nodes, materials } = result;

  const { gl } = useThree();

  const addPositions = (
    positionsToAdd: XYZ[],
    rotations?: XYZ[],
    scales?: number[]
  ) => {
    let posIndex = 0;
    let indices: number[] = [];

    ref.current.addInstances(positionsToAdd.length, (obj, index) => {
      const pos = positionsToAdd[posIndex];
      obj.matrix.copy(temp.matrix);
      obj.scale.set(1, 1, 1);
      obj.position.set(pos.x, pos.y, pos.z);

      const rotation = rotations
        ? rotations[posIndex] || emptyRotation
        : emptyRotation;

      temp.rotation.set(-Math.PI / 2, 0, rotation.y);
      obj.quaternion.copy(temp.quaternion);

      const scale = scales ? scales[posIndex] : 4;
      obj.scale.multiplyScalar(100 * scale);

      posIndex++;
      indices.push(index);
    });

    return indices;
  };

  const ref = useRef<InstancedMesh2 & Object3D>(null!);
  const removePositions = (indicesToRemove: number[]) => {
    ref.current.removeInstances(...indicesToRemove);
  };

  const mergedGeos = useMemo(
    () =>
      mergeBufferGeometries(
        Object.values(nodes)
          .filter((x) => {
            return x instanceof Mesh;
          })
          .map((x) => x.geometry),
        true
      ),
    [nodes]
  );

  if (!mergedGeos) {
    throw Error("No geometries found");
  }

  const mergedMaterials = useMemo(() => Object.values(materials), [materials]);

  const InstancedMesh = useCallback(() => {
    useEffect(() => {
      if (!ref.current) return;

      ref.current.addLOD(
        new BoxGeometry(100, 1000, 100),
        new MeshLambertMaterial(),
        100
      );

      ref.current.addShadowLOD(ref.current.geometry);
      ref.current.addShadowLOD(new BoxGeometry(100, 1000, 100), 50);

      ref.current.computeBVH();
    }, []);

    return (
      <instancedMesh2
        args={[mergedGeos, mergedMaterials, { renderer: gl }]}
        ref={ref}
        frustumCulled={false}
        castShadow={true}
        // receiveShadow={true}
      />
    );
  }, [mergedGeos, mergedMaterials]);

  return {
    InstancedMesh,
    addPositions,
    removePositions,
    ref,
  };
};
