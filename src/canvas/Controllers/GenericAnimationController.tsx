import { usePrevious } from "@hooks/usePrevious";
import { SupportedAnimations } from "@r3f/Characters/CharacterWithAnimations";
import { useKeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { animations, mix } from "framer-motion";
import { PropsWithChildren, useEffect, useRef, useState } from "react";
import {
  AnimationAction,
  AnimationMixer,
  Event,
  EventListener,
  LoopOnce,
  LoopRepeat,
} from "three";

const fadeDuration = 0.5;
export type ActionStore = Record<string, AnimationAction | null>;

export type AnimationOptions = {
  looping?: boolean;
  fade?: number;
  clampWhenFinished?: boolean;
  force?: boolean;
};

export type AnimationState = {
  name: string;
  isPlaying: boolean;
  isFinished: boolean;
  timeElapsed: number;
  totalDuration: number;
  progress: number;
  isMixedIn: boolean;
  isCrossFading: boolean;
};

export const useGenericAnimationController = ({
  actions,
  defaultFadeDuration = 0.5,
  defaultAnimation = SupportedAnimations.Idle,
  mixer,
}: {
  actions: ActionStore;
  mixer: AnimationMixer;
  defaultFadeDuration?: number;
  defaultAnimation?: string;
}) => {
  const previous = useRef(defaultAnimation);
  const previousMixedIn = useRef<string>(null!);
  const animationState = useRef<AnimationState>({
    name: defaultAnimation,
    isPlaying: false,
    isFinished: false,
    timeElapsed: 0,
    totalDuration: 0,
    progress: 0,
    isMixedIn: false,
    isCrossFading: false,
  });
  const mixedInAnimationState = useRef<AnimationState>({
    name: "",
    isPlaying: false,
    isFinished: false,
    timeElapsed: 0,
    totalDuration: 0,
    progress: 0,
    isMixedIn: true,
    isCrossFading: false,
  });

  useFrame(() => {
    const currentAction = actions[previous.current];

    if (currentAction) {
      const totalDuration = currentAction.getClip().duration;
      const timeElapsed = currentAction.time;
      const progress = timeElapsed / totalDuration;
      animationState.current = {
        name: previous.current,
        isPlaying: currentAction.isRunning(),
        isFinished: !currentAction.isRunning() && progress >= 0.99,
        timeElapsed,
        totalDuration,
        progress,
        isMixedIn: animationState.current.isMixedIn,
        isCrossFading: animationState.current.isCrossFading,
      };
    }

    const currentMixedIn = actions[previousMixedIn.current];
    if (currentMixedIn) {
      const totalDuration = currentMixedIn.getClip().duration;
      const timeElapsed = currentMixedIn.time;
      const progress = timeElapsed / totalDuration;
      mixedInAnimationState.current = {
        name: previousMixedIn.current,
        isPlaying: currentMixedIn.isRunning(),
        isFinished: !currentMixedIn.isRunning() && progress >= 0.99,
        timeElapsed,
        totalDuration,
        progress,
        isMixedIn: true,
        isCrossFading: mixedInAnimationState.current.isCrossFading,
      };

      if (progress >= 0.7 && !mixedInAnimationState.current.isCrossFading) {
        const animationBefore = actions[previous.current];

        if (animationBefore) {
          currentMixedIn.fadeOut(0.2);
          animationBefore.reset().fadeIn(0.2).play();
          animationBefore.loop = LoopRepeat;
          animationBefore.setLoop(LoopRepeat, Infinity);
          mixedInAnimationState.current.isCrossFading = true;
        }
      }
    }
  });

  useEffect(() => {
    type MixerListener = EventListener<Event, "finished", AnimationMixer>;

    const listener: MixerListener = (e) => {
      const name = e.action._clip.name;

      if (previousMixedIn.current === name) {
        previousMixedIn.current = "";
        mixedInAnimationState.current = {
          name: "",
          isPlaying: false,
          isFinished: false,
          timeElapsed: 0,
          totalDuration: 0,
          progress: 0,
          isMixedIn: true,
          isCrossFading: false,
        };
      }
    };

    mixer.addEventListener("finished", listener);

    return () => {
      mixer.removeEventListener("finished", listener);
    };
  }, [actions, mixer]);

  const updateAnimation = (
    newAnimation: string,
    {
      looping = false,
      fade = defaultFadeDuration,
      clampWhenFinished = true,
      force = false,
    }: AnimationOptions = {}
  ) => {
    if (newAnimation === previous.current && !force) return;

    const current = actions[previous.current];
    const toPlay = actions[newAnimation];

    previous.current = newAnimation;
    current?.fadeOut(fade);

    if (!toPlay) return;

    toPlay.reset().fadeIn(fade).play();
    toPlay.weight = 1;
    toPlay.setLoop(looping ? LoopRepeat : LoopOnce, looping ? Infinity : 1);
    toPlay.clampWhenFinished = clampWhenFinished;

    animationState.current = {
      name: newAnimation,
      isPlaying: true,
      isFinished: false,
      timeElapsed: 0,
      totalDuration: toPlay.getClip().duration,
      progress: 0,
      isMixedIn: false,
      isCrossFading: false,
    };
  };

  const mixInAnimation = (animation: string) => {
    const current = actions[previous.current];
    const toPlay = actions[animation];

    if (!toPlay) return false;

    previousMixedIn.current = animation;
    mixedInAnimationState.current = {
      name: animation,
      isPlaying: true,
      isFinished: false,
      timeElapsed: 0,
      totalDuration: toPlay.getClip().duration,
      progress: 0,
      isMixedIn: true,
      isCrossFading: false,
    };

    toPlay.timeScale = 1.4;
    toPlay.setLoop(LoopOnce, 1);

    current?.fadeOut(0.2);
    toPlay.reset().fadeIn(0.2).play();
    return true;
  };

  return {
    updateAnimation,
    mixInAnimation,
    animationState,
    mixedInAnimationState,
  };
};

export const GenericAnimationController = ({
  actions,
  animation,
  children,
}: PropsWithChildren<{
  actions: ActionStore;
  animation?: string;
}>) => {
  const actionNames = Object.keys(actions);
  const defaultAction =
    actionNames.find((name) => name.toLowerCase().includes("idle")) ||
    actionNames.find((name) => name.toLowerCase().includes("walk")) ||
    actionNames.find((name) => name.toLowerCase().includes("flying")) ||
    actionNames.find((name) => name.toLowerCase().includes("forward")) ||
    actionNames.find((name) => name.toLowerCase().includes("normal")) ||
    actionNames[0];

  const animationName = animation || defaultAction;

  useEffect(() => {
    actions[animationName]?.reset().fadeIn(fadeDuration).play();
    return () => {
      actions[animationName]?.fadeOut(fadeDuration);
    };
  }, [animation, actions, animationName]);

  return <>{children}</>;
};

export function TrexAnimationController({ actions }: { actions: ActionStore }) {
  const [state, setState] = useState<string>("Armature|TRex_Idle");
  const previousState = usePrevious(state);

  const [subscribe] = useKeyboardControls();

  useEffect(() => {
    subscribe((state) => {
      if (!actions) return;
      const { attack, jump, forward, backward, leftward, rightward } = state;
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
      if (forward || backward || leftward || rightward) {
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
