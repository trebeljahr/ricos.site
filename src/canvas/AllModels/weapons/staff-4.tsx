import { useGLTF } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import type { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    ["Staff_04_Circle011-Mesh"]: Mesh;
    ["Staff_04_Circle011-Mesh_1"]: Mesh;
    ["Staff_04_Circle011-Mesh_2"]: Mesh;
  };
  materials: {
    Dark_blue: MeshStandardMaterial;
    Iron_staff_04: MeshStandardMaterial;
    Cyrstal_staff_04: MeshStandardMaterial;
  };
};

export function Staff4(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Staff-4-transformed.glb",
  ) as unknown as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes["Staff_04_Circle011-Mesh"].geometry} material={materials.Dark_blue} />
      <mesh
        geometry={nodes["Staff_04_Circle011-Mesh_1"].geometry}
        material={materials.Iron_staff_04}
      />
      <mesh
        geometry={nodes["Staff_04_Circle011-Mesh_2"].geometry}
        material={materials.Cyrstal_staff_04}
      />
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/weapons/Staff-transformed.glb");
