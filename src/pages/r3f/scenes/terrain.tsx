import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { ChunkProvider } from "@r3f/ChunkGenerationSystem/ChunkProvider";
import { MinecraftSpectatorController } from "@r3f/Controllers/MinecraftCreativeController";
import { SceneWithLoadingState } from "@r3f/Helpers/SceneWithLoadingState";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Leva, useControls } from "leva";
import { Perf } from "r3f-perf";
import {
  debug,
  perf,
  physicsDebug,
  tileSize,
} from "src/canvas/ChunkGenerationSystem/config";
import { WorldManager } from "src/canvas/ChunkGenerationSystem/WorldManager";
import { KeyboardControlsProvider } from "src/canvas/Controllers/KeyboardControls";
import { CameraPositionLogger } from "src/canvas/Helpers/CameraPositionLogger";
import { RayCaster } from "src/canvas/Helpers/RayCaster";
import { RigidBallSpawner } from "src/canvas/Helpers/RigidBall";

const seoInfo = {
  title: "Terrain Demo",
  description:
    "A demo of a procedurally generated terrain with biomes assigned based on temperature, height and moisture noise. Biomes are color coded into different categories. Building block for a survival game.",
  url: "/r3f/scenes/terrain",
  keywords: [
    "threejs",
    "react-three-fiber",
    "procedural generation",
    "procgen",
    "terrain",
    "terrain-generator",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/terrain.png",
  imageAlt: "rolling hills with different colors based on biome",
};

const Page = () => {
  const { speed } = useControls({
    speed: { value: 1, min: 0.1, max: 10, step: 0.1 },
  });

  return (
    <ThreeFiberLayout {...seoInfo}>
      <Leva />
      <SceneWithLoadingState>
        <CameraPositionLogger />
        {perf && <Perf position="bottom-right" />}
        <Physics debug={physicsDebug}>
          <hemisphereLight intensity={0.35} />
          <ambientLight intensity={1.0} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <fogExp2 attach="fog" args={["#f0f0f0", 0.008]} />
          <color args={["#f0f0f0"]} attach="background" />
          <ChunkProvider>
            <WorldManager />
          </ChunkProvider>
          <RayCaster />
          {debug && <gridHelper args={[tileSize, 100]} />}

          <MinecraftSpectatorController speed={speed} />
          <RigidBallSpawner />
        </Physics>
      </SceneWithLoadingState>
    </ThreeFiberLayout>
  );
};

export default Page;
