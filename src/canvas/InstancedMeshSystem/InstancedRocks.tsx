import { useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial } from "three";
import { GLTF } from "three-stdlib";
import {
  InstancedTileSpawner,
  MultiInstancedTileSpawner,
} from "./InstancedTileSpawner";
import { MeshMaterialCombos } from "./GenericInstancingSystem";

type GLTFResult = GLTF & {
  nodes: {
    Rock3: Mesh;
  };
  materials: {
    Rock: MeshStandardMaterial;
  };
};

export const InstancedRocks = () => {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/simple_nature_pack/Rock3.glb"
  ) as unknown as GLTFResult;

  return (
    <InstancedTileSpawner
      material={materials.Rock}
      geometry={nodes.Rock3.geometry}
    />
  );
};

export const InstancedTrees = () => {
  const meshMaterialCombos: MeshMaterialCombos = [
    ["BirchTree_1_1", "White"],
    ["BirchTree_1_2", "Black"],
    ["BirchTree_1_3", "DarkGreen"],
    ["BirchTree_1_4", "Green"],
  ];

  return (
    <MultiInstancedTileSpawner
      meshMaterialCombos={meshMaterialCombos}
      modelPath={"/3d-assets/glb/nature_pack/BirchTree_1.glb"}
    />
  );
};
