import { MinecraftSpectatorController } from "src/canvas/Controllers/MinecraftCreativeController";
import { KeyboardControlsProvider } from "src/canvas/Controllers/KeyboardControls";
import { TreeTile } from "src/canvas/Trees/TreeTile";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { tileSize } from "src/canvas/ChunkGenerationSystem/config";

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

const Page = () => {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <KeyboardControlsProvider>
        <Canvas>
          <Physics>
            <ambientLight intensity={1.0} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <fogExp2 attach="fog" args={["#f0f0f0", 0.002]} />
            <color args={["#f0f0f0"]} attach="background" />
            <MinecraftSpectatorController speed={1} />
            <gridHelper args={[tileSize, 100]} />
            <TreeTile />
          </Physics>
        </Canvas>
      </KeyboardControlsProvider>
    </ThreeFiberLayout>
  );
};

export default Page;
