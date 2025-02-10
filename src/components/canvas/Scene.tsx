import { waterHeight } from "@contexts/UnderwaterContext";
import { KeyboardControls, Preload } from "@react-three/drei";
import { Canvas, CanvasProps } from "@react-three/fiber";
import { PropsWithChildren } from "react";

export const surfaceLevel = waterHeight;
export const farUnderwater = 50;
export const farOverwater = 100;

export function CanvasWithControls({
  children,
  ...props
}: PropsWithChildren<CanvasProps>) {
  return (
    <KeyboardControls
      map={[
        { name: "forward", keys: ["ArrowUp", "w", "W"] },
        { name: "backward", keys: ["ArrowDown", "s", "S"] },
        { name: "left", keys: ["ArrowLeft", "a", "A"] },
        { name: "right", keys: ["ArrowRight", "d", "D"] },
        { name: "jump", keys: ["Space"] },
        { name: "descend", keys: ["c", "C"] },
        { name: "sprint", keys: ["Shift"] },
        { name: "attack", keys: ["F", "f"] },
      ]}
    >
      <Canvas {...props} gl={{ logarithmicDepthBuffer: true }}>
        <ambientLight />
        {children}
        <Preload all />
      </Canvas>
    </KeyboardControls>
  );
}
