import { waterHeight } from "@contexts/UnderwaterContext";
import { KeyboardControls, Preload } from "@react-three/drei";
import { Canvas, CanvasProps } from "@react-three/fiber";
import { PropsWithChildren } from "react";

export const surfaceLevel = waterHeight;
export const farUnderwater = 50;
export const farOverwater = 100;

export const KeyboardControlsProvider = ({ children }: PropsWithChildren) => {
  const chars = "abcdefghijklmnopqrstuvwxyz".split("");
  const numbers = "0123456789".split("");
  const bigChars = chars.map((c) => c.toUpperCase());
  const allChars = [...chars, ...bigChars];
  // const allKeys = allChars.map((c) => `Key${c}`);
  const maps = allChars.map((c) => ({
    name: c,
    keys: [c.toLowerCase(), c.toUpperCase()],
  }));

  const keyMaps = [
    { name: "forward", keys: ["ArrowUp", "w", "W"] },
    { name: "backward", keys: ["ArrowDown", "s", "S"] },
    { name: "left", keys: ["ArrowLeft", "a", "A"] },
    { name: "right", keys: ["ArrowRight", "d", "D"] },
    { name: "jump", keys: ["Space"] },
    { name: "descend", keys: ["c", "C"] },
    { name: "sprint", keys: ["Shift"] },
    { name: "attack", keys: ["F", "f"] },
    ...maps,
  ];
  console.log(keyMaps);

  return <KeyboardControls map={keyMaps}>{children}</KeyboardControls>;
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
