import { Meta } from "@components/Meta";
import { OpenGraph } from "@components/OpenGraph";
import { nav, perf } from "@r3f/ChunkGenerationSystem/config";
import { KeyboardControlsProvider } from "@r3f/Controllers/KeyboardControls";
import { Preload } from "@react-three/drei";
import { Canvas, CanvasProps } from "@react-three/fiber";
import dynamic from "next/dynamic";
import { Perf } from "r3f-perf";
import { PropsWithChildren, Suspense } from "react";
import { toTitleCase } from "src/lib/utils/toTitleCase";
import tunnel from "tunnel-rat";
import { NavbarR3F } from "./NavbarR3F";
import { CameraPositionLogger } from "@r3f/Helpers/CameraPositionLogger";

type SeoProps = {
  description: string;
  title: string;
  url: string;
  keywords: string[];
  image: string;
  imageAlt: string;
};

export const { In, Out } = tunnel();

export const SeoInfo = ({
  description,
  title,
  url,
  image,
  keywords,
  imageAlt,
}: SeoProps) => {
  const properTitle = toTitleCase(title) + " | Rico's R3F Playground";

  return (
    <>
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
    </>
  );
};
export const ThreeFiberLayout = ({
  children,
  seoInfo,
  ...sceneWithLoadingStateProps
}: SceneLoaderProps & { seoInfo: SeoProps }) => {
  return (
    <>
      <SeoInfo {...seoInfo} />
      {nav && <NavbarR3F />}
      <div className="w-full h-screen overscoll-none">
        <Out />
        <SceneWithLoadingState {...sceneWithLoadingStateProps}>
          {children}
        </SceneWithLoadingState>
      </div>
    </>
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
    <>
      <Canvas {...props} className="overscroll-none">
        <Suspense fallback={null}>
          {children}
          <Preload all />
          <CameraPositionLogger />
        </Suspense>
      </Canvas>
      {perf && <Perf position="bottom-right" />}
    </>
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
