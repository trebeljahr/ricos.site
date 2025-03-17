import { useAnimations, useGLTF, useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { type AnimationClip, Mesh } from "three";
import { useGenericAnimationController } from "../Controllers/GenericAnimationController";

interface GLTFAction extends AnimationClip {
  name: string;
}

export default function CharacterWithAnimations({
  characterName,
}: {
  characterName: string;
}) {
  const characterMeshRef = useRef<Mesh>(null!);
  const characterModel = useGLTF(
    `/3d-assets/glb/characters/${characterName}-transformed-transformed.glb`
  );

  const running = useGLTF("/3d-assets/glb/animations/running-transformed.glb");
  const idle = useGLTF("/3d-assets/glb/animations/idle-transformed.glb");
  const jump = useGLTF("/3d-assets/glb/animations/jump-transformed.glb");
  const dance = useGLTF("/3d-assets/glb/animations/dance-transformed.glb");
  const walking = useGLTF("/3d-assets/glb/animations/walking-transformed.glb");
  const death = useGLTF("/3d-assets/glb/animations/death-transformed.glb");
  const jumpingUp = useGLTF(
    "/3d-assets/glb/animations/jumping-up-transformed.glb"
  );
  const swim = useGLTF("/3d-assets/glb/animations/swim-transformed.glb");
  const wave = useGLTF("/3d-assets/glb/animations/wave-transformed.glb");

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
    const {
      forward,
      backward,
      leftward: strafeLeft,
      rightward: strafeRight,
      run: boost,
    } = get();

    if (forward || backward || strafeLeft || strafeRight) {
      if (boost) {
        updateAnimation("running", { looping: true });
      } else {
        updateAnimation("walking", { looping: true });
      }
    } else {
      updateAnimation("idle", { looping: true });
    }
  });

  return <primitive object={characterModel.scene} ref={characterMeshRef} />;
}
