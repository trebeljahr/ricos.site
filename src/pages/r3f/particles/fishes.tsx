import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { Fishes } from "@r3f/Scenes/Particles/Fishes/Scene";
import { OrbitControls, Stage } from "@react-three/drei";
import { type SeoInfo, getSeoInfo } from "src/lib/getSeoInfo";
import { Vector3 } from "three";

const defaultSeoInfo = {
  title: "A FBO particles demo using custom meshes of Fish",
  description:
    "I was trying to simulate a school of fish using FBO particles in R3F and this is one of the first results. The fish are custom meshes and their positions are updated using a compute shader.",
  url: "/r3f/particles/fishes",
  keywords: ["threejs", "react-three-fiber", "r3f", "3D", "programming", "graphics", "webgl"],
  image: "/assets/pages/fishes.png",
  imageAlt: "a school of fish swimming around in a 3D scene",
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
      camera={{ position: new Vector3(0, 0, 5), near: 0, far: 300 }}
    >
      <Fishes />

      <Stage></Stage>

      <ambientLight intensity={1} />
      <hemisphereLight />
      <directionalLight />

      <OrbitControls enablePan={false} />
    </ThreeFiberLayout>
  );
}

export function getStaticProps() {
  return { props: { seo: getSeoInfo("/r3f/particles/fishes") } };
}
