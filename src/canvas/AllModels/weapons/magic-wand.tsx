import { useGLTF } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    mesh2096346305: Mesh;
    mesh2096346305_1: Mesh;
    group1762687703: Mesh;
  };
  materials: {
    mat20: MeshStandardMaterial;
    mat17: MeshStandardMaterial;
    mat2: MeshStandardMaterial;
  };
};

export function MagicWand(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Magick wand-transformed.glb",
  ) as unknown as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.group1762687703.geometry} material={materials.mat2} />
      <mesh geometry={nodes.mesh2096346305.geometry} material={materials.mat20} />
      <mesh geometry={nodes.mesh2096346305_1.geometry} material={materials.mat17} />
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/weapons/Magick wand-transformed.glb");
