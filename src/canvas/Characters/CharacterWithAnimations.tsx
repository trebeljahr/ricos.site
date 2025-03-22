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
  Jump = "jump",
  JumpingUp = "jumpingUp",
  Death = "death",
  Dance = "dance",
  Swim = "swim",
  Wave = "wave",
  SlashR = "slashR",
  SlashL = "slashL",
  StabR = "stabR",
  StabL = "stabL",
  SwordR = "swordR",
  SwordL = "swordL",
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

export const MixamoCharacter = memo(
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
  const slashL = useGLTF("/3d-assets/glb/animations/outward-slash-left.glb");
  const slashR = useGLTF("/3d-assets/glb/animations/outward-slash-right.glb");
  const stabL = useGLTF("/3d-assets/glb/animations/stab-left.glb");
  const stabR = useGLTF("/3d-assets/glb/animations/stab-right.glb");
  const swordR = useGLTF("/3d-assets/glb/animations/slash-right.glb");
  const swordL = useGLTF("/3d-assets/glb/animations/slash-left.glb");

  const animationsForHook = [
    { ...idle.animations[0], name: SupportedAnimations.Idle },
    { ...walking.animations[0], name: SupportedAnimations.Walking },
    { ...running.animations[0], name: SupportedAnimations.Running },
    { ...dance.animations[0], name: SupportedAnimations.Dance },
    { ...jump.animations[0], name: SupportedAnimations.Jump },
    { ...death.animations[0], name: SupportedAnimations.Death },
    { ...jumpingUp.animations[0], name: SupportedAnimations.JumpingUp },
    { ...swim.animations[0], name: SupportedAnimations.Swim },
    { ...wave.animations[0], name: SupportedAnimations.Wave },
    { ...slashL.animations[0], name: SupportedAnimations.SlashL },
    { ...slashR.animations[0], name: SupportedAnimations.SlashR },
    { ...stabL.animations[0], name: SupportedAnimations.StabL },
    { ...stabR.animations[0], name: SupportedAnimations.StabR },
    { ...swordR.animations[0], name: SupportedAnimations.SwordR },
    { ...swordL.animations[0], name: SupportedAnimations.SwordL },
  ] as GLTFAction[];

  return { animationsForHook };
}
