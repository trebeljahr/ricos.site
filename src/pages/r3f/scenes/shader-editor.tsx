import { CompleteShaderEditor } from "@components/Demos/FullscreenShader";
import { NavbarR3F } from "@components/dom/NavbarR3F";
import { SeoInfo } from "@components/dom/ThreeFiberLayout";
import { type SeoInfo as SeoInfoType, getSeoInfo } from "src/lib/getSeoInfo";

const defaultSeoInfo = {
  title: "Shader Editor",
  description:
    "This is an interactive shader editor demo, similar to the implementation found at glsl-editor or shadertoy. You can edit the shader code and see the results in real-time with errors being logged to the console.",
  url: "/r3f/scenes/shader-editor",
  keywords: ["threejs", "react-three-fiber", "r3f", "3D", "programming", "graphics", "webgl"],
  image: "/assets/pages/shader-editor.png",
  imageAlt:
    "an window half split between a text editor with shader code and a rendered shader voronoi shader on the other side",
};

export default function ShaderEditorPage({ seo }: { seo: SeoInfoType | null }) {
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
    <>
      <SeoInfo {...seoInfo} />
      <NavbarR3F />
      <CompleteShaderEditor shaderName="shadertoyExample1" />
    </>
  );
}

export function getStaticProps() {
  return { props: { seo: getSeoInfo("/r3f/scenes/shader-editor") } };
}
