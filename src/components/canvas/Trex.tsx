import { usePrevious } from "@hooks/usePrevious";
import { useAnimations, useGLTF, useKeyboardControls } from "@react-three/drei";
import { GroupProps, useFrame, useThree } from "@react-three/fiber";
import {
  ForwardedRef,
  forwardRef,
  MutableRefObject,
  Ref,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AnimationAction,
  AnimationClip,
  Bone,
  Group,
  LoopOnce,
  MeshStandardMaterial,
  Object3D,
  SkinnedMesh,
  Vector3,
} from "three";
import { GLTF } from "three-stdlib";

type GLTFResult = GLTF & {
  nodes: {
    Trex_1: SkinnedMesh;
    Trex_2: SkinnedMesh;
    Trex_3: SkinnedMesh;
    Trex_4: SkinnedMesh;
    Trex_5: SkinnedMesh;
    root: Bone;
  };
  materials: {
    LightYellow: MeshStandardMaterial;
    LightGreen: MeshStandardMaterial;
    Green: MeshStandardMaterial;
    Black: MeshStandardMaterial;
    Red: MeshStandardMaterial;
  };
  animations: GLTFAction[];
};

type ActionName =
  | "Armature|TRex_Attack"
  | "Armature|TRex_Death"
  | "Armature|TRex_Idle"
  | "Armature|TRex_Jump"
  | "Armature|TRex_Run"
  | "Armature|TRex_Walk";

interface GLTFAction extends AnimationClip {
  name: ActionName;
}

interface PossibleActions {
  "Armature|TRex_Attack": AnimationAction | null;
  "Armature|TRex_Death": AnimationAction | null;
  "Armature|TRex_Idle": AnimationAction | null;
  "Armature|TRex_Jump": AnimationAction | null;
  "Armature|TRex_Run": AnimationAction | null;
  "Armature|TRex_Walk": AnimationAction | null;
}

// const rotationSpeed = 20
// const speed = 0.5

export function FollowingTrex() {
  const group = useRef<Group>(null!);
  const { camera } = useThree();

  useFrame(() => {
    const cameraPosInPlane = camera.position.clone().normalize().setY(0);
    group.current.lookAt(cameraPosInPlane);

    const direction = cameraPosInPlane.sub(group.current.position);
    // const distance = direction.length()
  });

  return (
    <group position={new Vector3(0, 0, -30)} ref={group}>
      <Trex />
    </group>
  );
}

function AnimationController({ actions }: { actions: PossibleActions }) {
  const [state, setState] = useState<ActionName>("Armature|TRex_Idle");
  const previousState = usePrevious(state);

  const [subscribe] = useKeyboardControls();

  useEffect(() => {
    subscribe((state) => {
      if (!actions) return;
      const { attack, jump, forward, backward, left, right } = state;
      if (attack) {
        if (!actions["Armature|TRex_Attack"]) return;
        actions["Armature|TRex_Attack"].setLoop(LoopOnce, 1);
        actions["Armature|TRex_Attack"].clampWhenFinished = true;
        actions["Armature|TRex_Attack"].reset().play();
      }
      if (jump) {
        if (!actions["Armature|TRex_Jump"]?.isRunning()) {
          if (!actions["Armature|TRex_Jump"]) return;
          actions["Armature|TRex_Jump"].setLoop(LoopOnce, 1);
          actions["Armature|TRex_Jump"].clampWhenFinished = true;
          actions["Armature|TRex_Jump"].reset().play();
        }
      }
      if (forward || backward || left || right) {
        return setState("Armature|TRex_Run");
      }
      return setState("Armature|TRex_Idle");
    });
  }, [actions, subscribe]);

  useEffect(() => {
    const fadeDuration = 0.5;
    if (!previousState) return;

    const current = actions[previousState];
    const toPlay = actions[state];
    current?.fadeOut(fadeDuration);
    toPlay?.reset().fadeIn(fadeDuration).play();
  }, [state, actions, previousState]);

  return null;
}

export const useTrex = () => {
  return useGLTF("/3d-assets/glb/Trex.glb") as unknown as GLTFResult;
};

interface Props extends GroupProps {
  withAnimations?: boolean;
}

export const Trex = forwardRef(function TrexModel(
  props: Props,
  ref: ForwardedRef<Group>
) {
  const { nodes, materials, animations } = useGLTF(
    "/3d-assets/glb/Trex.glb"
  ) as unknown as GLTFResult;
  const { withAnimations = false } = props;
  const { actions } = useAnimations(
    animations,
    ref as MutableRefObject<Object3D>
  );

  return (
    <group {...props} ref={ref} dispose={null}>
      {withAnimations && <AnimationController actions={actions} />}
      <group name="Armature" rotation={[-Math.PI / 2, 0, Math.PI]} scale={300}>
        <primitive object={nodes.root} />
      </group>
      <group name="Trex" rotation={[-Math.PI / 2, 0, Math.PI]} scale={100}>
        <skinnedMesh
          name="Trex_1"
          geometry={nodes.Trex_1.geometry}
          material={materials.LightYellow}
          skeleton={nodes.Trex_1.skeleton}
        />
        <skinnedMesh
          name="Trex_2"
          geometry={nodes.Trex_2.geometry}
          material={materials.LightGreen}
          skeleton={nodes.Trex_2.skeleton}
        />
        <skinnedMesh
          name="Trex_3"
          geometry={nodes.Trex_3.geometry}
          material={materials.Green}
          skeleton={nodes.Trex_3.skeleton}
        />
        <skinnedMesh
          name="Trex_4"
          geometry={nodes.Trex_4.geometry}
          material={materials.Black}
          skeleton={nodes.Trex_4.skeleton}
        />
        <skinnedMesh
          name="Trex_5"
          geometry={nodes.Trex_5.geometry}
          material={materials.Red}
          skeleton={nodes.Trex_5.skeleton}
        />
      </group>
    </group>
  );
});
