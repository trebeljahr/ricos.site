import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { UnderwaterContextProvider } from "@contexts/UnderwaterContext";
import { lazy } from "react";
import { getSeoInfo, type SeoInfo } from "src/lib/getSeoInfo";

const UnderwaterShaderDemo = lazy(
  () => import("src/canvas/Scenes/UnderwaterShader/UnderwaterShaderDemo"),
);

const defaultSeoInfo = {
  title: "Ocean & Underwater Shader",
  description:
    "Interactive first-person ocean and underwater shader with volumetric god rays, Snell's window, Gerstner waves, Beer-Lambert depth absorption, chromatic caustics, and waterline meniscus",
  url: "/r3f/scenes/underwater-shader",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "shader",
    "underwater",
    "ocean",
    "caustics",
    "god rays",
    "snells window",
    "beer-lambert",
    "webgl",
    "postprocessing",
  ],
  image: "/assets/pages/ocean.png",
  imageAlt: "Underwater coral reef scene with volumetric god rays, caustics, and Snell's window",
};

export default function Page({ seo }: { seo: SeoInfo | null }) {
  const seoInfo = {
    ...defaultSeoInfo,
    ...(seo && {
      title: seo.metaTitle,
      description: seo.metaDescription,
      image: seo.ogImage,
      imageAlt: seo.ogImageAlt,
      keywords: seo.keywords,
    }),
  };

  return (
    <ThreeFiberLayout
      seoInfo={seoInfo}
      shadows
      camera={{ fov: 62, near: 0.1, far: 800, position: [-6, 35.5, 20] }}
    >
      <UnderwaterContextProvider>
        <UnderwaterShaderDemo />
      </UnderwaterContextProvider>
    </ThreeFiberLayout>
  );
}

export async function getStaticProps() {
  return {
    props: {
      seo: getSeoInfo("/r3f/scenes/underwater-shader"),
    },
  };
}
