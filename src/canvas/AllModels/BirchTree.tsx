import { useLayoutEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { DoubleSide, Mesh, MeshStandardMaterial } from "three";
import { GroupProps, useLoader } from "@react-three/fiber";
import { TextureLoader } from "three/src/loaders/TextureLoader";
import { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Cube009: Mesh;
    Cube009_1: Mesh;
  };
  materials: {
    BirchTree_Bark: MeshStandardMaterial;
    BirchTree_Leaves: MeshStandardMaterial;
  };
};

export function BirchTree(props: GroupProps) {
  const { nodes, materials } = useGLTF(
    "/3d-assets/glb/BirchTree_5.gltf"
  ) as unknown as GLTFResult;
  const [colorMap, normalMap] = useLoader(TextureLoader, [
    "/3d-assets/textures/BirchTree_Bark.png",
    "/3d-assets/textures/BirchTree_Bark_Normal.png",
  ]);

  const [leavesColorMap] = useLoader(TextureLoader, [
    "/3d-assets/textures/BirchTree_Leaves.png",
  ]);

  useLayoutEffect(() => {
    Object.assign(materials.BirchTree_Bark, {
      normalMap: normalMap,
      map: colorMap,
    });
  }, [materials.BirchTree_Bark, colorMap, normalMap]);

  useLayoutEffect(() => {
    Object.assign(materials.BirchTree_Leaves, {
      map: leavesColorMap,
      // alphaTest: 0.5,
      transparent: true,
      side: DoubleSide,
    });
  }, [materials.BirchTree_Leaves, leavesColorMap]);

  return (
    <group {...props} dispose={null}>
      <mesh
        geometry={(nodes.Cube009 as Mesh).geometry}
        material={materials.BirchTree_Bark}
      />
      <mesh
        geometry={(nodes.Cube009_1 as Mesh).geometry}
        material={materials.BirchTree_Leaves}
      />
    </group>
  );
}

export function BirchTreeWithColors() {
  const { nodes } = useGLTF(
    "/3d-assets/glb/BirchTree_5.gltf"
  ) as unknown as GLTFResult;
  return (
    <group>
      <mesh geometry={(nodes.Cube009 as Mesh).geometry}>
        <meshStandardMaterial color="#ff0000" />
      </mesh>
      <mesh geometry={(nodes.Cube009_1 as Mesh).geometry}>
        <meshStandardMaterial color="#00BB00" />
      </mesh>
    </group>
  );
}
