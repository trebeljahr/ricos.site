import { useKeyboardInput } from "@hooks/useKeyboardInput";
import { useAnimations, useFBX, useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect, useRef } from "react";
import { type AnimationClip, Mesh } from "three";
import { useGenericAnimationController } from "./canvas/Controllers/GenericAnimationController";

interface GLTFAction extends AnimationClip {
  name: string;
}

export default function Character() {
  const { characterName } = useControls({
    characterName: {
      value: "x-bot",
      label: "Character Name",
      options: [
        "arissa",
        "ely",
        "jaime", // not working for now
        "michelle",
        "ninja",
        "pirate", // some coordinate issues
        "punk",
        "wildling",
        "worker", // not working for now
        "x-bot",
        "y-bot",
      ],
    },
  });

  const characterMeshRef = useRef<Mesh>(null!);
  const characterModel = useGLTF(
    `/3d-assets/glb/characters/${characterName}.glb`
  );
  
  // const characterModelGlb = useGLTF("/3d-assets/glb/xbot.glb");

  // console.log(characterModelGlb);
  console.log(characterModel);

  const running = useGLTF("/3d-assets/glb/animations/running.glb");
  const idle = useGLTF("/3d-assets/glb/animations/idle.glb");
  const jump = useGLTF("/3d-assets/glb/animations/jump.glb");
  const dance = useGLTF("/3d-assets/glb/animations/dance.glb");
  const walking = useGLTF("/3d-assets/glb/animations/walking.glb");
  const breakdance = useGLTF("/3d-assets/glb/animations/breakdance.glb");
  const yawning = useGLTF("/3d-assets/glb/animations/yawning.glb");
  const angry = useGLTF("/3d-assets/glb/animations/angry.glb");
  const bow = useGLTF("/3d-assets/glb/animations/bow.glb");
  const crawl = useGLTF("/3d-assets/glb/animations/crawl.glb");
  const death = useGLTF("/3d-assets/glb/animations/death.glb");
  const happyJump = useGLTF("/3d-assets/glb/animations/happy-jump.glb");
  const jumpingUp = useGLTF("/3d-assets/glb/animations/jumping-up.glb");
  const kickLeft = useGLTF("/3d-assets/glb/animations/kick-left.glb");
  const kickRight = useGLTF("/3d-assets/glb/animations/kick-right.glb");
  const martelo = useGLTF("/3d-assets/glb/animations/martelo.glb");
  const paddle = useGLTF("/3d-assets/glb/animations/paddle.glb");
  const pickUpLeft = useGLTF("/3d-assets/glb/animations/picking-up-left.glb");
  const pickUpRight = useGLTF("/3d-assets/glb/animations/picking-up-right.glb");
  const punchLeft = useGLTF("/3d-assets/glb/animations/punch-left.glb");
  const punchRight = useGLTF("/3d-assets/glb/animations/punch-right.glb");
  const salute = useGLTF("/3d-assets/glb/animations/salute.glb");
  const shrug = useGLTF("/3d-assets/glb/animations/shrug.glb");
  const sillyDance = useGLTF("/3d-assets/glb/animations/silly-dance.glb");
  const swim = useGLTF("/3d-assets/glb/animations/swim.glb");
  const threatGesture = useGLTF("/3d-assets/glb/animations/threat-gesture.glb");
  const wave = useGLTF("/3d-assets/glb/animations/wave.glb");

  console.log(running, characterModel);

  const animationsForHook = [
    { ...idle.animations[0], name: "idle" },
    { ...walking.animations[0], name: "walking" },
    { ...running.animations[0], name: "running" },
    { ...dance.animations[0], name: "dance" },
    { ...breakdance.animations[0], name: "breakdance" },
    { ...jump.animations[0], name: "jump" },
    { ...yawning.animations[0], name: "yawning" },
    { ...angry.animations[0], name: "angry" },
    { ...bow.animations[0], name: "bow" },
    { ...crawl.animations[0], name: "crawl" },
    { ...death.animations[0], name: "death" },
    { ...happyJump.animations[0], name: "happyJump" },
    { ...jumpingUp.animations[0], name: "jumpingUp" },
    { ...kickLeft.animations[0], name: "kickLeft" },
    { ...kickRight.animations[0], name: "kickRight" },
    { ...martelo.animations[0], name: "martelo" },
    { ...paddle.animations[0], name: "paddle" },
    { ...pickUpLeft.animations[0], name: "pickingUpLeft" },
    { ...pickUpRight.animations[0], name: "pickingUpRight" },
    { ...punchLeft.animations[0], name: "punchLeft" },
    { ...punchRight.animations[0], name: "punchRight" },
    { ...salute.animations[0], name: "salute" },
    { ...shrug.animations[0], name: "shrug" },
    { ...sillyDance.animations[0], name: "sillyDance" },
    { ...swim.animations[0], name: "swim" },
    { ...threatGesture.animations[0], name: "threatGesture" },
    { ...wave.animations[0], name: "wave" },
  ] as GLTFAction[];

  const result = useAnimations(animationsForHook, characterModel.scene);

  useEffect(() => {
    const listener = () => {
      updateAnimation("idle", { looping: true });
    };

    result.mixer.addEventListener("finished", listener);

    return () => {
      result.mixer.removeEventListener("finished", listener);
    };
  }, []);

  const { updateAnimation } = useGenericAnimationController({
    actions: result.actions,
  });

  useControls(
    {
      animation: {
        options: animationsForHook.map((animation) => animation.name),
        value: "idle",
        onChange: (value: string) => {
          updateAnimation(value);
        },
      },
    },
    {
      collapsed: true,
    }
  );

  useKeyboardInput(({ key }) => {
    animationsForHook.forEach((_, index) => {
      if (key === `${index + 1}`) {
        updateAnimation(animationsForHook[index].name);
      }
    });
  });

  const { scene } = useThree();

  useEffect(() => {
    const mesh = characterMeshRef.current;
    // console.log(mesh);

    scene.traverse((child: any) => {
      if (child.material) {
        // console.log(child.material);
        // child.material.metalness = 0.5;
        // child.material.
      }
    });
  }, [scene]);

  return <primitive object={characterModel.scene} ref={characterMeshRef} />;
}
