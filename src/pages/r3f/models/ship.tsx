import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";

import { Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import dynamic from "next/dynamic";

import { MinecraftSpectatorController } from "src/canvas/Controllers/MinecraftCreativeController";
import { OceanSurface } from "src/canvas/Scenes/OceanDemo/Ocean";
import { SeoInfo } from "src/lib/getSeoInfo";

const Ship = dynamic(() => import("@r3f/AllModels/Ship"), {
  ssr: false,
});

const defaultSeoInfo = {
  title: "Ship Demo",
  description:
    "A simple ship model swimming in the default Drei ocean shader. One of my first demos built with R3F and three.js",
  url: "/r3f/models/Ship",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/ship.png",
  imageAlt: "a 3D model of a ship floating in the ocean",
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
      camera={{
        position: [19, 12, 27],
        rotation: [
          -0.1819164443624924, 0.7349237008688785, 0.12272431719745204,
        ],
      }}
    >
      <Sky />
      <ambientLight />

      <Physics>
        <MinecraftSpectatorController speed={1} />
      </Physics>
      <Ship />
      <OceanSurface />
    </ThreeFiberLayout>
  );
}

export async function getStaticProps() {
  const { getSeoInfo } = require("src/lib/getSeoInfo");
  return { props: { title: "Ship Demo" , seo: getSeoInfo("/r3f/models/Ship") } };
}
