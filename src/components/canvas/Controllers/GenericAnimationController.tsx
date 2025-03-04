import { usePrevious } from "@hooks/usePrevious";
import { useKeyboardControls } from "@react-three/drei";
import { PropsWithChildren, useEffect, useState } from "react";
import { AnimationAction, LoopOnce } from "three";

const fadeDuration = 0.5;
export type ActionStore = Record<string, AnimationAction | null>;

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

export function AnimationController({ actions }: { actions: ActionStore }) {
  const [state, setState] = useState<string>("Armature|TRex_Idle");
  const previousState = usePrevious(state);

  const [subscribe] = useKeyboardControls();

  useEffect(() => {
    subscribe((state) => {
      if (!actions) return;
      const { attack, jump, forward, backward, left, right } = state;
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
      if (forward || backward || left || right) {
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
