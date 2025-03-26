import { waterHeight } from "@contexts/UnderwaterContext";
import { KeyboardControls, Preload } from "@react-three/drei";
import { Canvas, CanvasProps } from "@react-three/fiber";
import { PropsWithChildren, Suspense } from "react";
import dynamic from "next/dynamic";

// Dynamically import the Loader component
const Loader = dynamic(() => import("../Helpers/Loader"), { ssr: false });

export const surfaceLevel = waterHeight;
export const farUnderwater = 50;
export const farOverwater = 100;

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

export const KeyboardControlsProvider = ({ children }: PropsWithChildren) => {
  return <KeyboardControls map={keymap}>{children}</KeyboardControls>;
};

export const CanvasWithKeyboardInput = ({
  children,
  ...props
}: PropsWithChildren<CanvasProps>) => {
  return (
    <>
      <Loader />
      <KeyboardControlsProvider>
        <Canvas {...props} gl={{ logarithmicDepthBuffer: true }}>
          <Suspense fallback={null}>
            <ambientLight />
            {children}
            <Preload all />
          </Suspense>
        </Canvas>
      </KeyboardControlsProvider>
    </>
  );
};
