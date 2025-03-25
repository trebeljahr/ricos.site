import { FBOParticles } from "@r3f/Scenes/FBOExperiments/Particles/Particles";
import { CanvasWithKeyboardInput } from "src/canvas/Controllers/KeyboardControls";
import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { OrbitControls } from "@react-three/drei";
import {
  Bloom,
  EffectComposer,
  ToneMapping,
} from "@react-three/postprocessing";

const seoInfo = {
  title: "A simple FBO particles demo",
  description:
    "This is a simple FBO particles demo in R3F, using a compute shader to update the particles to learn and understand how that can done",
  url: "/r3f/particles/fbo-demo",
  keywords: [
    "threejs",
    "react-three-fiber",

    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/fbo-demo.png",
  imageAlt: "a set of glowing particles flying around in a 3D scene",
};

export default function Page() {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <CanvasWithKeyboardInput>
        <FBOParticles />
        <EffectComposer>
          <Bloom mipmapBlur luminanceThreshold={1} levels={8} intensity={4} />
          <ToneMapping />
        </EffectComposer>
        <OrbitControls />
        <color attach="background" args={["#393c4a"]} />
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
