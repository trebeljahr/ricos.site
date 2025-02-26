import { WorldManager } from "@components/canvas/ChunkGenerationSystem/WorldManager";
import { MinecraftCreativeControlsPlayer } from "@components/canvas/FlyingPlayer";
import { KeyboardControlsProvider } from "@components/canvas/Scene";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";

const Page = () => {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <KeyboardControlsProvider>
        <Canvas>
          <Physics>
            <ambientLight intensity={0.5} />
            <WorldManager />
            <MinecraftCreativeControlsPlayer speed={20} />
          </Physics>
        </Canvas>
      </KeyboardControlsProvider>
    </div>
  );
};

export default Page;
