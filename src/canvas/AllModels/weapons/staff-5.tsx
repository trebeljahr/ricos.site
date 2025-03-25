import { useRef, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";
import { Color, Mesh, MeshStandardMaterial } from "three";

type GLTFResult = GLTF & {
  nodes: {
    ["Staff_05_Circle016-Mesh"]: Mesh;
    ["Staff_05_Circle016-Mesh_1"]: Mesh;
    ["Staff_05_Circle016-Mesh_2"]: Mesh;
  };
  materials: {
    Brown: MeshStandardMaterial;
    Moon: MeshStandardMaterial;
    Spikes: MeshStandardMaterial;
  };
};

export function Staff5(props: JSX.IntrinsicElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/weapons/Staff (5)-transformed.glb"
  ) as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={nodes["Staff_05_Circle016-Mesh"].geometry}
        material={materials.Brown}
      />
      <mesh
        geometry={nodes["Staff_05_Circle016-Mesh_1"].geometry}
        material={materials.Moon}
      />
      <mesh
        geometry={nodes["Staff_05_Circle016-Mesh_2"].geometry}
        material={materials.Spikes}
      />
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/weapons/Staff (5)-transformed.glb");
