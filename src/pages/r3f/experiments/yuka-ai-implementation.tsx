import { MinecraftSpectatorController } from "src/canvas/Controllers/MinecraftCreativeController";
import { KeyboardControlsProvider } from "src/canvas/Controllers/KeyboardControls";
import { YukaSimulation } from "src/canvas/Scenes/Yuka/YukaExample";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";

const seoInfo = {
  title: "A simple game AI simulation in R3F using the Yuka library",
  description:
    "In this demo I use the Yuka library to simulate a simple game AI in a 3D scene, a deer running away from a velociraptor chasing it.",
  url: "/r3f/experiments/yuka-ai-implementation",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/yuka-ai-implementation.png",
  imageAlt: "a deer running away from a velociraptor in a 3D scene",
};

const Page = () => {
  return (
    <ThreeFiberLayout seoInfo={seoInfo}>
      <Physics>
        <ambientLight intensity={1.0} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <fogExp2 attach="fog" args={["#f0f0f0", 0.002]} />
        <color args={["#f0f0f0"]} attach="background" />
        <MinecraftSpectatorController speed={1} />
        <YukaSimulation />
      </Physics>
    </ThreeFiberLayout>
  );
};

export default Page;
