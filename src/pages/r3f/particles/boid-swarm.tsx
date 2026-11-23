import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { BoidSwarmDemo } from "@r3f/Scenes/Particles/BoidSwarm/BoidSwarmDemo";
import { OrbitControls } from "@react-three/drei";
import { getSeoInfo, type SeoInfo } from "src/lib/getSeoInfo";
import { Vector3 } from "three";

const defaultSeoInfo = {
  title: "Boid swarm: thousands of fish around a reef",
  description:
    "Schools of fish simulated on the GPU. They flock, bend into their turns, steer around rocks and scatter when a shark comes close.",
  url: "/r3f/particles/boid-swarm",
  keywords: ["threejs", "react-three-fiber", "r3f", "boids", "flocking", "GPGPU", "webgl"],
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
      camera={{ position: new Vector3(0, 3, 42), near: 0.1, far: 300, fov: 55 }}
    >
      <BoidSwarmDemo />
      <OrbitControls makeDefault target={[0, -2, 0]} maxDistance={70} minDistance={4} />
    </ThreeFiberLayout>
  );
}

export function getStaticProps() {
  return { props: { seo: getSeoInfo("/r3f/particles/boid-swarm") } };
}
