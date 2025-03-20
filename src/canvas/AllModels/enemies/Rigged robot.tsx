import { useGLTF } from "@react-three/drei";
import { useGraph } from "@react-three/fiber";
import { useMemo } from "react";
import { Bone, MeshStandardMaterial, SkinnedMesh } from "three";
import { GLTF, SkeletonUtils } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    v3001_1: SkinnedMesh;
    v3001_2: SkinnedMesh;
    v3001_3: SkinnedMesh;
    v3001_4: SkinnedMesh;
    v3001_5: SkinnedMesh;
    v3001_6: SkinnedMesh;
    spine002: Bone;
  };
  materials: {
    PaletteMaterial001: MeshStandardMaterial;
    PaletteMaterial002: MeshStandardMaterial;
    PaletteMaterial003: MeshStandardMaterial;
  };
};

export function Robot(props: JSX.IntrinsicElements["group"]) {
  const { scene } = useGLTF(
    "/3d-assets/glb/enemies/Rigged robot-transformed.glb"
  );
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <primitive object={nodes.spine002} />
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <skinnedMesh
          geometry={nodes.v3001_1.geometry}
          material={materials.PaletteMaterial001}
          skeleton={nodes.v3001_1.skeleton}
        />
        <skinnedMesh
          geometry={nodes.v3001_2.geometry}
          material={materials.PaletteMaterial001}
          skeleton={nodes.v3001_2.skeleton}
        />
        <skinnedMesh
          geometry={nodes.v3001_3.geometry}
          material={materials.PaletteMaterial001}
          skeleton={nodes.v3001_3.skeleton}
        />
        <skinnedMesh
          geometry={nodes.v3001_4.geometry}
          material={materials.PaletteMaterial002}
          skeleton={nodes.v3001_4.skeleton}
        />
        <skinnedMesh
          geometry={nodes.v3001_5.geometry}
          material={materials.PaletteMaterial002}
          skeleton={nodes.v3001_5.skeleton}
        />
        <skinnedMesh
          geometry={nodes.v3001_6.geometry}
          material={materials.PaletteMaterial003}
          skeleton={nodes.v3001_6.skeleton}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Rigged robot-transformed.glb");
