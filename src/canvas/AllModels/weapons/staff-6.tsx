import { useRef, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";
import { Color, Mesh, MeshStandardMaterial } from "three";

type GLTFResult = GLTF & {
  nodes: {
    Skeleton_Staff: Mesh;
  };
  materials: {
    skeleton: MeshStandardMaterial;
  };
};

export function SkeletonStaff(props: JSX.IntrinsicElements["group"]) {
  const result = useGLTF(
    "/3d-assets/glb/weapons/Skeleton Staff-transformed.glb"
  ) as GLTFResult;

  const { nodes, materials } = result;

  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.Skeleton_Staff.geometry}
        material={materials.skeleton}
        scale={100}
      />
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/weapons/Skeleton Staff-transformed.glb");
