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
    BirchTree_Snow_2_1: Mesh;
    BirchTree_Snow_2_2: Mesh;
    BirchTree_Snow_2_3: Mesh;
    BirchTree_Snow_2_4: Mesh;
    BirchTree_Snow_2_5: Mesh;
  };
  materials: {
    White: MeshStandardMaterial;
    Black: MeshStandardMaterial;
    DarkGreen: MeshStandardMaterial;
    Snow: MeshStandardMaterial;
    Green: MeshStandardMaterial;
  };
};

export function InstancedBirchTreeSnow2({
  positions,
}: {
  positions: Vector3[];
}) {
  const meshMaterialCombos: MeshMaterialCombos = [
    ["BirchTree_Snow_2_1", "White"],
    ["BirchTree_Snow_2_2", "Black"],
    ["BirchTree_Snow_2_3", "DarkGreen"],
    ["BirchTree_Snow_2_4", "Snow"],
    ["BirchTree_Snow_2_5", "Green"],
  ];

  return (
    <GenericInstancedSystem
      positions={positions}
      meshMaterialCombos={meshMaterialCombos}
      modelPath={"/3d-assets/glb/nature_pack/BirchTree_Snow_2.glb"}
    />
  );
}

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/nature_pack/BirchTree_Snow_2.glb"
  ) as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <mesh
          geometry={nodes.BirchTree_Snow_2_1.geometry}
          material={materials.White}
        />
        <mesh
          geometry={nodes.BirchTree_Snow_2_2.geometry}
          material={materials.Black}
        />
        <mesh
          geometry={nodes.BirchTree_Snow_2_3.geometry}
          material={materials.DarkGreen}
        />
        <mesh
          geometry={nodes.BirchTree_Snow_2_4.geometry}
          material={materials.Snow}
        />
        <mesh
          geometry={nodes.BirchTree_Snow_2_5.geometry}
          material={materials.Green}
        />
      </group>
    </group>
  );
}
