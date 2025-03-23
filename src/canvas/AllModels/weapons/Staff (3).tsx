import { useRef, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";
import { Color, Mesh, MeshStandardMaterial } from "three";

type GLTFResult = GLTF & {
  nodes: {
    ["Staff_03_Cube-Mesh"]: Mesh;
    ["Staff_03_Cube-Mesh_1"]: Mesh;
    ["Staff_03_Cube-Mesh_2"]: Mesh;
  };
  materials: {
    Iron_sword: MeshStandardMaterial;
    Golden: MeshStandardMaterial;
    Ball_staff_03: MeshStandardMaterial;
  };
};

export function Staff3(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Staff (3)-transformed.glb"
  ) as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes["Staff_03_Cube-Mesh"].geometry}
        material={materials.Iron_sword}
      />
      <mesh
        geometry={nodes["Staff_03_Cube-Mesh_1"].geometry}
        material={materials.Golden}
      />
      <mesh
        geometry={nodes["Staff_03_Cube-Mesh_2"].geometry}
        material={materials.Ball_staff_03}
      />
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/weapons/Staff (3)-transformed.glb");
