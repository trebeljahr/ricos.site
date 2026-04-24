import { useGLTF } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Stairs_SideCoverWall: Mesh;
  };
  materials: {
    Grey_Floor: MeshStandardMaterial;
  };
};

export default function Model(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/modular_dungeon_1/Stairs_SideCoverWall.glb",
  ) as unknown as unknown as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.Stairs_SideCoverWall.geometry}
        material={materials.Grey_Floor}
        position={[0, 0, -2]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={100}
      />
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/modular_dungeon_1/Stairs_SideCoverWall.glb");
