/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
*/

import {
  GenericInstancedSystem,
  MeshMaterialCombos,
} from "src/canvas/InstancedMeshSystem/GenericInstancingSystem";
import { useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";
import { Mesh, MeshStandardMaterial, Vector3 } from "three";

type GLTFResult = GLTF & {
  nodes: {
    PineTree_Autumn_5_1: Mesh;
    PineTree_Autumn_5_2: Mesh;
    PineTree_Autumn_5_3: Mesh;
  };
  materials: {
    Wood: MeshStandardMaterial;
    LightOrange: MeshStandardMaterial;
    Orange: MeshStandardMaterial;
  };
};

export function InstancedPineTreeAutumn5({
  positions,
}: {
  positions: Vector3[];
}) {
  const meshMaterialCombos: MeshMaterialCombos = [
    ["PineTree_Autumn_5_1", "Wood"],
    ["PineTree_Autumn_5_2", "LightOrange"],
    ["PineTree_Autumn_5_3", "Orange"],
  ];

  return (
    <GenericInstancedSystem
      positions={positions}
      meshMaterialCombos={meshMaterialCombos}
      modelPath={"/3d-assets/glb/nature_pack/PineTree_Autumn_5.glb"}
    />
  );
}

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/nature_pack/PineTree_Autumn_5.glb"
  ) as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <mesh
          geometry={nodes.PineTree_Autumn_5_1.geometry}
          material={materials.Wood}
        />
        <mesh
          geometry={nodes.PineTree_Autumn_5_2.geometry}
          material={materials.LightOrange}
        />
        <mesh
          geometry={nodes.PineTree_Autumn_5_3.geometry}
          material={materials.Orange}
        />
      </group>
    </group>
  );
}
