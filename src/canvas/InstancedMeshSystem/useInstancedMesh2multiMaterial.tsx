import { useGLTF } from "@react-three/drei";
import { extend, Object3DNode, useThree } from "@react-three/fiber";
import { InstancedMesh2 } from "@three.ez/instanced-mesh";
import { useEffect, useMemo, useRef } from "react";
import { XYZ } from "src/@types";
import { BoxGeometry, Mesh, Object3D, Vector3 } from "three";
import { mergeBufferGeometries } from "three-stdlib";
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
  defaultScale = 1,
}: {
  modelPath: string;
  defaultScale?: number;
}) => {
  const result = useGLTF(modelPath) as any as GenericGltfResult;
  const { nodes, materials } = result;

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

      const scale = scales ? scales[posIndex] : defaultScale;
      obj.scale.multiplyScalar(100 * scale);

      posIndex++;
      indices.push(index);
    });

    return indices;
  };

  const removePositions = (indicesToRemove: number[]) => {
    ref.current.removeInstances(...indicesToRemove);
  };

  const ref = useRef<InstancedMesh2 & Object3D>(null!);

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

  const InstancedMesh = () => {
    const { gl } = useThree();

    useEffect(() => {
      if (!ref.current) return;

      async function optimizeMesh() {
        ref.current.addShadowLOD(ref.current.geometry);
        ref.current.addShadowLOD(new BoxGeometry(10, 20, 10), 5);

        ref.current.computeBVH();
      }

      optimizeMesh();
    }, []);

    return (
      <instancedMesh2
        ref={ref}
        args={[mergedGeos, mergedMaterials, { renderer: gl }]}
        frustumCulled={false}
        castShadow={true}
        receiveShadow={false}
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
