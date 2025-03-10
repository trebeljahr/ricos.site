import { ThreeFiberLayout } from "@components/dom/Layout";
import {
  BirchTreesForChunks,
  PineTreesForChunks,
  RocksForChunks,
} from "@r3f/ChunkGenerationSystem/ChunkInstancedMeshes";
import {
  ChunkProvider,
  MemoizedChunk,
  useChunkContext,
} from "@r3f/ChunkGenerationSystem/ChunkProvider";
import { DebugTile } from "@r3f/ChunkGenerationSystem/DebugTile";
import { getHeight } from "@r3f/ChunkGenerationSystem/getHeight";
import { HeightfieldTileWithCollider } from "@r3f/Scenes/HeightfieldTileWithCollider";
import { LightsAndFog } from "@r3f/Scenes/LightsAndFog";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Perf } from "r3f-perf";
import {
  debug,
  perf,
  physicsDebug,
  tilesDistance,
  tileSize,
} from "src/canvas/ChunkGenerationSystem/config";
import { KeyboardControlsProvider } from "src/canvas/Controllers/KeyboardControls";
import { MinecraftCreativeController } from "src/canvas/Controllers/MinecraftCreativeController";

const ChunkRenderer = () => {
  const chunks = useChunkContext();

  return (
    <group>
      {Array.from(chunks).map(([key, chunkData], index) => {
        return <MemoizedChunk key={index} chunkData={chunkData} />;
      })}
    </group>
  );
};

const Page = () => {
  const { height: y } = getHeight(0, 0);

  return (
    <ThreeFiberLayout>
      <KeyboardControlsProvider>
        <Canvas
          camera={{
            near: 0.1,
            far: tileSize * (tilesDistance - 1),
          }}
        >
          {perf && <Perf position="bottom-right" />}
          <Physics debug={physicsDebug}>
            <LightsAndFog skyColor={"#c1f2ff"} />

            <ChunkProvider>
              <ChunkRenderer />
              <BirchTreesForChunks />
              <PineTreesForChunks />
              {/* <RocksForChunks /> */}
            </ChunkProvider>

            <MinecraftCreativeController
              speed={25}
              initialLookat={[10, y, 0]}
              initialPosition={[0, y + 10, 0]}
            />
          </Physics>
        </Canvas>
      </KeyboardControlsProvider>
    </ThreeFiberLayout>
  );
};

export default Page;
