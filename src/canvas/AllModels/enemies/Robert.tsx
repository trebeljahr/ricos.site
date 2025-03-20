import { useGLTF } from "@react-three/drei";
import { useGraph } from "@react-three/fiber";
import { useMemo } from "react";
import { Bone, MeshStandardMaterial, SkinnedMesh } from "three";
import { GLTF, SkeletonUtils } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Cube_1: SkinnedMesh;
    Cube_2: SkinnedMesh;
    Cube_3: SkinnedMesh;
    Body: Bone;
    TAIL_1: Bone;
  };
  materials: {
    ["Material.002"]: MeshStandardMaterial;
    ["Material.001"]: MeshStandardMaterial;
    ["Material.003"]: MeshStandardMaterial;
  };
};

export function RobertDinosaur(props: JSX.IntrinsicElements["group"]) {
  const { scene } = useGLTF("/3d-assets/glb/enemies/Robert-transformed.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <primitive object={nodes.Body} />
      <primitive object={nodes.TAIL_1} />
      <group rotation={[-Math.PI / 2, 0, 0]} scale={100}>
        <skinnedMesh
          geometry={nodes.Cube_1.geometry}
          material={materials["Material.002"]}
          skeleton={nodes.Cube_1.skeleton}
        />
        <skinnedMesh
          geometry={nodes.Cube_2.geometry}
          material={materials["Material.001"]}
          skeleton={nodes.Cube_2.skeleton}
        />
        <skinnedMesh
          geometry={nodes.Cube_3.geometry}
          material={materials["Material.003"]}
          skeleton={nodes.Cube_3.skeleton}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Robert-transformed.glb");
