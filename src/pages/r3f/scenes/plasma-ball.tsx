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
  title: "Plasma Ball",
  description:
    "In this demo I tried using the LightningStrike Geometry from the three-stdlib in order to produce a plasma lamp sort of effect. With Bloom and ToneMapping postprocessing effects this looks very nice.",
  url: "/r3f/scenes/plasma-ball",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/plasma-ball.png",
  imageAlt: "a 3D rendered simulation of a plasma ball",
};

export default function Page() {
  return (
    <ThreeFiberLayout {...seoInfo} withKeyboardControls={false}>
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
    </ThreeFiberLayout>
  );
}
