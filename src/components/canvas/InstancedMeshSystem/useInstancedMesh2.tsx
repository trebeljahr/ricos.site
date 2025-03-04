import { useKeyboardInput } from "@hooks/useKeyboardInput";
import { usePrevious } from "@hooks/usePrevious";
import { useGLTF } from "@react-three/drei";
import { extend, Object3DNode, useThree } from "@react-three/fiber";
import { InstancedMesh2 } from "@three.ez/instanced-mesh";
import { nanoid } from "nanoid";
import { useEffect, useMemo, useRef } from "react";
import { BufferGeometry, Material, Object3D, Vector3 } from "three";
import { pickRandomFromArray } from "../../../lib/utils/randomFromArray";
import { tileSize } from "../ChunkGenerationSystem/config";
import {
  GenericGltfResult,
  GenericInstancingProps,
  MeshMaterialCombos,
  SingleInstanceProps,
} from "./GenericInstancingSystem";
import { useMultiInstancedMesh2 } from "./useMultiInstancedMesh2";

declare module "@react-three/fiber" {
  interface ThreeElements {
    instancedMesh2: Object3DNode<InstancedMesh2, typeof InstancedMesh2>;
  }
}

extend({ InstancedMesh2 });

export const temp = new Object3D();

export type SingleHookProps = {
  material: Material;
  geometry: BufferGeometry;
};

export const useInstancedMesh2 = ({ material, geometry }: SingleHookProps) => {
  const ref = useRef<InstancedMesh2 & Object3D>(null!);
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
      instancedMesh2.frustumCulled = false;
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
