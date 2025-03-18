import { useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial } from "three";
import { GLTF } from "three-stdlib";
import {
  InstancedMeshSpawnerMultiMaterial,
  InstancedTileSpawner,
} from "./InstancedTileSpawner";

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

export const InstancedTreesWithMultiMaterial = () => {
  return (
    <InstancedMeshSpawnerMultiMaterial modelPath="/3d-assets/glb/nature_pack/BirchTree_1.glb" />
  );
};
