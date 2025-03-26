import { perf } from "src/canvas/ChunkGenerationSystem/config";
import { Birds } from "@r3f/Scenes/FBOExperiments/Birds";
import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Perf } from "r3f-perf";
import { Vector3 } from "three";
import { SceneWithLoadingState } from "@r3f/Helpers/SceneWithLoadingState";

const seoInfo = {
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

export default function Page() {
  const skyColor = "#FFFFFF";
  return (
    <ThreeFiberLayout {...seoInfo}>
      <SceneWithLoadingState
        withKeyboardControls={false}
        camera={{ position: new Vector3(0, 0, 350), near: 1, far: 3000 }}
      >
        <Birds />
        <color attach="background" args={[skyColor]} />
        <fog color={skyColor} near={100} far={1000} />
        {perf && <Perf position="bottom-right" />}
        <OrbitControls />
      </SceneWithLoadingState>
    </ThreeFiberLayout>
  );
}
