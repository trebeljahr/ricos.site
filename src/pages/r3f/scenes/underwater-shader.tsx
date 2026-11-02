import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { UnderwaterContextProvider } from "@contexts/UnderwaterContext";
import { lazy } from "react";
import { getSeoInfo, type SeoInfo } from "src/lib/getSeoInfo";

const UnderwaterShaderDemo = lazy(
  () => import("src/canvas/Scenes/UnderwaterShader/UnderwaterShaderDemo"),
);

const defaultSeoInfo = {
  title: "Underwater Shader",
  description:
    "A reusable underwater background shader with caustics, god rays, depth fog, and smooth water surface transitions",
  url: "/r3f/scenes/underwater-shader",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "shader",
    "underwater",
    "caustics",
    "god rays",
    "webgl",
    "postprocessing",
  ],
  image: "/assets/pages/ocean.png",
  imageAlt: "Underwater scene with caustics and god rays",
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
    <ThreeFiberLayout seoInfo={seoInfo}>
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
