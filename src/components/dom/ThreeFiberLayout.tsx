import { PropsWithChildren, ReactNode } from "react";
import { NavbarR3F } from "./NavbarR3F";
import { nav } from "@r3f/ChunkGenerationSystem/config";
import { Meta } from "@components/Meta";
import { OpenGraph } from "@components/OpenGraph";
import { toTitleCase } from "src/lib/utils/toTitleCase";
import { Preload } from "@react-three/drei";
import { Canvas, CanvasProps } from "@react-three/fiber";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { perf } from "@r3f/ChunkGenerationSystem/config";
import { Perf } from "r3f-perf";
import { KeyboardControlsProvider } from "@r3f/Controllers/KeyboardControls";
import { s } from "velite";

type Props = {
  description: string;
  title: string;
  url: string;
  keywords: string[];
  image: string;
  imageAlt: string;
};

export const ThreeFiberLayout = ({
  children,
  description,
  title,
  url,
  image,
  keywords,
  imageAlt,
  ...sceneWithLoadingStateProps
}: SceneLoaderProps & Props) => {
  const properTitle = toTitleCase(title) + " | Rico's R3F Playground";

  return (
    <div className="overscroll-none">
      <Meta
        description={description}
        title={properTitle}
        url={url}
        keywords={keywords}
      />
      <OpenGraph
        title={properTitle}
        description={description}
        url={url}
        image={image}
        imageAlt={imageAlt}
      />
      {nav && <NavbarR3F />}
      <div className="w-full h-screen">
        <SceneWithLoadingState {...sceneWithLoadingStateProps}>
          {children}
        </SceneWithLoadingState>
      </div>
    </div>
  );
};

const Loader = dynamic(() => import("@r3f/Helpers/Loader"), {
  ssr: false,
});

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
      {perf && <Perf position="bottom-right" />}
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
