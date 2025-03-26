import { Preload } from "@react-three/drei";
import { Canvas, CanvasProps } from "@react-three/fiber";
import dynamic from "next/dynamic";
import { PropsWithChildren, Suspense } from "react";
import { KeyboardControlsProvider } from "../Controllers/KeyboardControls";

const Loader = dynamic(() => import("./Loader"), { ssr: false });

interface SceneLoaderProps extends PropsWithChildren<CanvasProps> {
  withKeyboardControls?: boolean;
}

export const SceneWithLoadingState = ({
  children,
  withKeyboardControls = true,
  ...props
}: SceneLoaderProps) => {
  const CanvasContent = (
    <Canvas {...props}>
      <Suspense fallback={null}>
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
