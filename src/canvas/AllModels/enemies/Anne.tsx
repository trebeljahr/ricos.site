import * as THREE from "three";
import React from "react";
import { useGraph } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { GLTF, SkeletonUtils } from "three-stdlib";

type ActionName =
  | "CharacterArmature|CharacterArmature|CharacterArmature|Death|CharacterArmature|Dea"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Duck|CharacterArmature|Duck"
  | "CharacterArmature|CharacterArmature|CharacterArmature|HitReact|CharacterArmature|"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Idle|CharacterArmature|Idle"
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

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    Weapon_DoubleAxe: THREE.Mesh;
    Cube117: THREE.SkinnedMesh;
    Root: THREE.Bone;
  };
  materials: {
    AtlasMaterial: THREE.MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

export function Anne(props: JSX.IntrinsicElements["group"]) {
  const group = React.useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Anne-transformed.glb"
  );
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as GLTFResult;
  const { actions } = useAnimations(animations, group);
  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Root_Scene">
        <primitive object={nodes.Root} />
        <skinnedMesh
          name="Cube117"
          geometry={nodes.Cube117.geometry}
          material={materials.AtlasMaterial}
          skeleton={nodes.Cube117.skeleton}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={100}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Anne-transformed.glb");
