import { usePrevious } from "@hooks/usePrevious";
import { useGLTF } from "@react-three/drei";
import { extend, Object3DNode, useThree } from "@react-three/fiber";
import { InstancedMesh2 } from "@three.ez/instanced-mesh";
import { nanoid } from "nanoid";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  Material,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from "three";
import {
  GenericGltfResult,
  GenericInstancingProps,
  SingleInstanceProps,
} from "./GenericInstancingSystem";
import { XYZ } from "src/@types";

declare module "@react-three/fiber" {
  interface ThreeElements {
    instancedMesh2: Object3DNode<
      InstancedMesh2 & Object3D,
      typeof InstancedMesh2
    >;
  }
}

extend({ InstancedMesh2 });

export const temp = new Object3D();
const emptyRotation = new Vector3(0, 0, 0);

export type SingleHookProps = {
  material: Material | Material[];
  geometry: BufferGeometry;
  defaultScale?: number;
  emissiveColor?: string;
  emissiveIntensity?: number;
};

export const useInstancedMesh2 = ({
  material,
  geometry,
  defaultScale = 1,
  emissiveColor,
  emissiveIntensity,
}: SingleHookProps) => {
  const ref = useRef<InstancedMesh2 & Object3D>(null!);
  const { gl } = useThree();

  const addPositions = (
    newPositions: XYZ[],
    rotations?: XYZ[],
    scales?: number[]
  ) => {
    const instancedMesh2 = ref.current;
    let counter = 0;
    let indices: number[] = [];
    instancedMesh2.addInstances(newPositions.length, (obj, index) => {
      const pos = newPositions[counter];
      obj.matrix.copy(temp.matrix);
      obj.scale.set(1, 1, 1);
      obj.position.set(pos.x, pos.y, pos.z);

      const rotation = rotations
        ? rotations[counter] || emptyRotation
        : emptyRotation;

      temp.rotation.set(-Math.PI / 2, 0, rotation.y);
      obj.quaternion.copy(temp.quaternion);

      const scale = scales ? scales[counter] : defaultScale;
      obj.scale.multiplyScalar(100 * scale);

      counter++;
      indices.push(index);
    });

    return indices;
  };

  const removePositions = (indicesToRemove: number[]) => {
    const instancedMesh2 = ref.current;
    if (!instancedMesh2) return;

    instancedMesh2.removeInstances(...indicesToRemove);
  };

  const InstancedMesh = () => {
    useEffect(() => {
      if (material instanceof MeshStandardMaterial && emissiveColor) {
        material.emissive.set(emissiveColor);
        material.emissiveIntensity = emissiveIntensity || 1;
        material.toneMapped = false;
      }

      const instancedMesh2 = ref.current;
      if (!instancedMesh2) return;

      instancedMesh2.computeBVH();
      instancedMesh2.frustumCulled = false;
    }, []);

    return (
      <instancedMesh2 args={[geometry, material, { renderer: gl }]} ref={ref} />
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

    addPositions(newPositions);
  }, [positions, prevPositions, addPositions, removePositions]);

  return <InstancedMesh />;
};
