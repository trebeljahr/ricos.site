import { Fishes } from "@r3f/Scenes/Particles/Fishes/Scene";
import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { Box, OrbitControls, Stage } from "@react-three/drei";
import { Vector3 } from "three";
import { MinecraftSpectatorController } from "@r3f/Controllers/MinecraftCreativeController";

const seoInfo = {
  title: "A FBO particles demo using custom meshes of Fish",
  description:
    "I was trying to simulate a school of fish using FBO particles in R3F and this is one of the first results. The fish are custom meshes and their positions are updated using a compute shader.",
  url: "/r3f/particles/fishes",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/fishes.png",
  imageAlt: "a school of fish swimming around in a 3D scene",
};

export default function Page() {
  return (
    <ThreeFiberLayout
      seoInfo={seoInfo}
      withKeyboardControls={false}
      camera={{ position: new Vector3(0, 0, 5), near: 0, far: 300 }}
    >
      <Fishes />

      <Stage></Stage>

      <ambientLight intensity={1} />
      <hemisphereLight />
      <directionalLight />

      <OrbitControls enablePan={false} />
    </ThreeFiberLayout>
  );
}
