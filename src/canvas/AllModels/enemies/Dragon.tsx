import { useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial } from "three";
import { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Geo_Dragon: Mesh;
  };
  materials: {
    lambert2SG: MeshStandardMaterial;
  };
};

export function Dragon(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/enemies/Dragon-transformed.glb"
  ) as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.Geo_Dragon.geometry}
        material={materials.lambert2SG}
      />
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Dragon-transformed.glb");
