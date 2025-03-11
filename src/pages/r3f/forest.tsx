import { ThreeFiberLayout } from "@components/dom/Layout";
import {
  BirchTreesForChunks,
  PineTreesForChunks,
  RocksForChunks,
  SnowyPineTreesForChunks,
} from "@r3f/ChunkGenerationSystem/ChunkInstancedMeshes";
import {
  ChunkProvider,
  MemoizedChunk,
  useChunkContext,
} from "@r3f/ChunkGenerationSystem/ChunkProvider";
import { DebugTile } from "@r3f/ChunkGenerationSystem/DebugTile";
import { getHeight } from "@r3f/ChunkGenerationSystem/getHeight";
import { BrunoSimonController } from "@r3f/Controllers/BrunoSimonController";
import { EcctrlController } from "@r3f/Controllers/EcctrlController";
import { HeightfieldTileWithCollider } from "@r3f/Scenes/HeightfieldTileWithCollider";
import { LightsAndFog } from "@r3f/Scenes/LightsAndFog";
import { AnimatedSkyBox } from "@r3f/Scenes/OverheadLights";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Perf } from "r3f-perf";
import { Suspense } from "react";
import {
  debug,
  perf,
  physicsDebug,
  tilesDistance,
  tileSize,
} from "src/canvas/ChunkGenerationSystem/config";
import { KeyboardControlsProvider } from "src/canvas/Controllers/KeyboardControls";
import { MinecraftCreativeController } from "src/canvas/Controllers/MinecraftCreativeController";
import {
  ForestFloorMaterial1,
  SnowMaterial,
} from "src/Materials/TextureMaterials";

const ChunkRenderer = () => {
  const chunks = useChunkContext();

  return (
    <group>
      {Array.from(chunks).map(([key, chunkData], index) => {
        return (
          <Suspense key={index}>
            <MemoizedChunk chunkData={chunkData}>
              <HeightfieldTileWithCollider
                geometry={chunkData.data!.geo}
                heightfield={chunkData.data!.heightfield}
                material={ForestFloorMaterial1}
              />
            </MemoizedChunk>
          </Suspense>
        );
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
            far: tileSize * (tilesDistance + 2),
          }}
        >
          {perf && <Perf position="bottom-right" />}
          <AnimatedSkyBox />
          <ambientLight intensity={1} />

          <Physics debug={physicsDebug}>
            <ChunkProvider>
              <ChunkRenderer />
              <SnowyPineTreesForChunks />
              {/* <RocksForChunks /> */}
            </ChunkProvider>

            {/* <BrunoSimonController /> */}

            {/* <EcctrlController position={[0, 100, 0]} /> */}

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
