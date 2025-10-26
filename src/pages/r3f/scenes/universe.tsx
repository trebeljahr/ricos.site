import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { Physics } from "@react-three/rapier";
import { physicsDebug } from "src/canvas/ChunkGenerationSystem/config";
import { MinecraftSpectatorController } from "src/canvas/Controllers/MinecraftCreativeController";

const seoInfo = {
  title: "",
  description: "",
  url: "/r3f/scenes/snow-forest",
  keywords: [
    "threejs",
    "react-three-fiber",
    "instancedMesh2",
    "instancing",
    "chunk generation",
    "terrain",
    "procedural generation",
    "procedural terrain",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/snow-forest.png",
  imageAlt: "",
};

const SolarSystem = () => {
  function simulateSolarSystem() {
    // Placeholder for solar system simulation logic
  }
};

const Page = () => {
  return (
    <ThreeFiberLayout seoInfo={seoInfo}>
      <ambientLight intensity={1} />

      <Physics debug={physicsDebug}>
        <MinecraftSpectatorController />
      </Physics>
    </ThreeFiberLayout>
  );
};

export default Page;
