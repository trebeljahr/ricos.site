import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { PlasmaBall } from "@r3f/Scenes/PlasmaBall";
import { Environment, OrbitControls, Stage } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  ToneMapping,
} from "@react-three/postprocessing";

const seoInfo = {
  title: "",
  description: "",
  url: "/r3f/",
  keywords: [
    "threejs",
    "react-three-fiber",
    "lightning strike",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/.png",
  imageAlt: "",
};

export default function Page() {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <Canvas>
        <color attach="background" args={["#121524"]} />
        <ambientLight intensity={1} />

        <Stage adjustCamera>
          <PlasmaBall />
        </Stage>

        <EffectComposer>
          <Bloom mipmapBlur luminanceThreshold={1} levels={8} intensity={4} />
          <ToneMapping />
        </EffectComposer>
        <OrbitControls autoRotate />
      </Canvas>
    </ThreeFiberLayout>
  );
}
