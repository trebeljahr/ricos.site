import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";

import { MinecraftSpectatorController } from "@r3f/Controllers/MinecraftCreativeController";
import { SingleStylizedGrassPlane } from "@r3f/Scenes/Grass/JamesSmythGrass/GrassPlane";
import { Sky } from "@react-three/drei";

const seoInfo = {
  title: "Stylized Grass",
  description:
    "Stylized Grass based on the demo and explainer article by James Smyth, but ported into R3F and Typescript.",
  url: "/r3f/grass/james-smyth-grass",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/james-smyth-grass.png",
  imageAlt: "a plane filled with a stylized grass shader",
};

export default function Page() {
  return (
    <ThreeFiberLayout seoInfo={seoInfo} camera={{ position: [52, 24, 84] }}>
      <color attach="background" args={["#ffcc32"]} />
      <ambientLight intensity={0.5} />
      <Sky />
      <SingleStylizedGrassPlane planeSize={200} bladeCount={500000} />
      <MinecraftSpectatorController speed={1} />
    </ThreeFiberLayout>
  );
}
