import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";

import { OrbitControls, Stage } from "@react-three/drei";

import dynamic from "next/dynamic";
import { type SeoInfo, getSeoInfo } from "src/lib/getSeoInfo";

const DynamicCharacter = dynamic(() => import("@r3f/Characters/Character"), {
  ssr: false,
});

const defaultSeoInfo = {
  title: "Mixamo Character Demos",
  description: "Showcasing different Mixamo Characters in a 3D scene with animations",
  url: "/r3f/models/mixamo-characters",
  keywords: [
    "threejs",
    "react-three-fiber",

    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/mixamo-characters.png",
  imageAlt: "Mixamo character dancing in a 3D scene",
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
      withKeyboardControls={false}
      camera={{ position: [0, 1, 2] }}
    >
      <color attach="background" args={["skyblue"]} />
      <ambientLight />

      <Stage adjustCamera={false}>
        <DynamicCharacter />
      </Stage>
      <OrbitControls />
    </ThreeFiberLayout>
  );
}

export function getStaticProps() {
  return { props: { seo: getSeoInfo("/r3f/models/mixamo-characters") } };
}
