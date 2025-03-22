import { useGLTF } from "@react-three/drei";
import { memo } from "react";
import { type AnimationClip } from "three";
import { useGenericAnimationController } from "../Controllers/GenericAnimationController";
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

export const AnyMixamoCharacter = memo(
  ({ characterName }: { characterName: MixamoCharacterNames }) => {
    const characterModel = useMixamoCharacter({
      characterName,
    });

    return <primitive object={characterModel.scene} />;
  },

  (props) => {
    return props.characterName === props.characterName;
  }
);

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
