import { waterHeight } from "@contexts/UnderwaterContext";
import { KeyboardControls, Preload } from "@react-three/drei";
import { Canvas, CanvasProps } from "@react-three/fiber";
import { PropsWithChildren } from "react";

export const surfaceLevel = waterHeight;
export const farUnderwater = 50;
export const farOverwater = 100;

export const keymap = [
  { name: "forward", keys: ["ArrowUp", "w", "W", "KeyW"] },
  { name: "backward", keys: ["ArrowDown", "s", "S", "KeyS"] },
  { name: "left", keys: ["ArrowLeft", "a", "A", "KeyA"] },
  { name: "right", keys: ["ArrowRight", "d", "D", "KeyD"] },
  { name: "leftward", keys: ["ArrowLeft", "KeyA"] },
  { name: "rightward", keys: ["ArrowRight", "KeyD"] },
  { name: "jump", keys: ["Space"] },
  { name: "descend", keys: ["c", "C"] },
  { name: "sprint", keys: ["Shift"] },
  { name: "run", keys: ["Shift"] },
  { name: "attack", keys: ["F", "f"] },
];

export const KeyboardControlsProvider = ({ children }: PropsWithChildren) => {
  return <KeyboardControls map={keymap}>{children}</KeyboardControls>;
};

export function CanvasWithControls({
  children,
  ...props
}: PropsWithChildren<CanvasProps>) {
  return (
    <KeyboardControlsProvider>
      <Canvas {...props} gl={{ logarithmicDepthBuffer: true }}>
        <ambientLight />
        {children}
        <Preload all />
      </Canvas>
    </KeyboardControlsProvider>
  );
}
