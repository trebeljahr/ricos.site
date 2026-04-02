import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { UnderwaterContextProvider } from "@contexts/UnderwaterContext";
import dynamic from "next/dynamic";
import { getSeoInfo, SeoInfo } from "src/lib/getSeoInfo";

const UnderwaterShaderDemo = dynamic(
  () => import("src/canvas/Scenes/UnderwaterShader/UnderwaterShaderDemo"),
  { ssr: false }
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
