import { useAnimations, useGLTF, useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { memo, PropsWithChildren, Suspense, useEffect, useRef } from "react";
import {
  type AnimationClip,
  Group,
  LoopOnce,
  LoopRepeat,
  Mesh,
  Object3D,
} from "three";
import {
  AnimationOptions,
  useGenericAnimationController,
} from "../Controllers/GenericAnimationController";
import { MixamoCharacterNames } from "./Character";

interface GLTFAction extends AnimationClip {
  name: string;
}

export enum SupportedAnimations {
  Idle = "idle",
  Walking = "walking",
  Running = "running",
  Jumping = "jump",
  JumpingUp = "jumpingUp",
  Death = "death",
  Dance = "dance",
  Swim = "swim",
  Wave = "wave",
}

const useMixamoCharacter = ({
  characterName,
}: {
  characterName: MixamoCharacterNames;
}) => {
  const characterModel = useGLTF(
    `/3d-assets/glb/characters/${characterName}-transformed.glb`
  );
  useGenericAnimationController;
  return characterModel;
};

export const CharacterModel = memo(
  ({ characterName }: { characterName: MixamoCharacterNames }) => {
    console.log("rendering");

    const characterModel = useMixamoCharacter({
      characterName,
    });

    console.log("characterModel", characterModel);
    return <primitive object={characterModel.scene} />;
  },

  (props) => {
    return props.characterName === props.characterName;
  }
);

export function CharacterWithAnimationsControlled({
  characterName,
}: {
  characterName: string;
}) {
  const characterModel = useGLTF(
    `/3d-assets/glb/characters/${characterName}-transformed.glb`
  );

  const { animationsForHook } = useMixamoAnimations();

  const result = useAnimations(animationsForHook, characterModel.scene);

  const { updateAnimation } = useGenericAnimationController({
    actions: result.actions,
  });

  useEffect(() => {
    updateAnimation("idle", { looping: true });
  }, [updateAnimation]);

  useEffect(() => {
    const listener = () => {
      updateAnimation("idle", { looping: true });
    };

    result.mixer.addEventListener("finished", listener);

    return () => {
      result.mixer.removeEventListener("finished", listener);
    };
  }, [result.mixer, updateAnimation]);

  const [, get] = useKeyboardControls();

  useFrame(() => {
    const { forward, backward, leftward, rightward, run } = get();

    if (forward || backward || leftward || rightward) {
      if (run) {
        updateAnimation("running", { looping: true });
      } else {
        updateAnimation("walking", { looping: true });
      }
    } else {
      updateAnimation("idle", { looping: true });
    }
  });

  return <primitive object={characterModel.scene} />;
}

export default CharacterWithAnimationsControlled;

export function useMixamoAnimations() {
  const running = useGLTF("/3d-assets/glb/animations/running.glb");
  const idle = useGLTF("/3d-assets/glb/animations/idle.glb");
  const jump = useGLTF("/3d-assets/glb/animations/jump.glb");
  const dance = useGLTF("/3d-assets/glb/animations/dance.glb");
  const walking = useGLTF("/3d-assets/glb/animations/walking.glb");
  const death = useGLTF("/3d-assets/glb/animations/death.glb");
  const jumpingUp = useGLTF("/3d-assets/glb/animations/jumping-up.glb");
  const swim = useGLTF("/3d-assets/glb/animations/swim.glb");
  const wave = useGLTF("/3d-assets/glb/animations/wave.glb");

  const animationsForHook = [
    { ...idle.animations[0], name: "idle" },
    { ...walking.animations[0], name: "walking" },
    { ...running.animations[0], name: "running" },
    { ...dance.animations[0], name: "dance" },
    { ...jump.animations[0], name: "jump" },
    { ...death.animations[0], name: "death" },
    { ...jumpingUp.animations[0], name: "jumpingUp" },
    { ...swim.animations[0], name: "swim" },
    { ...wave.animations[0], name: "wave" },
  ] as GLTFAction[];

  return { animationsForHook };
}
