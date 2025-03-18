import * as THREE from "three";
import React from "react";
import { useGraph } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { GLTF, SkeletonUtils } from "three-stdlib";

type ActionName =
  | "BatArmature|Bat_Attack"
  | "BatArmature|Bat_Attack2"
  | "BatArmature|Bat_Death"
  | "BatArmature|Bat_Flying"
  | "BatArmature|Bat_Hit";

interface GLTFAction extends THREE.AnimationClip {
  name: ActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    Eyes: THREE.Mesh;
    Bat_1: THREE.SkinnedMesh;
    Bat_2: THREE.SkinnedMesh;
    Bat_3: THREE.SkinnedMesh;
    Bat_4: THREE.SkinnedMesh;
    Root: THREE.Bone;
  };
  materials: {
    PaletteMaterial001: THREE.MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

export function Bat(props: JSX.IntrinsicElements["group"]) {
  const group = React.useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Bat-transformed.glb"
  );
  const clone = React.useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as GLTFResult;
  const { actions } = useAnimations(animations, group);
  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Root_Scene">
        <primitive object={nodes.Root} />
        <group
          name="Bat"
          position={[0, 2.44, 0.13]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={100}
        >
          <skinnedMesh
            name="Bat_1"
            geometry={nodes.Bat_1.geometry}
            material={materials.PaletteMaterial001}
            skeleton={nodes.Bat_1.skeleton}
          />
          <skinnedMesh
            name="Bat_2"
            geometry={nodes.Bat_2.geometry}
            material={materials.PaletteMaterial001}
            skeleton={nodes.Bat_2.skeleton}
          />
          <skinnedMesh
            name="Bat_3"
            geometry={nodes.Bat_3.geometry}
            material={materials.PaletteMaterial001}
            skeleton={nodes.Bat_3.skeleton}
          />
          <skinnedMesh
            name="Bat_4"
            geometry={nodes.Bat_4.geometry}
            material={materials.PaletteMaterial001}
            skeleton={nodes.Bat_4.skeleton}
          />
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Bat-transformed.glb");
