import React from "react";
import { GroupProps, useGraph } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { GLTF, SkeletonUtils } from "three-stdlib";
import { Mesh, MeshStandardMaterial, SkinnedMesh } from "three";

type GLTFResult = GLTF & {
  nodes: {
    ArmModel_1: SkinnedMesh;
    UpperArmL: Mesh;
    UpperArmR001: Mesh;
    ArmModel_2: SkinnedMesh;
    ArmModel_3: SkinnedMesh;
  };
  materials: {
    Shirt: MeshStandardMaterial;
    Skin: MeshStandardMaterial;
    Glove: MeshStandardMaterial;
  };
};

export function RiggedArms(props: GroupProps) {
  const { scene } = useGLTF("/3d-assets/glb/Rigged Fps Arms-transformed.glb");
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as unknown as GLTFResult;
  return (
    <group {...props} dispose={null}>
      <primitive object={nodes.UpperArmL} />
      <primitive object={nodes.UpperArmR001} />
      <group
        position={[2.987, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={56}
      >
        <skinnedMesh
          geometry={nodes.ArmModel_1.geometry}
          material={materials.Shirt}
          skeleton={nodes.ArmModel_1.skeleton}
        />
        <skinnedMesh
          geometry={nodes.ArmModel_2.geometry}
          material={materials.Skin}
          skeleton={nodes.ArmModel_2.skeleton}
        />
        <skinnedMesh
          geometry={nodes.ArmModel_3.geometry}
          material={materials.Glove}
          skeleton={nodes.ArmModel_3.skeleton}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/Rigged Fps Arms-transformed.glb");
