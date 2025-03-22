import { useEffect, useMemo, useRef } from "react";
import { GroupProps, useGraph } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { GLTF, SkeletonUtils } from "three-stdlib";
import { useGenericAnimationController } from "@r3f/Controllers/GenericAnimationController";
import { CommonActions } from "@r3f/Dungeon/BuildingBlocks/CommonEnemy";
import {
  AnimationClip,
  Bone,
  Group,
  Mesh,
  MeshStandardMaterial,
  SkinnedMesh,
} from "three";

type ActionName =
  | "CharacterArmature|CharacterArmature|CharacterArmature|Death|CharacterArmature|Dea"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Duck|CharacterArmature|Duck"
  | "CharacterArmature|CharacterArmature|CharacterArmature|HitReact|CharacterArmature|"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Idle|CharacterArmature|Idle"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Jump_Idle|CharacterArmature"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Jump_Land|CharacterArmature"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Jump|CharacterArmature|Jump"
  | "CharacterArmature|CharacterArmature|CharacterArmature|No|CharacterArmature|No"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Punch|CharacterArmature|Pun"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Run|CharacterArmature|Run"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Sword|CharacterArmature|Swo"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Walk|CharacterArmature|Walk"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Wave|CharacterArmature|Wave"
  | "CharacterArmature|CharacterArmature|CharacterArmature|Yes|CharacterArmature|Yes";

interface GLTFAction extends AnimationClip {
  name: ActionName;
}

type GLTFResult = GLTF & {
  nodes: {
    Weapon_DoubleAxe: Mesh;
    Cube117: SkinnedMesh;
    Root: Bone;
  };
  materials: {
    AtlasMaterial: MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

const mapCommonActionToCharacterAction: Record<CommonActions, ActionName> = {
  [CommonActions.Idle]:
    "CharacterArmature|CharacterArmature|CharacterArmature|Idle|CharacterArmature|Idle",
  [CommonActions.Walk]:
    "CharacterArmature|CharacterArmature|CharacterArmature|Walk|CharacterArmature|Walk",
  [CommonActions.Run]:
    "CharacterArmature|CharacterArmature|CharacterArmature|Run|CharacterArmature|Run",
  [CommonActions.Jump]:
    "CharacterArmature|CharacterArmature|CharacterArmature|Jump|CharacterArmature|Jump",
  [CommonActions.Death]:
    "CharacterArmature|CharacterArmature|CharacterArmature|Death|CharacterArmature|Dea",
  [CommonActions.Attack]:
    "CharacterArmature|CharacterArmature|CharacterArmature|Sword|CharacterArmature|Swo",
  [CommonActions.HitReact]:
    "CharacterArmature|CharacterArmature|CharacterArmature|HitReact|CharacterArmature|",
};

export const AnimatedAnne = ({
  animationToPlay = CommonActions.Idle,
  ...props
}: {
  animationToPlay?: CommonActions;
} & GroupProps) => {
  const group = useRef<Group>(null!);

  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Anne-transformed.glb"
  );
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as GLTFResult;
  const { actions } = useAnimations(animations, group);

  const result = useGenericAnimationController({
    actions,
    defaultFadeDuration: 0.5,
  });
  const { updateAnimation } = result;

  useEffect(() => {
    updateAnimation(mapCommonActionToCharacterAction[animationToPlay], {
      looping: true,
    });
  }, [updateAnimation, animationToPlay]);

  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Root_Scene">
        <primitive object={nodes.Root} />
        <skinnedMesh
          name="Cube117"
          geometry={nodes.Cube117.geometry}
          material={materials.AtlasMaterial}
          skeleton={nodes.Cube117.skeleton}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={100}
        />
      </group>
    </group>
  );
};

export function Anne(props: JSX.IntrinsicElements["group"]) {
  const group = useRef<Group>(null!);
  const { scene, animations } = useGLTF(
    "/3d-assets/glb/enemies/Anne-transformed.glb"
  );
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone) as GLTFResult;
  const { actions } = useAnimations(animations, group);

  return (
    <group ref={group} {...props} dispose={null}>
      <group name="Root_Scene">
        <primitive object={nodes.Root} />
        <skinnedMesh
          name="Cube117"
          geometry={nodes.Cube117.geometry}
          material={materials.AtlasMaterial}
          skeleton={nodes.Cube117.skeleton}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={100}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/3d-assets/glb/enemies/Anne-transformed.glb");
