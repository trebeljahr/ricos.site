import { KeyboardControls } from "@react-three/drei";
import { PropsWithChildren } from "react";

export const keymap = [
  { name: "forward", keys: ["ArrowUp", "w", "W", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "s", "S", "KeyS"] },
  { name: "leftward", keys: ["ArrowLeft", "a", "A", "KeyA"] },
  { name: "rightward", keys: ["ArrowRight", "d", "D", "KeyD"] },
  { name: "jump", keys: ["Space"] },
  { name: "descend", keys: ["c", "C"] },
  { name: "run", keys: ["Shift"] },
  { name: "attack", keys: ["F", "f"] },
];

export type SupportedControllerKeys = {
  forward: boolean;
  backward: boolean;
  leftward: boolean;
  rightward: boolean;
  jump: boolean;
  descend: boolean;
  run: boolean;
  attack: boolean;
};

export const KeyboardControlsProvider = ({ children }: PropsWithChildren) => {
  return <KeyboardControls map={keymap}>{children}</KeyboardControls>;
};
