import {
  ControlsContextProvider,
  useControlsContext,
} from "@components/canvas/ChunkGenerationSystem/ControlsContextProvider";
import { WorldManager } from "@components/canvas/ChunkGenerationSystem/WorldManager";
import { MinecraftCreativeControlsPlayer } from "@components/canvas/FlyingPlayer";
import { KeyboardControlsProvider } from "@components/canvas/Scene";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";

const MyCanvas = () => {
  const { speed } = useControlsContext();

  return (
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
  );
};
const Page = () => {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <KeyboardControlsProvider>
        <ControlsContextProvider>
          <MyCanvas />
        </ControlsContextProvider>
      </KeyboardControlsProvider>
    </div>
  );
};

export default Page;
