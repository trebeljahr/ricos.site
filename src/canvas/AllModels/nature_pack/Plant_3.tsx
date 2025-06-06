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
    Plant_3: Mesh;
  };
  materials: {
    DarkGreen: MeshStandardMaterial;
  };
};

export function InstancedPlant3({ positions }: { positions: Vector3[] }) {
  const meshMaterialCombos: MeshMaterialCombos = [["Plant_3", "DarkGreen"]];

  return (
    <GenericInstancedSystem
      positions={positions}
      meshMaterialCombos={meshMaterialCombos}
      modelPath={"/3d-assets/glb/nature_pack/Plant_3.glb"}
    />
  );
}

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/nature_pack/Plant_3.glb"
  ) as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.Plant_3.geometry}
        material={materials.DarkGreen}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={100}
      />
    </group>
  );
}
