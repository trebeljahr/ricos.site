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
                const pos = newPositions[posIndex];
                obj.matrix.copy(temp.matrix);
                obj.scale.set(1, 1, 1);
                obj.position.set(pos.x, pos.y, pos.z);

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
