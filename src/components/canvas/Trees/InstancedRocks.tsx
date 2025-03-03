import { useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial } from "three";
import { GLTF } from "three-stdlib";
import { InstancedTileSpawner } from "./useInstancedMesh2";

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
