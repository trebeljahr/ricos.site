import { useAnimations, useGLTF } from "@react-three/drei";
import { useGraph } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AnimationClip,
  Bone,
  Group,
  MeshStandardMaterial,
  SkinnedMesh,
} from "three";
import { GLTF, SkeletonUtils } from "three-stdlib";

type ActionName =
  | "CharacterArmature|Death"
  | "CharacterArmature|Fast_Flying"
  | "CharacterArmature|Flying_Idle"
  | "CharacterArmature|Headbutt"
  | "CharacterArmature|HitReact"
  | "CharacterArmature|No"
  | "CharacterArmature|Punch"
  | "CharacterArmature|Yes";

interface GLTFAction extends AnimationClip {
  name: ActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    Ghost_Skull_1: SkinnedMesh;
    Ghost_Skull_2: SkinnedMesh;
    Root: Bone;
  };
  materials: {
    Ghost_Main: MeshStandardMaterial;
    Ghost_Secondary: MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

export function GhostSkull(props: JSX.IntrinsicElements["group"]) {
  const group = useRef<Group>(null!);
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Ghost Skull-transformed.glb"
  );
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as GLTFResult;
  const { actions } = useAnimations(animations, group);
  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Root_Scene">
        <primitive object={nodes.Root} />
        <group name="Ghost_Skull" rotation={[-Math.PI / 2, 0, 0]} scale={100}>
          <skinnedMesh
            name="Ghost_Skull_1"
            geometry={nodes.Ghost_Skull_1.geometry}
            material={materials.Ghost_Main}
            skeleton={nodes.Ghost_Skull_1.skeleton}
          />
          <skinnedMesh
            name="Ghost_Skull_2"
            geometry={nodes.Ghost_Skull_2.geometry}
            material={materials.Ghost_Secondary}
            skeleton={nodes.Ghost_Skull_2.skeleton}
          />
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Ghost Skull-transformed.glb");
