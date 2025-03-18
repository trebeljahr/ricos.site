import * as THREE from "three";
import React from "react";
import { useGraph } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { GLTF, SkeletonUtils } from "three-stdlib";

type ActionName =
  | "moving"
  | "hit"
  | "idle"
  | "attack"
  | "death"
  | "attack_ranged";

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    enemy2: THREE.SkinnedMesh;
    bodyfront_1: THREE.Bone;
    jawall_1: THREE.Bone;
    jawlow_1: THREE.Bone;
    jawlow_2: THREE.Bone;
    jawlow_3: THREE.Bone;
    liplow_l_1: THREE.Bone;
    liplow_r_1: THREE.Bone;
    tooth_lowmid_l_1: THREE.Bone;
    tooth_lowmid_l_2: THREE.Bone;
    tooth_lowmid_l_3: THREE.Bone;
    tooth_lowmid_l_4: THREE.Bone;
    tooth_lowfront_l_1: THREE.Bone;
    tooth_lowfront_l_2: THREE.Bone;
    tooth_lowfront_l_4: THREE.Bone;
    tooth_lowmid_r_1: THREE.Bone;
    tooth_lowmid_r_2: THREE.Bone;
    tooth_lowmid_r_3: THREE.Bone;
    tooth_lowmid_r_4: THREE.Bone;
    tooth_lowfront_r_1: THREE.Bone;
    tooth_lowfront_r_2: THREE.Bone;
    tooth_lowfront_r_4: THREE.Bone;
    tooth_lowback_l_1: THREE.Bone;
    tooth_lowback_l_2: THREE.Bone;
    tooth_lowback_r_1: THREE.Bone;
    tooth_lowback_r_2: THREE.Bone;
    upperhead_1: THREE.Bone;
    jawhigh_1: THREE.Bone;
    jawhigh_2: THREE.Bone;
    jawhigh_3: THREE.Bone;
    tooth_highfront_r_1: THREE.Bone;
    tooth_highfront_r_2: THREE.Bone;
    tooth_highcenter_1: THREE.Bone;
    tooth_highcenter_2: THREE.Bone;
    tooth_highcenter_3: THREE.Bone;
    tooth_highfront_l_1: THREE.Bone;
    tooth_highfront_l_2: THREE.Bone;
    tooth_highlong_r_1: THREE.Bone;
    tooth_highlong_r_2: THREE.Bone;
    tooth_highlong_r_3: THREE.Bone;
    tooth_highlong_l_1: THREE.Bone;
    tooth_highlong_l_2: THREE.Bone;
    tooth_highlong_l_3: THREE.Bone;
    tooth_highmid_r_1: THREE.Bone;
    tooth_highmid_r_2: THREE.Bone;
    tooth_highmid_r_3: THREE.Bone;
    tooth_highmid_r_4: THREE.Bone;
    tooth_highmid_r_5: THREE.Bone;
    tooth_highmid_l_1: THREE.Bone;
    tooth_highmid_l_2: THREE.Bone;
    tooth_highmid_l_3: THREE.Bone;
    tooth_highmid_l_4: THREE.Bone;
    tooth_highmid_l_5: THREE.Bone;
    tooth_highback_r_1: THREE.Bone;
    tooth_highback_r_2: THREE.Bone;
    tooth_highback_r_3: THREE.Bone;
    tooth_highback_l_1: THREE.Bone;
    tooth_highback_l_2: THREE.Bone;
    tooth_highback_l_3: THREE.Bone;
    hair_1: THREE.Bone;
    hair_2: THREE.Bone;
    hair_3: THREE.Bone;
    hair_4: THREE.Bone;
    hair_5: THREE.Bone;
    eye_l_1: THREE.Bone;
    eye_l_2: THREE.Bone;
    eye_r_1: THREE.Bone;
    eye_r_2: THREE.Bone;
    finback_l_1: THREE.Bone;
    finback_l_2: THREE.Bone;
    finfront_l_1: THREE.Bone;
    finfront_l_2: THREE.Bone;
    finfront_r_1: THREE.Bone;
    finfront_r_2: THREE.Bone;
    finback_r_1: THREE.Bone;
    finback_r_2: THREE.Bone;
    tail_main_1: THREE.Bone;
    tail_1: THREE.Bone;
    tail_2: THREE.Bone;
    tail_3: THREE.Bone;
    tail_r_1: THREE.Bone;
    tail_r_2: THREE.Bone;
    tail_l_1: THREE.Bone;
    tail_l_2: THREE.Bone;
  };
  materials: {
    lambert3: THREE.MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

export function Slime(props: JSX.IntrinsicElements["group"]) {
  const group = React.useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Slime Enemy-transformed.glb"
  );
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
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
