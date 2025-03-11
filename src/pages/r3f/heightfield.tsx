import { ThreeFiberLayout } from "@components/dom/Layout";
import {
  ChunkProvider,
  MemoizedChunk,
  useChunkContext,
} from "@r3f/ChunkGenerationSystem/ChunkProvider";
import { physicsDebug } from "@r3f/ChunkGenerationSystem/config";
import { getHeight } from "@r3f/ChunkGenerationSystem/getHeight";
import { EcctrlController } from "@r3f/Controllers/EcctrlController";
import { CanvasWithKeyboardInput } from "@r3f/Controllers/KeyboardControls";
import { RigidBallSpawner } from "@r3f/Helpers/RigidBall";
import { LightsAndFog } from "@r3f/Scenes/LightsAndFog";
import { Physics } from "@react-three/rapier";

export const ChunkRenderer = () => {
  const chunks = useChunkContext();

  return (
    <group>
      {Array.from(chunks).map(([key, chunkData]) => {
        return <MemoizedChunk key={key} chunkData={chunkData} />;
      })}
    </group>
  );
};

export default function Page() {
  const { height: y } = getHeight(0, 0);
  return (
    <ThreeFiberLayout>
      <CanvasWithKeyboardInput camera={{ position: [0, 100, 0] }}>
        <Physics debug={physicsDebug}>
          <LightsAndFog skyColor={"#c1f2ff"} />
          <EcctrlController position={[0, y + 10, 0]} />

          <ChunkProvider>
            <ChunkRenderer />
          </ChunkProvider>
          <RigidBallSpawner />
        </Physics>
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
