import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { ChunkProvider } from "@r3f/ChunkGenerationSystem/ChunkProvider";
import { ChunkRenderer } from "@r3f/ChunkGenerationSystem/ChunkRenderer";
import { BrunoSimonController } from "@r3f/Controllers/BrunoSimonController";

import { type SeoInfo, getSeoInfo } from "src/lib/getSeoInfo";
import { MeshStandardMaterial } from "three";

const defaultSeoInfo = {
  title: "Bruno Simon's Third Person Controller",
  description:
    "This is a demo of Bruno Simon's third person controller, taken from his Infinite World Example but ported to work with R3F.",
  url: "/r3f/controllers/bruno-simon-controller",
  keywords: ["threejs", "react-three-fiber", "r3f", "3D", "programming", "graphics", "webgl"],
  image: "/assets/pages/r3f/bruno-simon-controller.png",
  imageAlt: "girl standing in a simple 3D terrain",
};

const Page = ({ seo }: { seo: SeoInfo | null }) => {
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
      <hemisphereLight intensity={0.35} />
      <ambientLight intensity={1.0} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <fogExp2 attach="fog" args={["#f0f0f0", 0.008]} />
      <color args={["#f0f0f0"]} attach="background" />

      <ChunkProvider>
        <ChunkRenderer
          withCollider={false}
          material={
            new MeshStandardMaterial({
              color: "#8bcd5c",
              roughness: 0.7,
              metalness: 0.2,
              wireframe: false,
            })
          }
        />
      </ChunkProvider>
      <BrunoSimonController />
    </ThreeFiberLayout>
  );
};

export default Page;

export function getStaticProps() {
  return { props: { seo: getSeoInfo("/r3f/controllers/bruno-simon-controller") } };
}
