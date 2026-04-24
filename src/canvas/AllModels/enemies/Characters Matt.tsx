import { useAnimations, useGLTF } from "@react-three/drei";
import { useGraph } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { AnimationClip, Bone, Group, Mesh, MeshStandardMaterial, SkinnedMesh } from "three";
import { type GLTF, SkeletonUtils } from "three-stdlib";

type ActionName =
  | "CharacterArmature|Death"
  | "CharacterArmature|Duck"
  | "CharacterArmature|HitReact"
  | "CharacterArmature|Idle"
  | "CharacterArmature|Idle_Gun"
  | "CharacterArmature|Jump"
  | "CharacterArmature|Jump_Idle"
  | "CharacterArmature|Jump_Land"
  | "CharacterArmature|No"
  | "CharacterArmature|Punch"
  | "CharacterArmature|Run"
  | "CharacterArmature|Run_Gun"
  | "CharacterArmature|Run_Slash"
  | "CharacterArmature|Run_Stab"
  | "CharacterArmature|Slash"
  | "CharacterArmature|Stab"
  | "CharacterArmature|Walk"
  | "CharacterArmature|Walk_Gun"
  | "CharacterArmature|Wave"
  | "CharacterArmature|Yes";

interface GLTFAction extends AnimationClip {
  name: ActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    Knife: Mesh;
    Matt: SkinnedMesh;
    Root: Bone;
  };
  materials: {
    Atlas: MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

export function Matt(props: JSX.IntrinsicElements["group"]) {
  const group = useRef<Group>(null!);
  const { scene, animations } = useGLTF("/3d-assets/glb/enemies/Characters Matt-transformed.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as unknown as GLTFResult;
  // biome-ignore lint/correctness/noUnusedVariables: kept for future use
  const { actions } = useAnimations(animations, group);
  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Root_Scene">
        <primitive object={nodes.Root} />
        <skinnedMesh
          name="Matt"
          geometry={nodes.Matt.geometry}
          material={materials.Atlas}
          skeleton={nodes.Matt.skeleton}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={100}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Characters Matt-transformed.glb");
