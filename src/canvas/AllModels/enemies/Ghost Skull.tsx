import * as THREE from "three";
import React from "react";
import { useGraph } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
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

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    Ghost_Skull_1: THREE.SkinnedMesh;
    Ghost_Skull_2: THREE.SkinnedMesh;
    Root: THREE.Bone;
  };
  materials: {
    Ghost_Main: THREE.MeshStandardMaterial;
    Ghost_Secondary: THREE.MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

export function Model(props: JSX.IntrinsicElements["group"]) {
  const group = React.useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Ghost Skull-transformed.glb"
  );
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
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
