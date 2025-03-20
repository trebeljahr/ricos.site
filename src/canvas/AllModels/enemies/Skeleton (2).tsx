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
  | "SkeletonArmature|Skeleton_Attack"
  | "SkeletonArmature|Skeleton_Death"
  | "SkeletonArmature|Skeleton_Idle"
  | "SkeletonArmature|Skeleton_Running"
  | "SkeletonArmature|Skeleton_Spawn";

interface GLTFAction extends AnimationClip {
  name: ActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    Cylinder001: SkinnedMesh;
    Hips: Bone;
  };
  materials: {
    Skeleton: MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

export function SkeletonUnarmed(props: JSX.IntrinsicElements["group"]) {
  const group = useRef<Group>(null!);
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Skeleton (2)-transformed.glb"
  );
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as GLTFResult;
  const { actions } = useAnimations(animations, group);
  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Root_Scene">
        <group
          name="SkeletonArmature"
          position={[0.01, 1.35, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={100}
        >
          <primitive object={nodes.Hips} />
        </group>
        <skinnedMesh
          name="Cylinder001"
          geometry={nodes.Cylinder001.geometry}
          material={materials.Skeleton}
          skeleton={nodes.Cylinder001.skeleton}
          position={[0, 3, 0.12]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={100}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Skeleton (2)-transformed.glb");
