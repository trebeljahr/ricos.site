import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { CanvasWithKeyboardInput } from "@r3f/Controllers/KeyboardControls";
import { MinecraftSpectatorController } from "@r3f/Controllers/MinecraftCreativeController";
import { SingleStylizedGrassPlane } from "@r3f/Scenes/Grass/JamesSmythGrass";
import { Sky } from "@react-three/drei";

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
      <CanvasWithKeyboardInput>
        <color attach="background" args={["#ffcc32"]} />
        <ambientLight intensity={0.5} />
        <Sky />
        <SingleStylizedGrassPlane planeSize={200} bladeCount={1000000} />
        <MinecraftSpectatorController speed={1} />
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
