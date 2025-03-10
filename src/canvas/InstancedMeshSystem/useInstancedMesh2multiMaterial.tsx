import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { InstancedMesh2 } from "@three.ez/instanced-mesh";
import { useEffect, useRef } from "react";
import { Mesh, Object3D, Vector3 } from "three";
import { mergeBufferGeometries } from "three-stdlib";
import { XYZ } from "./ChunkPositionUpdater";
import { GenericGltfResult } from "./GenericInstancingSystem";
import { temp } from "./useInstancedMesh2";

const emptyRotation = new Vector3(0, 0, 0);

export const useInstancedMeshMultiMaterial = ({
  modelPath,
}: {
  modelPath: string;
}) => {
  const result = useGLTF(modelPath) as any as GenericGltfResult;
  console.log(result);
  const { nodes, materials } = result;

  console.log(nodes, materials);

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

  useEffect(() => {
    if (!ref.current) return;

    ref.current.computeBVH();
    ref.current.frustumCulled = false;
  }, []);

  const ref = useRef<InstancedMesh2 & Object3D>(null!);
  const removePositions = (indicesToRemove: number[]) => {
    ref.current.removeInstances(...indicesToRemove);
  };

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

  const InstancedMesh = () => {
    return (
      <instancedMesh2
        args={[mergedGeos, mergedMaterials, { renderer: gl }]}
        ref={ref}
      />
    );
  };

  return {
    InstancedMesh,
    addPositions,
    removePositions,
    ref,
  };
};
