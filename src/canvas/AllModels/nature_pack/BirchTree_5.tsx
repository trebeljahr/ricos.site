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
    BirchTree_5_1: Mesh;
    BirchTree_5_2: Mesh;
    BirchTree_5_3: Mesh;
    BirchTree_5_4: Mesh;
  };
  materials: {
    White: MeshStandardMaterial;
    Black: MeshStandardMaterial;
    Green: MeshStandardMaterial;
    DarkGreen: MeshStandardMaterial;
  };
};

export function InstancedBirchTree5({ positions }: { positions: Vector3[] }) {
  const meshMaterialCombos: MeshMaterialCombos = [
    ["BirchTree_5_1", "White"],
    ["BirchTree_5_2", "Black"],
    ["BirchTree_5_3", "Green"],
    ["BirchTree_5_4", "DarkGreen"],
  ];

  return (
    <GenericInstancedSystem
      positions={positions}
      meshMaterialCombos={meshMaterialCombos}
      modelPath={"/3d-assets/glb/nature_pack/BirchTree_5.glb"}
    />
  );
}

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/nature_pack/BirchTree_5.glb"
  ) as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <mesh
          geometry={nodes.BirchTree_5_1.geometry}
          material={materials.White}
        />
        <mesh
          geometry={nodes.BirchTree_5_2.geometry}
          material={materials.Black}
        />
        <mesh
          geometry={nodes.BirchTree_5_3.geometry}
          material={materials.Green}
        />
        <mesh
          geometry={nodes.BirchTree_5_4.geometry}
          material={materials.DarkGreen}
        />
      </group>
    </group>
  );
}
