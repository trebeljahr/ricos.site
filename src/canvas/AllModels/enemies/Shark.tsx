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
  | "SharkArmature|SharkArmature|SharkArmature|Swim_Bite|SharkArmature|Swim_Bite"
  | "SharkArmature|SharkArmature|SharkArmature|Swim_Fast|SharkArmature|Swim_Fast"
  | "SharkArmature|SharkArmature|SharkArmature|Swim|SharkArmature|Swim";

interface GLTFAction extends AnimationClip {
  name: ActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    Shark: SkinnedMesh;
    Shark001: SkinnedMesh;
    Abdomen: Bone;
    Center: Bone;
    Root: Bone;
  };
  materials: {
    AtlasMaterial: MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

export function Shark(props: JSX.IntrinsicElements["group"]) {
  const group = useRef<Group>(null!);
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Shark-transformed.glb"
  );
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as GLTFResult;
  const { actions } = useAnimations(animations, group);
  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Root_Scene">
        <group name="SharkArmature" rotation={[-Math.PI / 2, 0, 0]} scale={100}>
          <primitive object={nodes.Abdomen} />
          <primitive object={nodes.Center} />
        </group>
        <primitive object={nodes.Root} />
        <skinnedMesh
          name="Shark"
          geometry={nodes.Shark.geometry}
          material={materials.AtlasMaterial}
          skeleton={nodes.Shark.skeleton}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={100}
        />
        <skinnedMesh
          name="Shark001"
          geometry={nodes.Shark001.geometry}
          material={materials.AtlasMaterial}
          skeleton={nodes.Shark001.skeleton}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={100}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Shark-transformed.glb");
