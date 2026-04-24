import { useGLTF } from "@react-three/drei";
import type { AnimationClip, Mesh, MeshStandardMaterial } from "three";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    cat_body: Mesh;
    cat_ear: Mesh;
    cat_white: Mesh;
    cat_spot: Mesh;
  };
  materials: {
    body: MeshStandardMaterial;
    ear: MeshStandardMaterial;
    white: MeshStandardMaterial;
    spot: MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

interface GLTFAction extends AnimationClip {
  name: string;
}

export function Cat(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/cat-transformed.glb",
  ) as unknown as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.cat_body.geometry} material={materials.body} />
      <mesh geometry={nodes.cat_ear.geometry} material={materials.ear} />
      <mesh geometry={nodes.cat_white.geometry} material={materials.white} />
      <mesh geometry={nodes.cat_spot.geometry} material={materials.spot} />
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/cat-transformed.glb");
