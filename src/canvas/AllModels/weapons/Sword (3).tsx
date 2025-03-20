import { useRef, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";
import { Color, Mesh, MeshStandardMaterial } from "three";

type GLTFResult = GLTF & {
  nodes: {
    Sword1001: Mesh;
  };
  materials: {
    Material: MeshStandardMaterial;
  };
};

export function Sword3(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Sword (3)-transformed.glb"
  ) as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes.Sword1001.geometry}
        material={materials.Material}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={100}
      />
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/weapons/Sword (3)-transformed.glb");
