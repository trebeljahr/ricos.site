import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { Cat } from "@r3f/AllModels/Cat";

import { OrbitControls, Stage } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

const seoInfo = {
  title: "A simple 3D scene with a cat model",
  description:
    "Trying out how to load a 3D model in a React Three Fiber scene using the drei library and presenting them with the Stage component.",
  url: "/r3f/models/cat",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/cat.png",
  imageAlt: "a low poly 3D model of a cat",
};

export default function Page() {
  return (
    <ThreeFiberLayout seoInfo={seoInfo}>
      <color attach="background" args={["#f8de9c"]} />

      <Stage adjustCamera>
        <Cat />
      </Stage>
      <OrbitControls autoRotate />
    </ThreeFiberLayout>
  );
}
