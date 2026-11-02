import { Meta } from "@components/Meta";
import { ImmersiveNavbar } from "@components/Navbar/ImmersiveNavbar";
import { OpenGraph } from "@components/OpenGraph";
import { nav } from "@r3f/ChunkGenerationSystem/config";
import { KeyboardControlsProvider } from "@r3f/Controllers/KeyboardControls";
import { CameraPositionLogger } from "@r3f/Helpers/CameraPositionLogger";
import { Loader } from "@r3f/Helpers/Loader";
import { Canvas, type CanvasProps } from "@react-three/fiber";
import { type PropsWithChildren, Suspense, useCallback, useEffect, useState } from "react";
import { toTitleCase } from "src/lib/utils/toTitleCase";
import tunnel from "tunnel-rat";

type SeoProps = {
  description: string;
  title: string;
  url: string;
  keywords: string[];
  /** Cover image for the share card. Omit to fall back to the site-wide default. */
  image?: string;
  imageAlt?: string;
};

export const { In, Out } = tunnel();

export const SeoInfo = ({ description, title, url, image, keywords, imageAlt }: SeoProps) => {
  const properTitle = toTitleCase(title);

  return (
    <>
      {/* The demo pages are pure canvases, so this is their only (screen-reader only) h1. */}
      <h1 className="sr-only">{properTitle}</h1>
      <Meta description={description} title={properTitle} url={url} keywords={keywords} />
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
      {nav && <ImmersiveNavbar />}
      <main className="w-full h-screen overscoll-none">
        <SeoInfo {...seoInfo} />
        <Out />
        <SceneWithLoadingState {...sceneWithLoadingStateProps}>{children}</SceneWithLoadingState>
      </main>
    </>
  );
};

interface SceneLoaderProps extends PropsWithChildren<CanvasProps> {
  withKeyboardControls?: boolean;
}

// Sits in the scene's Suspense boundary, so it only mounts once the scene's code
// and suspended assets are in.
const OnSceneMounted = ({ callback }: { callback: () => void }) => {
  useEffect(callback, [callback]);
  return null;
};

export const SceneWithLoadingState = ({
  children,
  withKeyboardControls = true,
  ...props
}: SceneLoaderProps) => {
  const [sceneMounted, setSceneMounted] = useState(false);
  const onSceneMounted = useCallback(() => setSceneMounted(true), []);

  const CanvasContent = (
    <>
      <Canvas {...props} className="overscroll-none">
        <Suspense fallback={null}>
          {children}
          <CameraPositionLogger />
          <OnSceneMounted callback={onSceneMounted} />
        </Suspense>
      </Canvas>
      {/* r3f-perf removed: enable by dynamically importing when perf flag is true */}
    </>
  );

  return (
    <>
      <Loader sceneMounted={sceneMounted} />
      {withKeyboardControls ? (
        <KeyboardControlsProvider>{CanvasContent}</KeyboardControlsProvider>
      ) : (
        CanvasContent
      )}
    </>
  );
};
