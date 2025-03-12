import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { InstancedMesh2 } from "@three.ez/instanced-mesh";
import { useRef } from "react";
import { Vector3 } from "three";
import {
  MeshMaterialCombos,
  GenericGltfResult,
} from "./GenericInstancingSystem";
import { temp } from "./useInstancedMesh2";
import { XYZ } from "src/@types";

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
    ((newPositions: XYZ[], rotations?: XYZ[], scales?: number[]) => number[])[]
  >([]);
  const removePositionFunctions = useRef<
    ((indicesToRemove: number[]) => void)[]
  >([]);

  const addPositions = (
    positionsToAdd: XYZ[],
    rotations?: XYZ[],
    scales?: number[]
  ) => {
    const indices = addPositionFunctions.current
      .map((fn) => fn(positionsToAdd, rotations, scales))
      .flat();
    return indices;
  };

  const removePositions = (indicesToRemove: number[]) => {
    removePositionFunctions.current.forEach((fn) => fn(indicesToRemove));
  };

  const InstancedMeshes = () => {
    return meshMaterialCombos.map(([meshName, materialName], index) => {
      return (
        <instancedMesh2
          key={index}
          args={[
            nodes[meshName].geometry,
            materials[materialName],
            { renderer: gl },
          ]}
          ref={(node) => {
            if (!node) return;

            const i = refs.current.length || 0;

            refs.current.push(node);
            refs.current[i].computeBVH();
            (refs.current[i] as any).frustumCulled = false;
            const internalAdd = (
              newPositions: XYZ[],
              newRotations?: XYZ[],
              scales?: number[]
            ) => {
              const instancedMesh2Ref = refs.current[i];

              if (!instancedMesh2Ref) return [];

              let posIndex = 0;
              let indices: number[] = [];
              instancedMesh2Ref.addInstances(
                newPositions.length,
                (obj, index) => {
                  const pos = newPositions[posIndex];
                  obj.matrix.copy(temp.matrix);
                  obj.scale.set(1, 1, 1);
                  obj.position.set(pos.x, pos.y, pos.z);

                  const rotation = newRotations
                    ? newRotations[posIndex] || emptyRotation
                    : emptyRotation;

                  temp.rotation.set(-Math.PI / 2, 0, rotation.y);
                  obj.quaternion.copy(temp.quaternion);

                  const scale = scales ? scales[posIndex] : 4;
                  obj.scale.multiplyScalar(100 * scale);

                  posIndex++;
                  indices.push(index);
                }
              );
              return indices;
            };

            const internalRemove = (indecesToRemove: number[]) => {
              const instancedMesh2Ref = node;
              if (!instancedMesh2Ref) return;

              instancedMesh2Ref.removeInstances(...indecesToRemove);
            };

            addPositionFunctions.current.push(internalAdd);
            removePositionFunctions.current.push(internalRemove);
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
