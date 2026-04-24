import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { Birds } from "@r3f/Scenes/Particles/Birds/Scene";
import { OrbitControls, Stage } from "@react-three/drei";
import { type SeoInfo, getSeoInfo } from "src/lib/getSeoInfo";

const defaultSeoInfo = {
  title: "Birds Particle System",
  description:
    "A birds particle system demo, ported to R3F and Typescript from the ThreeJS Examples for learning. The birds are rendered by a flocking simulation and flee from the mouse cursor.",
  url: "/r3f/particles/birds",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "particles",
    "compute shader",
    "gpgpu",
    "FBO demo",
    "Flocking simulation",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/birds.png",
  imageAlt: "a flock of birds flying around in a 3D scene",
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
  const skyColor = "#002a39";
  return (
    <ThreeFiberLayout
      seoInfo={seoInfo}
      withKeyboardControls={false}
      camera={{ position: [-280, -25, 40], near: 0, far: 3000 }}
    >
      <color attach="background" args={[skyColor]} />
      <ambientLight intensity={0.5} />
      <directionalLight />

      <Stage />

      <Birds />
      {/* <Fishes /> */}
      <OrbitControls enablePan={false} enableRotate={false} />
    </ThreeFiberLayout>
  );
}

export function getStaticProps() {
  return { props: { seo: getSeoInfo("/r3f/particles/birds") } };
}
