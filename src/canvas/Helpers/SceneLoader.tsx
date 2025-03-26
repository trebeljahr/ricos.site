import { PropsWithChildren, Suspense } from "react";
import { Canvas, CanvasProps } from "@react-three/fiber";
import {
  KeyboardControlsProvider,
  keymap,
} from "../Controllers/KeyboardControls";
import dynamic from "next/dynamic";
import { Preload } from "@react-three/drei";

// Dynamically import the Loader component
const Loader = dynamic(() => import("./Loader"), { ssr: false });

interface SceneLoaderProps extends PropsWithChildren<CanvasProps> {
  withKeyboardControls?: boolean;
}

export const SceneLoader = ({
  children,
  withKeyboardControls = true,
  ...props
}: SceneLoaderProps) => {
  // Create the Canvas content with or without keyboard controls
  const CanvasContent = (
    <Canvas {...props} gl={{ logarithmicDepthBuffer: true }}>
      <Suspense fallback={null}>
        <ambientLight />
        {children}
        <Preload all />
      </Suspense>
    </Canvas>
  );

  return (
    <>
      <Loader />
      {withKeyboardControls ? (
        <KeyboardControlsProvider>{CanvasContent}</KeyboardControlsProvider>
      ) : (
        CanvasContent
      )}
    </>
  );
};

export const SceneWithLoadingState = ({
  children,
  withKeyboardControls = true,
  ...props
}: PropsWithChildren<CanvasProps & { withKeyboardControls?: boolean }>) => {
  return (
    <SceneLoader withKeyboardControls={withKeyboardControls} {...props}>
      {children}
    </SceneLoader>
  );
};

export default SceneLoader;
