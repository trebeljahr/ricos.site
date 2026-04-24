import { useGLTF } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Cylinder: Mesh;
  };
  materials: {
    ["Wood.001"]: MeshStandardMaterial;
  };
};

export function Staff1(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Staff (1)-transformed.glb",
  ) as unknown as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.Cylinder.geometry} material={materials["Wood.001"]} scale={100} />
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/weapons/Staff (1)-transformed.glb");
