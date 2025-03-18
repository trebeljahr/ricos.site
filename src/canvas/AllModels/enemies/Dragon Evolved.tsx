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
    Dragon_1: THREE.SkinnedMesh;
    Dragon_2: THREE.SkinnedMesh;
    Dragon_3: THREE.SkinnedMesh;
    Dragon_4: THREE.SkinnedMesh;
    Dragon_5: THREE.SkinnedMesh;
    Root: THREE.Bone;
  };
  materials: {
    Dragon_Main: THREE.MeshStandardMaterial;
    Dragon_Secondary: THREE.MeshStandardMaterial;
    Dragon_Horn: THREE.MeshStandardMaterial;
    Eye_Black: THREE.MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

export function DragonEvolved(props: JSX.IntrinsicElements["group"]) {
  const group = React.useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Dragon Evolved-transformed.glb"
  );
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as GLTFResult;
  const { actions } = useAnimations(animations, group);
  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Root_Scene">
        <primitive object={nodes.Root} />
        <group name="Dragon" rotation={[-Math.PI / 2, 0, 0]} scale={100}>
          <skinnedMesh
            name="Dragon_1"
            geometry={nodes.Dragon_1.geometry}
            material={materials.Dragon_Main}
            skeleton={nodes.Dragon_1.skeleton}
          />
          <skinnedMesh
            name="Dragon_2"
            geometry={nodes.Dragon_2.geometry}
            material={materials.Dragon_Secondary}
            skeleton={nodes.Dragon_2.skeleton}
          />
          <skinnedMesh
            name="Dragon_3"
            geometry={nodes.Dragon_3.geometry}
            material={materials.Dragon_Horn}
            skeleton={nodes.Dragon_3.skeleton}
          />
          <skinnedMesh
            name="Dragon_4"
            geometry={nodes.Dragon_4.geometry}
            material={materials.Dragon_Horn}
            skeleton={nodes.Dragon_4.skeleton}
          />
          <skinnedMesh
            name="Dragon_5"
            geometry={nodes.Dragon_5.geometry}
            material={materials.Eye_Black}
            skeleton={nodes.Dragon_5.skeleton}
          />
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Dragon Evolved-transformed.glb");
