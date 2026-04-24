import { useGLTF } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Skeleton_Blade: Mesh;
  };
  materials: {
    skeleton: MeshStandardMaterial;
  };
};

export function SkeletonBlade(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Blade-transformed.glb",
  ) as unknown as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.Skeleton_Blade.geometry} material={materials.skeleton} scale={100} />
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/weapons/Blade-transformed.glb");
