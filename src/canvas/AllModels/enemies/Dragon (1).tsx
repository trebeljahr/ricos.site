import { useAnimations, useGLTF } from "@react-three/drei";
import { useGraph } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  AnimationClip,
  Bone,
  Group,
  Mesh,
  MeshStandardMaterial,
  SkinnedMesh,
} from "three";
import { GLTF, SkeletonUtils } from "three-stdlib";

type ActionName =
  | "DragonArmature|Dragon_Attack"
  | "DragonArmature|Dragon_Attack2"
  | "DragonArmature|Dragon_Death"
  | "DragonArmature|Dragon_Flying"
  | "DragonArmature|Dragon_Hit";

interface GLTFAction extends AnimationClip {
  name: ActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    Eyes_1: Mesh;
    Eyes_2: Mesh;
    Dragon_1: SkinnedMesh;
    Dragon_2: SkinnedMesh;
    Dragon_3: SkinnedMesh;
    Dragon_4: SkinnedMesh;
    Root: Bone;
  };
  materials: {
    Eyes: MeshStandardMaterial;
    Main: MeshStandardMaterial;
    Belly: MeshStandardMaterial;
    Claws: MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

export function DragonAnimated(props: JSX.IntrinsicElements["group"]) {
  const group = useRef<Group>(null!);
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Dragon (1)-transformed.glb"
  );
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
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
