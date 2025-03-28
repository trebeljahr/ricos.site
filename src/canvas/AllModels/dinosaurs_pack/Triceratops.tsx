/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
*/

import { useAnimations, useGLTF } from "@react-three/drei";
import { useRef } from "react";
import { GenericAnimationController } from "src/canvas/Controllers/GenericAnimationController";
import {
  AnimationClip,
  Bone,
  Group,
  MeshStandardMaterial,
  SkinnedMesh,
} from "three";
import { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Triceratops_1: SkinnedMesh;
    Triceratops_2: SkinnedMesh;
    Triceratops_3: SkinnedMesh;
    root: Bone;
  };
  materials: {
    LightBrown: MeshStandardMaterial;
    Purple: MeshStandardMaterial;
    Brown: MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

type ActionName =
  | "Armature|Triceratops_Attack"
  | "Armature|Triceratops_Death"
  | "Armature|Triceratops_Idle"
  | "Armature|Triceratops_Jump"
  | "Armature|Triceratops_Run"
  | "Armature|Triceratops_Walk";

interface GLTFAction extends AnimationClip {
  name: ActionName;
}

type Props = JSX.IntrinsicElements["group"] & {
  animationAction?: ActionName;
};

export default function Model(props: Props) {
  const group = useRef<Group>(null!);
  const { nodes, materials, animations } = useGLTF(
    "/3d-assets/glb/dinosaurs_pack/Triceratops.glb"
  ) as unknown as GLTFResult;
  const { actions } = useAnimations(animations, group);

  return (
    <group ref={group} {...props} dispose={null}>
      <GenericAnimationController
        actions={actions}
        animation={props.animationAction}
      />
      <group name="Root_Scene">
        <group name="RootNode">
          <group name="Armature" rotation={[-Math.PI / 2, 0, 0]} scale={200}>
            <primitive object={nodes.root} />
          </group>
          <group
            name="Triceratops"
            rotation={[-0.47, 0, -Math.PI / 2]}
            scale={162.34}
          >
            <skinnedMesh
              name="Triceratops_1"
              geometry={nodes.Triceratops_1.geometry}
              material={materials.LightBrown}
              skeleton={nodes.Triceratops_1.skeleton}
            />
            <skinnedMesh
              name="Triceratops_2"
              geometry={nodes.Triceratops_2.geometry}
              material={materials.Purple}
              skeleton={nodes.Triceratops_2.skeleton}
            />
            <skinnedMesh
              name="Triceratops_3"
              geometry={nodes.Triceratops_3.geometry}
              material={materials.Brown}
              skeleton={nodes.Triceratops_3.skeleton}
            />
          </group>
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/dinosaurs_pack/Triceratops.glb");
