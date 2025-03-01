import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { InstancedMesh, Material, Mesh, Object3D, Vector3 } from "three";
import { GLTF } from "three-stdlib";

const temp = new Object3D();

export type MeshMaterialCombos = [meshName: string, materialName: string][];

type Props = {
  meshMaterialCombos: MeshMaterialCombos;
  modelPath: string;
  positions: Vector3[];
  scales?: number[];
  rotations?: number[];
};

type GenericGltfResult<
  MeshNames extends string = string,
  MaterialNames extends string = string
> = GLTF & {
  nodes: Record<MeshNames, Mesh>;
  materials: Record<MaterialNames, Material>;
};

export const GenericInstancedSystem = ({
  meshMaterialCombos: materialMeshCombos,
  modelPath,
  positions,
}: Props) => {
  const { nodes, materials } = useGLTF(
    modelPath
  ) as unknown as GenericGltfResult;

  const instancedMeshesRefs = useRef<(InstancedMesh | null)[]>([]);

  useEffect(() => {
    instancedMeshesRefs.current = instancedMeshesRefs.current.slice(
      0,
      positions.length
    );
  }, [positions.length]);

  const { camera } = useThree();

  useEffect(() => {
    if (!instancedMeshesRefs.current) return;

    positions.forEach((pos, i) => {
      temp.position.set(pos.x, pos.y, pos.z);

      temp.scale.setScalar(100);
      temp.rotation.set(-Math.PI / 2, 0, 0);

      temp.updateMatrix();

      instancedMeshesRefs.current.forEach((instancedMeshRef) => {
        if (!instancedMeshRef) return;
        instancedMeshRef.setMatrixAt(i, temp.matrix);
      });

      camera.position.set(0, 2, 5);
      camera.lookAt(0, 0, 0);
    });
  }, [positions, camera]);

  return (
    <group>
      {materialMeshCombos.map(([meshName, materialName], i) => {
        return (
          <instancedMesh
            key={i}
            ref={(el) => {
              instancedMeshesRefs.current[i] = el;
              return;
            }}
            args={[
              nodes[meshName].geometry,
              materials[materialName],
              positions.length,
            ]}
          />
        );
      })}
    </group>
  );
};
