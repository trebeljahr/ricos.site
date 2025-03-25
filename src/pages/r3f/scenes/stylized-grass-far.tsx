import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { CanvasWithKeyboardInput } from "@r3f/Controllers/KeyboardControls";
import { MinecraftSpectatorController } from "@r3f/Controllers/MinecraftCreativeController";
import { GrassPlane } from "@r3f/Scenes/Grass/FoxAdventureGrass/GrassChunk";
import Terrain from "@r3f/Scenes/Grass/FoxAdventureGrass/Terrain";
import { SingleStylizedGrassPlane } from "@r3f/Scenes/Grass/JamesSmythGrass/GrassPlane";
import { Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";

const seoInfo = {
  title: "Stylized Grass",
  description:
    "Stylized Grass based on the demo and explainer article by James Smyth, but extended from the Fox Adventure Game port",
  url: "/r3f/scenes/stylized-grass",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/stylized-grass.png",
  imageAlt: "a plane filled with a stylized grass shader",
};

export default function Page() {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <CanvasWithKeyboardInput>
        <color attach="background" args={["#ffcc32"]} />
        <ambientLight intensity={0.5} />
        <Sky />
        <Physics>
          <Terrain />
        </Physics>
        <MinecraftSpectatorController speed={1} />
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
