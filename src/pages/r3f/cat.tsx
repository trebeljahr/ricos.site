import { ThreeFiberLayout } from "@components/dom/Layout";
import { Cat } from "@r3f/AllModels/Cat";
import { OrbitControls, Stage } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

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
        <color attach="background" args={["#ffcc32"]} />

        <Stage>
          <Cat />
        </Stage>
        <OrbitControls />
      </Canvas>
    </ThreeFiberLayout>
  );
}
