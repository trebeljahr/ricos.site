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
  const characterMeshRef = useRef<Mesh>(null!);
  const characterModelFbx = useFBX("/3d-assets/fbx/character/Punk.fbx");
  const characterModel = useGLTF("/3d-assets/glb/xbot.glb");

  console.log(characterModel);
  console.log(characterModelFbx);

  const running = useFBX("/3d-assets/fbx/animations/running.fbx");
  const idle = useFBX("/3d-assets/fbx/animations/idle.fbx");
  const jump = useFBX("/3d-assets/fbx/animations/jump.fbx");
  const dance = useFBX("/3d-assets/fbx/animations/dance.fbx");
  const walking = useFBX("/3d-assets/fbx/animations/walking.fbx");
  const breakdance = useFBX("/3d-assets/fbx/animations/breakdance.fbx");
  const yawning = useFBX("/3d-assets/fbx/animations/yawning.fbx");
  const angry = useFBX("/3d-assets/fbx/animations/angry.fbx");
  const bow = useFBX("/3d-assets/fbx/animations/bow.fbx");
  const crawl = useFBX("/3d-assets/fbx/animations/crawl.fbx");
  const death = useFBX("/3d-assets/fbx/animations/death.fbx");
  const happyJump = useFBX("/3d-assets/fbx/animations/happy-jump.fbx");
  const jumpingUp = useFBX("/3d-assets/fbx/animations/jumping-up.fbx");
  const kickLeft = useFBX("/3d-assets/fbx/animations/kick-left.fbx");
  const kickRight = useFBX("/3d-assets/fbx/animations/kick-right.fbx");
  const martelo = useFBX("/3d-assets/fbx/animations/martelo.fbx");
  const paddle = useFBX("/3d-assets/fbx/animations/paddle.fbx");
  const pickUpLeft = useFBX("/3d-assets/fbx/animations/picking-up-left.fbx");
  const pickUpRight = useFBX("/3d-assets/fbx/animations/picking-up-right.fbx");
  const punchLeft = useFBX("/3d-assets/fbx/animations/punch-left.fbx");
  const punchRight = useFBX("/3d-assets/fbx/animations/punch-right.fbx");
  const salute = useFBX("/3d-assets/fbx/animations/salute.fbx");
  const shrug = useFBX("/3d-assets/fbx/animations/shrug.fbx");
  const sillyDance = useFBX("/3d-assets/fbx/animations/silly-dance.fbx");
  const swim = useFBX("/3d-assets/fbx/animations/swim.fbx");
  const threatGesture = useFBX("/3d-assets/fbx/animations/threat-gesture.fbx");
  const wave = useFBX("/3d-assets/fbx/animations/wave.fbx");

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
  }, []);

  return <primitive object={characterModel.scene} ref={characterMeshRef} />;
}
