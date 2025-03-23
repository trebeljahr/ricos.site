import { ThreeFiberLayout } from "@components/dom/Layout";
import { Cat } from "@r3f/AllModels/Cat";
import { CanvasWithKeyboardInput } from "@r3f/Controllers/KeyboardControls";
import { MinecraftSpectatorController } from "@r3f/Controllers/MinecraftCreativeController";
import { SingleStylizedGrassPlane } from "@r3f/Scenes/Grass/JamesSmythGrass";
import { OrbitControls, Sky, Stage } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

export default function Page() {
  return (
    <ThreeFiberLayout>
      <CanvasWithKeyboardInput>
        <color attach="background" args={["#ffcc32"]} />
        <ambientLight intensity={0.5} />
        <Sky />
        <SingleStylizedGrassPlane planeSize={200} />
        <MinecraftSpectatorController speed={1} />
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
