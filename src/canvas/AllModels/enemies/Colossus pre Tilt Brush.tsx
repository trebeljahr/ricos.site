import { useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial } from "three";
import { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    group168052419: Mesh;
  };
  materials: {
    mat23: MeshStandardMaterial;
  };
};

export function Collosus(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/enemies/Colossus pre Tilt Brush-transformed.glb"
  ) as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.group168052419.geometry}
        material={materials.mat23}
      />
    </group>
  );
}

useGLTF.preload(
  "/3d-assets/glb/enemies/Colossus pre Tilt Brush-transformed.glb"
);
