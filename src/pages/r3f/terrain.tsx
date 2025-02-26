import { WorldManager } from "@components/canvas/ChunkGenerationSystem/WorldManager";
import { MinecraftCreativeControlsPlayer } from "@components/canvas/FlyingPlayer";
import { KeyboardControlsProvider } from "@components/canvas/Scene";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Leva, useControls } from "leva";

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
          <Physics>
            <ambientLight intensity={1.0} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <fogExp2 attach="fog" args={["#f0f0f0", 0.002]} />
            <color args={["#f0f0f0"]} attach="background" />
            <WorldManager />
            <MinecraftCreativeControlsPlayer speed={speed} />
          </Physics>
        </Canvas>
      </KeyboardControlsProvider>
    </div>
  );
};

export default Page;
