import { usePrevious } from "@hooks/usePrevious";
import { useKeyboardControls } from "@react-three/drei";
import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { AnimationAction, LoopOnce, LoopRepeat } from "three";

const fadeDuration = 0.5;
export type ActionStore = Record<string, AnimationAction | null>;

export const useGenericAnimationController = ({
  actions,
  fadeDuration = 0.5,
}: {
  actions: ActionStore;
  fadeDuration?: number;
}) => {
  const actionNames = Object.keys(actions);
  const defaultAction =
    actionNames.find((name) => name.toLowerCase().includes("idle")) ||
    actionNames.find((name) => name.toLowerCase().includes("walk")) ||
    actionNames.find((name) => name.toLowerCase().includes("flying")) ||
    actionNames.find((name) => name.toLowerCase().includes("forward")) ||
    actionNames.find((name) => name.toLowerCase().includes("normal")) ||
    actionNames[0];

  const animationName = defaultAction;

  const previous = useRef(animationName);

  const updateAnimation = (
    newAnimation: string,
    {
      looping = false,
      fade = fadeDuration,
    }: { looping?: boolean; fade?: number } = {}
  ) => {
    const current = actions[previous.current];
    const toPlay = actions[newAnimation];

    previous.current = newAnimation;

    current?.fadeOut(fade);

    if (!toPlay) return;

    toPlay.reset().fadeIn(fade).play();
    toPlay.setLoop(looping ? LoopRepeat : LoopOnce, looping ? Infinity : 1);
    toPlay.clampWhenFinished = true;
  };

  updateAnimation(animationName, { looping: true });

  return { updateAnimation };
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
  }, [animation, actions]);

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
