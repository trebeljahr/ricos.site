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
    CommonTree_Dead_Snow_5_1: Mesh;
    CommonTree_Dead_Snow_5_2: Mesh;
  };
  materials: {
    ["Wood.002"]: MeshStandardMaterial;
    ["Snow.002"]: MeshStandardMaterial;
  };
};

export function InstancedCommonTreeDeadSnow5({
  positions,
}: {
  positions: Vector3[];
}) {
  const meshMaterialCombos: MeshMaterialCombos = [
    ["CommonTree_Dead_Snow_5_1", "Wood.002"],
    ["CommonTree_Dead_Snow_5_2", "Snow.002"],
  ];

  return (
    <GenericInstancedSystem
      positions={positions}
      meshMaterialCombos={meshMaterialCombos}
      modelPath={"/3d-assets/glb/nature_pack/CommonTree_Dead_Snow_5.glb"}
    />
  );
}

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/nature_pack/CommonTree_Dead_Snow_5.glb"
  ) as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <mesh
          geometry={nodes.CommonTree_Dead_Snow_5_1.geometry}
          material={materials["Wood.002"]}
        />
        <mesh
          geometry={nodes.CommonTree_Dead_Snow_5_2.geometry}
          material={materials["Snow.002"]}
        />
      </group>
    </group>
  );
}
