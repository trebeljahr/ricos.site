import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";

import { MinecraftSpectatorController } from "@r3f/Controllers/MinecraftCreativeController";
import { AllRoGrass } from "@r3f/Scenes/Grass/AllRoGrass/GrassPlane";
import { Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { Vector3 } from "three";
import { SeoInfo } from "src/lib/getSeoInfo";

const defaultSeoInfo = {
  title: "A single square grass plane",
  description:
    "In this scene, I'm testing out a single square grass plane in React Three Fiber based on a codepen from al-ro.",
  url: "/r3f/grass/al-ro-grass",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/al-ro-grass.png",
  imageAlt: "a 3D view of a grassy plane",
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
      camera={{ position: new Vector3(26, 18, 22) }}
    >
      <Sky />
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <Physics>
        <AllRoGrass />

        <MinecraftSpectatorController speed={1} />
      </Physics>
    </ThreeFiberLayout>
  );
}

export function getStaticProps() {
  const { getSeoInfo } = require("src/lib/getSeoInfo");
  return { props: { seo: getSeoInfo("/r3f/grass/al-ro-grass") } };
}
