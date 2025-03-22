import { usePrevious } from "@hooks/usePrevious";
import { useKeyboardControls } from "@react-three/drei";
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
};

export type AnimationState = {
  name: string;
  isPlaying: boolean;
  isFinished: boolean;
  timeElapsed: number;
  totalDuration: number;
  progress: number; // 0 to 1
};

export const useGenericAnimationController = ({
  actions,
  mixer,
  defaultFadeDuration = 0.5,
}: {
  actions: ActionStore;
  mixer: AnimationMixer;
  defaultFadeDuration?: number;
}) => {
  const previous = useRef("idle");
  const [currentState, setCurrentState] = useState<AnimationState>({
    name: "idle",
    isPlaying: false,
    isFinished: false,
    timeElapsed: 0,
    totalDuration: 0,
    progress: 0,
  });

  // Track mixed in animations separately
  const mixedAnimationRef = useRef<{
    name: string;
    action: AnimationAction;
    startTime: number;
    isPlaying: boolean;
    isFinished: boolean;
  } | null>(null);

  // Setup animation finished callback

  // Update animation state on each frame
  // useEffect(() => {
  //   let frameId: number;
  //   const updateAnimationState = () => {
  //     const currentAction = actions[previous.current];

  //     if (currentAction) {
  //       const totalDuration = currentAction.getClip().duration;
  //       const timeElapsed = currentAction.time;
  //       const progress = timeElapsed / totalDuration;

  //       setCurrentState({
  //         name: previous.current,
  //         isPlaying: currentAction.isRunning(),
  //         isFinished: !currentAction.isRunning() && progress >= 0.99,
  //         timeElapsed,
  //         totalDuration,
  //         progress,
  //       });
  //     }

  //     frameId = requestAnimationFrame(updateAnimationState);
  //   };

  //   frameId = requestAnimationFrame(updateAnimationState);
  //   return () => cancelAnimationFrame(frameId);
  // }, [actions]);

  const updateAnimation = (
    newAnimation: string,
    {
      looping = false,
      fade = defaultFadeDuration,
      clampWhenFinished = true,
    }: AnimationOptions = {}
  ) => {
    if (newAnimation === previous.current) return;

    // console.log(`Playing animation: ${newAnimation}`);

    const current = actions[previous.current];
    const toPlay = actions[newAnimation];

    previous.current = newAnimation;
    current?.fadeOut(fade);

    if (!toPlay) return;

    toPlay.reset().fadeIn(fade).play();
    toPlay.weight = 1;
    toPlay.setLoop(looping ? LoopRepeat : LoopOnce, looping ? Infinity : 1);
    toPlay.clampWhenFinished = clampWhenFinished;

    // Reset finished state when starting a new animation
    // setCurrentState((prev) => ({
    //   ...prev,
    //   name: newAnimation,
    //   isPlaying: true,
    //   isFinished: false,
    //   timeElapsed: 0,
    //   totalDuration: toPlay.getClip().duration,
    //   progress: 0,
    // }));
  };

  const mixInAnimation = (animation: string) => {
    // if (
    //   mixedAnimationRef.current &&
    //   mixedAnimationRef.current.isPlaying &&
    //   !mixedAnimationRef.current.isFinished
    // ) {
    //   console.log(
    //     `Skipping mix-in of ${animation} because ${mixedAnimationRef.current.name} is still playing`
    //   );
    //   return false; // Return false to indicate the animation wasn't mixed in
    // }

    const current = actions[previous.current];
    const toPlay = actions[animation];

    if (!toPlay || current === toPlay) return false;

    // Configure and play the mixed-in animation
    toPlay.weight = 2;
    toPlay.setLoop(LoopOnce, 1);
    toPlay.reset().fadeIn(0.2).play();

    // Update the mixed animation reference
    mixedAnimationRef.current = {
      name: animation,
      action: toPlay,
      startTime: Date.now(),
      isPlaying: true,
      isFinished: false,
    };

    return true; // Return true to indicate the animation was successfully mixed in
  };

  // Get information about the current mixed animation
  const getMixedAnimationState = () => {
    if (!mixedAnimationRef.current) {
      return null;
    }

    const { name, action, startTime, isPlaying, isFinished } =
      mixedAnimationRef.current;
    const totalDuration = action.getClip().duration;
    const timeElapsed = action.time;
    const progress = timeElapsed / totalDuration;

    return {
      name,
      isPlaying,
      isFinished,
      startTime,
      timeElapsed,
      totalDuration,
      progress,
      timeSinceStart: Date.now() - startTime,
    };
  };

  useEffect(() => {
    type MixerListener = EventListener<Event, "finished", AnimationMixer>;
    type MixerListenerStarted = EventListener<Event, "started", AnimationMixer>;

    const listener: MixerListener = (e) => {
      console.log(e);
    };
    const listenerStart: MixerListenerStarted = (e) => {
      console.log(e);
    };

    mixer.addEventListener("finished", listener);
    mixer.addEventListener("started", listenerStart);

    return () => {
      mixer.removeEventListener("finished", listener);
      mixer.removeEventListener("started", listenerStart);
    };
  }, [actions, mixer]);

  return {
    updateAnimation,
    mixInAnimation,
    currentAnimationState: currentState,
    getMixedAnimationState,
    isAnyMixedAnimationPlaying: () =>
      mixedAnimationRef.current?.isPlaying || false,
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
