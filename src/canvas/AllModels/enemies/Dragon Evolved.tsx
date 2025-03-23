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
    Dragon_1: SkinnedMesh;
    Dragon_2: SkinnedMesh;
    Dragon_3: SkinnedMesh;
    Dragon_4: SkinnedMesh;
    Dragon_5: SkinnedMesh;
    Root: Bone;
  };
  materials: {
    Dragon_Main: MeshStandardMaterial;
    Dragon_Secondary: MeshStandardMaterial;
    Dragon_Horn: MeshStandardMaterial;
    Eye_Black: MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

export function DragonEvolved(props: JSX.IntrinsicElements["group"]) {
  const group = useRef<Group>(null!);
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Dragon Evolved-transformed.glb"
  );
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
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
