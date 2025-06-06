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
    CommonTree_Dead_5: Mesh;
  };
  materials: {
    Wood: MeshStandardMaterial;
  };
};

export function InstancedCommonTreeDead5({
  positions,
}: {
  positions: Vector3[];
}) {
  const meshMaterialCombos: MeshMaterialCombos = [
    ["CommonTree_Dead_5", "Wood"],
  ];

  return (
    <GenericInstancedSystem
      positions={positions}
      meshMaterialCombos={meshMaterialCombos}
      modelPath={"/3d-assets/glb/nature_pack/CommonTree_Dead_5.glb"}
    />
  );
}

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/nature_pack/CommonTree_Dead_5.glb"
  ) as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.CommonTree_Dead_5.geometry}
        material={materials.Wood}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={100}
      />
    </group>
  );
}
