import { physicsDebug } from "@components/canvas/ChunkGenerationSystem/config";
import { RigidBallSpawner } from "@components/canvas/ChunkGenerationSystem/RigidBall";
import { SingleAnimal } from "@components/canvas/ChunkGenerationSystem/SingleAnimal";
import { WorldManager } from "@components/canvas/ChunkGenerationSystem/WorldManager";
import { MinecraftCreativeControlsPlayer } from "@components/canvas/FlyingPlayer";
import { KeyboardControlsProvider } from "@components/canvas/Scene";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Leva, useControls } from "leva";
import { Perf } from "r3f-perf";

const defaultSpeed = 25;
const Page = () => {
  const { speed } = useControls({
    speed: { value: defaultSpeed, min: 1, max: 50, step: 1 },
  });

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <KeyboardControlsProvider>
        <Leva />
        <Canvas>
          <Perf position="top-left" />
          <Physics debug={physicsDebug}>
            <ambientLight intensity={1.0} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <fogExp2 attach="fog" args={["#f0f0f0", 0.008]} />
            <color args={["#f0f0f0"]} attach="background" />
            <WorldManager />
            <MinecraftCreativeControlsPlayer speed={speed} />
            {/* <RigidBallSpawner /> */}
            {/* <SingleAnimal /> */}
          </Physics>
        </Canvas>
      </KeyboardControlsProvider>
    </div>
  );
};

export default Page;
