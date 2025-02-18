import {
  Object3D,
  AnimationClip,
  AnimationAction,
  AnimationMixer,
} from "three";
import { useFrame } from "@react-three/fiber";
import {
  ForwardedRef,
  MutableRefObject,
  Ref,
  useEffect,
  useRef,
  useState,
} from "react";

type ActionStore = Record<string, AnimationAction | null>;

type Api<T extends AnimationClip> = {
  clips: AnimationClip[];
  mixer: AnimationMixer;
  names: T["name"][];
  actions: ActionStore;
};

export function useAnimationsWithCleanup<T extends AnimationClip>(
  clips: T[],
  root: Object3D
): Api<T> {
  const [mixer] = useState(
    () => new AnimationMixer(undefined as unknown as Object3D)
  );

  const lazyActions = useRef<ActionStore>();
  const [api] = useState(() => {
    const actions = {} as ActionStore;
    clips.forEach((clip) =>
      Object.defineProperty(actions, clip.name, {
        enumerable: true,
        get() {
          if (!lazyActions.current) return null;
          return (
            lazyActions.current[clip.name] ||
            (lazyActions.current[clip.name] = mixer.clipAction(clip, root))
          );
        },
      })
    );
    return {
      root,
      clips,
      actions,
      names: clips.map((c) => c.name),
      mixer,
    };
  });

  useFrame((_, delta) => mixer.update(delta));

  useEffect(() => {
    const currentRoot = root;
    return () => {
      Object.values(api.actions).forEach((action) => {
        if (currentRoot) {
          mixer.uncacheAction(action as unknown as AnimationClip, currentRoot);
        }
      });
      lazyActions.current = {};
    };
  }, [clips]);

  useEffect(() => {
    return () => {
      mixer.stopAllAction();
    };
  }, [mixer]);

  return api;
}
