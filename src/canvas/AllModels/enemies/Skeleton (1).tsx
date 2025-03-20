import { useAnimations, useGLTF } from "@react-three/drei";
import { useGraph } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AnimationClip,
  Bone,
  Group,
  Mesh,
  MeshStandardMaterial,
  SkinnedMesh,
} from "three";
import { GLTF, SkeletonUtils } from "three-stdlib";

type ActionName =
  | "CharacterArmature|CharacterArmature|CharacterArmature|Death|CharacterArmature|Dea"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Duck|CharacterArmature|Duck"
  | "CharacterArmature|CharacterArmature|CharacterArmature|HitReact|CharacterArmature|"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Idle|CharacterArmature|Idle"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Jump_Idlea|CharacterArmatur"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Jump_Idle|CharacterArmature"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Jump_Land|CharacterArmature"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Jump|CharacterArmature|Jump"
  | "CharacterArmature|CharacterArmature|CharacterArmature|No|CharacterArmature|No"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Punch|CharacterArmature|Pun"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Run|CharacterArmature|Run"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Sword|CharacterArmature|Swo"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Walk|CharacterArmature|Walk"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Wave|CharacterArmature|Wave"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Yes|CharacterArmature|Yes";

interface GLTFAction extends AnimationClip {
  name: ActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    Weapon_Axe: Mesh;
    Skeleton: SkinnedMesh;
    Root: Bone;
  };
  materials: {
    AtlasMaterial: MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

export function SkeletonWithoutHead(props: JSX.IntrinsicElements["group"]) {
  const group = useRef<Group>(null!);
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Skeleton (1)-transformed.glb"
  );
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as GLTFResult;
  const { actions } = useAnimations(animations, group);
  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Root_Scene">
        <primitive object={nodes.Root} />
        <skinnedMesh
          name="Skeleton"
          geometry={nodes.Skeleton.geometry}
          material={materials.AtlasMaterial}
          skeleton={nodes.Skeleton.skeleton}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={100}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Skeleton (1)-transformed.glb");
