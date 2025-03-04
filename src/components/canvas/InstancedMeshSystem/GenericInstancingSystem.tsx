import { useGLTF } from "@react-three/drei";
import { nanoid } from "nanoid";
import { useEffect, useMemo, useRef } from "react";
import { InstancedMesh, Material, Mesh, Object3D, Vector3 } from "three";
import { GLTF } from "three-stdlib";
import { Single } from "./useInstancedMesh2";

const temp = new Object3D();

export type MeshMaterialCombos = [meshName: string, materialName: string][];

export type GenericInstancingProps = {
  meshMaterialCombos: MeshMaterialCombos;
  modelPath: string;
  positions: Vector3[];
  scales?: number[];
  rotations?: number[];
};

export type GenericGltfResult<
  MeshNames extends string = string,
  MaterialNames extends string = string
> = GLTF & {
  nodes: Record<MeshNames, Mesh>;
  materials: Record<MaterialNames, Material>;
};

export type SingleInstanceProps = {
  positions: Vector3[];
  geo: Mesh["geometry"];
  material: Material;
};

const SingleInstancedMesh = ({
  positions,
  geo,
  material,
}: SingleInstanceProps) => {
  const singleInstanceRef = useRef<InstancedMesh>(null!);

  useEffect(() => {
    if (!singleInstanceRef.current) return;

    positions.forEach((pos, i) => {
      temp.position.set(pos.x, pos.y, pos.z);

      temp.scale.setScalar(200);
      temp.rotation.set(-Math.PI / 2, 0, 0);

      temp.updateMatrix();

      singleInstanceRef.current.setMatrixAt(i, temp.matrix);
    });

    singleInstanceRef.current.instanceMatrix.needsUpdate = true;
  }, [positions]);

  return (
    <instancedMesh
      ref={singleInstanceRef}
      args={[geo, material, positions.length]}
    />
  );
};

export const GenericInstancedSystem = ({
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
    <group>
      {meshMaterialCombosWithIds.map(([meshName, materialName, id]) => {
        // return (
        //   <SingleInstancedMesh
        //     key={id}
        //     positions={positions}
        //     geo={nodes[meshName].geometry}
        //     material={materials[materialName]}
        //   />
        // );
        // return (
        // <InstancedMesh2Component
        //   key={id}
        //   geometry={nodes[meshName].geometry}
        //   material={materials[materialName]}
        //   positions={positions}
        // />
        // );
        return (
          <Single
            key={id}
            positions={positions}
            geo={nodes[meshName].geometry}
            material={materials[materialName]}
          />
        );
      })}
    </group>
  );
};
