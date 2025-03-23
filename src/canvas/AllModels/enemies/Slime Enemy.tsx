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
  | "moving"
  | "hit"
  | "idle"
  | "attack"
  | "death"
  | "attack_ranged";

interface GLTFAction extends AnimationClip {
  name: ActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    enemy2: SkinnedMesh;
    bodyfront_1: Bone;
    jawall_1: Bone;
    jawlow_1: Bone;
    jawlow_2: Bone;
    jawlow_3: Bone;
    liplow_l_1: Bone;
    liplow_r_1: Bone;
    tooth_lowmid_l_1: Bone;
    tooth_lowmid_l_2: Bone;
    tooth_lowmid_l_3: Bone;
    tooth_lowmid_l_4: Bone;
    tooth_lowfront_l_1: Bone;
    tooth_lowfront_l_2: Bone;
    tooth_lowfront_l_4: Bone;
    tooth_lowmid_r_1: Bone;
    tooth_lowmid_r_2: Bone;
    tooth_lowmid_r_3: Bone;
    tooth_lowmid_r_4: Bone;
    tooth_lowfront_r_1: Bone;
    tooth_lowfront_r_2: Bone;
    tooth_lowfront_r_4: Bone;
    tooth_lowback_l_1: Bone;
    tooth_lowback_l_2: Bone;
    tooth_lowback_r_1: Bone;
    tooth_lowback_r_2: Bone;
    upperhead_1: Bone;
    jawhigh_1: Bone;
    jawhigh_2: Bone;
    jawhigh_3: Bone;
    tooth_highfront_r_1: Bone;
    tooth_highfront_r_2: Bone;
    tooth_highcenter_1: Bone;
    tooth_highcenter_2: Bone;
    tooth_highcenter_3: Bone;
    tooth_highfront_l_1: Bone;
    tooth_highfront_l_2: Bone;
    tooth_highlong_r_1: Bone;
    tooth_highlong_r_2: Bone;
    tooth_highlong_r_3: Bone;
    tooth_highlong_l_1: Bone;
    tooth_highlong_l_2: Bone;
    tooth_highlong_l_3: Bone;
    tooth_highmid_r_1: Bone;
    tooth_highmid_r_2: Bone;
    tooth_highmid_r_3: Bone;
    tooth_highmid_r_4: Bone;
    tooth_highmid_r_5: Bone;
    tooth_highmid_l_1: Bone;
    tooth_highmid_l_2: Bone;
    tooth_highmid_l_3: Bone;
    tooth_highmid_l_4: Bone;
    tooth_highmid_l_5: Bone;
    tooth_highback_r_1: Bone;
    tooth_highback_r_2: Bone;
    tooth_highback_r_3: Bone;
    tooth_highback_l_1: Bone;
    tooth_highback_l_2: Bone;
    tooth_highback_l_3: Bone;
    hair_1: Bone;
    hair_2: Bone;
    hair_3: Bone;
    hair_4: Bone;
    hair_5: Bone;
    eye_l_1: Bone;
    eye_l_2: Bone;
    eye_r_1: Bone;
    eye_r_2: Bone;
    finback_l_1: Bone;
    finback_l_2: Bone;
    finfront_l_1: Bone;
    finfront_l_2: Bone;
    finfront_r_1: Bone;
    finfront_r_2: Bone;
    finback_r_1: Bone;
    finback_r_2: Bone;
    tail_main_1: Bone;
    tail_1: Bone;
    tail_2: Bone;
    tail_3: Bone;
    tail_r_1: Bone;
    tail_r_2: Bone;
    tail_l_1: Bone;
    tail_l_2: Bone;
  };
  materials: {
    lambert3: MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

export function Slime(props: JSX.IntrinsicElements["group"]) {
  const group = useRef<Group>(null!);
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Slime Enemy-transformed.glb"
  );
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as GLTFResult;
  const { actions } = useAnimations(animations, group);
  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Root_Scene">
        <group name="alljoints_1_ZERO" rotation={[0, -Math.PI / 2, 0]}>
          <group name="alljoints_1">
            <group name="bodyfront_1_ZERO">
              <primitive object={nodes.bodyfront_1} />
            </group>
            <group name="bodyback_1_ZERO" rotation={[Math.PI, 0, -1.83]}>
              <group name="bodyback_1">
                <group name="tail_main_1_ZERO" rotation={[0, 0, -2.11]}>
                  <primitive object={nodes.tail_main_1} />
                </group>
              </group>
            </group>
          </group>
        </group>
        <skinnedMesh
          name="enemy2"
          geometry={nodes.enemy2.geometry}
          material={materials.lambert3}
          skeleton={nodes.enemy2.skeleton}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Slime Enemy-transformed.glb");
