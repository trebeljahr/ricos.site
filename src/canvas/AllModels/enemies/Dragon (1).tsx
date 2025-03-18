import * as THREE from "three";
import React from "react";
import { useGraph } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { GLTF, SkeletonUtils } from "three-stdlib";

type ActionName =
  | "DragonArmature|Dragon_Attack"
  | "DragonArmature|Dragon_Attack2"
  | "DragonArmature|Dragon_Death"
  | "DragonArmature|Dragon_Flying"
  | "DragonArmature|Dragon_Hit";

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    Eyes_1: THREE.Mesh;
    Eyes_2: THREE.Mesh;
    Dragon_1: THREE.SkinnedMesh;
    Dragon_2: THREE.SkinnedMesh;
    Dragon_3: THREE.SkinnedMesh;
    Dragon_4: THREE.SkinnedMesh;
    Root: THREE.Bone;
  };
  materials: {
    Eyes: THREE.MeshStandardMaterial;
    Main: THREE.MeshStandardMaterial;
    Belly: THREE.MeshStandardMaterial;
    Claws: THREE.MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

export function Model(props: JSX.IntrinsicElements["group"]) {
  const group = React.useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Dragon (1)-transformed.glb"
  );
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as GLTFResult;
  const { actions } = useAnimations(animations, group);
  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Root_Scene">
        <primitive object={nodes.Root} />
        <group
          name="Dragon"
          position={[0, 1.58, -0.22]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={100}
        >
          <skinnedMesh
            name="Dragon_1"
            geometry={nodes.Dragon_1.geometry}
            material={materials.Main}
            skeleton={nodes.Dragon_1.skeleton}
          />
          <skinnedMesh
            name="Dragon_2"
            geometry={nodes.Dragon_2.geometry}
            material={materials.Belly}
            skeleton={nodes.Dragon_2.skeleton}
          />
          <skinnedMesh
            name="Dragon_3"
            geometry={nodes.Dragon_3.geometry}
            material={materials.Claws}
            skeleton={nodes.Dragon_3.skeleton}
          />
          <skinnedMesh
            name="Dragon_4"
            geometry={nodes.Dragon_4.geometry}
            material={materials.Eyes}
            skeleton={nodes.Dragon_4.skeleton}
          />
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Dragon (1)-transformed.glb");
