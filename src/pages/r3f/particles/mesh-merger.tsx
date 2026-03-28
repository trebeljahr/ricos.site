import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { MeshMerger } from "@r3f/Scenes/Particles/MeshMerger/Scene";
import { OrbitControls } from "@react-three/drei";
import { Vector3 } from "three";
import { getSeoInfo, SeoInfo } from "src/lib/getSeoInfo";

const defaultSeoInfo = {
  title: "Particles for Merging Meshes",
  description: "",
  url: "/r3f/particles/mesh-merger",
  keywords: [
    "threejs",
    "react-three-fiber",
    "particles",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/mesh-merger.png",
  imageAlt: "",
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
      camera={{ position: new Vector3(0, 0, 2) }}
    >
      <ambientLight intensity={2} />
      <color attach="background" args={["#191616"]} />
      <MeshMerger />
      <OrbitControls />
    </ThreeFiberLayout>
  );
}

export function getStaticProps() {
  return { props: { seo: getSeoInfo("/r3f/particles/mesh-merger") } };
}
