import { useAnimations, useGLTF, useKeyboardControls } from "@react-three/drei";
import { memo, useEffect } from "react";
import { Mesh, type AnimationClip } from "three";
import { useGenericAnimationController } from "../Controllers/GenericAnimationController";
import { MixamoCharacterNames } from "./Character";
import { useFrame } from "@react-three/fiber";

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
  SlashL = "slashL",
  StabR = "stabR",
  StabL = "stabL",
  SwordR = "swordR",
  SwordL = "swordL",
  SwordR2 = "swordR2",
  SwordL2 = "swordL2",
  SwordR3 = "swordR3",
  SwordL3 = "swordL3",
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

    useEffect(() => {
      characterModel.scene.traverse((child) => {
        if (child instanceof Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }, [characterModel]);

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
  const stabL = useGLTF("/3d-assets/glb/animations/stab-left.glb");
  const stabR = useGLTF("/3d-assets/glb/animations/stab-right.glb");
  const swordR = useGLTF("/3d-assets/glb/animations/slash-right.glb");
  const swordL = useGLTF("/3d-assets/glb/animations/slash-left.glb");
  const swordL2 = useGLTF(
    "/3d-assets/glb/animations/inward-slash-left-transformed.glb"
  );
  const swordR2 = useGLTF(
    "/3d-assets/glb/animations/inward-slash-right-transformed.glb"
  );
  const swordR3 = useGLTF(
    "/3d-assets/glb/animations/outward-slash-right-transformed.glb"
  );
  const swordL3 = useGLTF(
    "/3d-assets/glb/animations/outward-slash-left-transformed.glb"
  );

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
    { ...stabL.animations[0], name: SupportedAnimations.StabL },
    { ...stabR.animations[0], name: SupportedAnimations.StabR },
    { ...swordR.animations[0], name: SupportedAnimations.SwordR },
    { ...swordL.animations[0], name: SupportedAnimations.SwordL },
    { ...swordR2.animations[0], name: SupportedAnimations.SwordR2 },
    { ...swordL2.animations[0], name: SupportedAnimations.SwordL2 },
    { ...swordR3.animations[0], name: SupportedAnimations.SwordR3 },
    { ...swordL3.animations[0], name: SupportedAnimations.SwordL3 },
  ] as GLTFAction[];

  return { animationsForHook };
}

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
    mixer: result.mixer,
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
