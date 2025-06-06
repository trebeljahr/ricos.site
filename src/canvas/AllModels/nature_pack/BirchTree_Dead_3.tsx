/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
*/

import {
  GenericInstancedSystem,
  MeshMaterialCombos,
} from "src/canvas/InstancedMeshSystem/GenericInstancingSystem";
import { useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial, Vector3 } from "three";
import { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    BirchTree_Dead_3_1: Mesh;
    BirchTree_Dead_3_2: Mesh;
  };
  materials: {
    White: MeshStandardMaterial;
    Black: MeshStandardMaterial;
  };
};

export function InstancedBirchTreeDead3({
  positions,
}: {
  positions: Vector3[];
}) {
  const meshMaterialCombos: MeshMaterialCombos = [
    ["BirchTree_Dead_3_1", "White"],
    ["BirchTree_Dead_3_2", "Black"],
  ];

  return (
    <GenericInstancedSystem
      positions={positions}
      meshMaterialCombos={meshMaterialCombos}
      modelPath={"/3d-assets/glb/nature_pack/BirchTree_Dead_3.glb"}
    />
  );
}

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/nature_pack/BirchTree_Dead_3.glb"
  ) as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <mesh
          geometry={nodes.BirchTree_Dead_3_1.geometry}
          material={materials.White}
        />
        <mesh
          geometry={nodes.BirchTree_Dead_3_2.geometry}
          material={materials.Black}
        />
      </group>
    </group>
  );
}
