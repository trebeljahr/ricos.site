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
    Cactus_1_1: Mesh;
    Cactus_1_2: Mesh;
  };
  materials: {
    Green: MeshStandardMaterial;
    LightOrange: MeshStandardMaterial;
  };
};

export function InstancedCactus1({ positions }: { positions: Vector3[] }) {
  const meshMaterialCombos: MeshMaterialCombos = [
    ["Cactus_1_1", "Green"],
    ["Cactus_1_2", "LightOrange"],
  ];

  return (
    <GenericInstancedSystem
      positions={positions}
      meshMaterialCombos={meshMaterialCombos}
      modelPath={"/3d-assets/glb/nature_pack/Cactus_1.glb"}
    />
  );
}

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/nature_pack/Cactus_1.glb"
  ) as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <mesh geometry={nodes.Cactus_1_1.geometry} material={materials.Green} />
        <mesh
          geometry={nodes.Cactus_1_2.geometry}
          material={materials.LightOrange}
        />
      </group>
    </group>
  );
}
