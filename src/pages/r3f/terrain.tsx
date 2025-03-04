import {
  debug,
  physicsDebug,
  tileSize,
} from "@components/canvas/ChunkGenerationSystem/config";
import { RigidBallSpawner } from "@components/canvas/Helpers/RigidBall";
import { SingleAnimal } from "@components/canvas/Helpers/SingleAnimal";
import { WorldManager } from "@components/canvas/ChunkGenerationSystem/WorldManager";
import { EcctrlController } from "@components/canvas/Controllers/EcctrlController";
import { MinecraftCreativeController } from "@components/canvas/Controllers/MinecraftCreativeController";
import { KeyboardControlsProvider } from "@components/canvas/Controllers/KeyboardControls";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Leva, useControls } from "leva";
import { Perf } from "r3f-perf";
import { CameraPositionLogger } from "@components/canvas/Helpers/CameraPositionLogger";
import { RayCaster } from "@components/canvas/Helpers/RayCaster";
import { SwitchController } from "@components/canvas/Controllers/SwitchControllers";
import { ThreeFiberLayout } from "@components/dom/Layout";

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
          <Perf position="bottom-right" />
          <Physics debug={physicsDebug}>
            <hemisphereLight intensity={0.35} />
            <ambientLight intensity={1.0} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <fogExp2 attach="fog" args={["#f0f0f0", 0.008]} />
            <color args={["#f0f0f0"]} attach="background" />
            <WorldManager />
            <RayCaster />
            {debug && <gridHelper args={[tileSize, 100]} />}
            {/* <ControlledCharacterModel /> */}

            {/* <MinecraftCreativeController speed={speed} /> */}
            <SwitchController />
            <RigidBallSpawner />
            {/* <SingleAnimal /> */}
          </Physics>
        </Canvas>
      </KeyboardControlsProvider>
    </ThreeFiberLayout>
  );
};

export default Page;
