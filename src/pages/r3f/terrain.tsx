import { ThreeFiberLayout } from "@components/dom/Layout";
import {
  BirchTreesForChunks,
  RocksForChunks,
} from "@r3f/ChunkGenerationSystem/ChunkInstancedMeshes";
import { ChunkProvider } from "@r3f/ChunkGenerationSystem/ChunkProvider";
import { MinecraftCreativeController } from "@r3f/Controllers/MinecraftCreativeController";
import { Trex } from "@r3f/models/Trex";
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
import { SwitchController } from "src/canvas/Controllers/SwitchControllers";
import { CameraPositionLogger } from "src/canvas/Helpers/CameraPositionLogger";
import { RayCaster } from "src/canvas/Helpers/RayCaster";
import { RigidBallSpawner } from "src/canvas/Helpers/RigidBall";

const defaultSpeed = 25;
const Page = () => {
  const { speed } = useControls({
    speed: { value: defaultSpeed, min: 1, max: 50, step: 1 },
  });

  return (
    <ThreeFiberLayout>
      <KeyboardControlsProvider>
        <Leva />
        <Canvas>
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

            <MinecraftCreativeController speed={speed} />
            <RigidBallSpawner />
          </Physics>
        </Canvas>
      </KeyboardControlsProvider>
    </ThreeFiberLayout>
  );
};

export default Page;
