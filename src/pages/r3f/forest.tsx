import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { SnowyPineTreesForChunks } from "@r3f/ChunkGenerationSystem/ChunkInstancedMeshes";
import {
  ChunkProvider,
  MemoizedChunk,
  useChunkContext,
} from "@r3f/ChunkGenerationSystem/ChunkProvider";
import { getHeight } from "@r3f/ChunkGenerationSystem/getHeight";
import { HeightfieldTileWithCollider } from "@r3f/Scenes/HeightfieldTileWithCollider";
import { AnimatedSkyBox } from "@r3f/Helpers/OverheadLights";
import { Canvas, useThree } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Perf } from "r3f-perf";
import { Suspense } from "react";
import {
  perf,
  physicsDebug,
  tilesDistance,
  tileSize,
} from "src/canvas/ChunkGenerationSystem/config";
import { KeyboardControlsProvider } from "src/canvas/Controllers/KeyboardControls";
import { MinecraftSpectatorController } from "src/canvas/Controllers/MinecraftCreativeController";

const ChunkRenderer = () => {
  const chunks = useChunkContext();

  const { camera } = useThree();
  return (
    <group>
      {Array.from(chunks).map(([key, chunkData], index) => {
        if (!chunkData.data) return null;
        return (
          <Suspense key={index}>
            <MemoizedChunk chunkData={chunkData}>
              <HeightfieldTileWithCollider
                geometry={chunkData.data!.geo}
                heightfield={chunkData.data!.heightfield}
              />
            </MemoizedChunk>
          </Suspense>
        );
      })}
    </group>
  );
};

const seoInfo = {
  title: "",
  description: "",
  url: "/r3f/",
  keywords: [
    "threejs",
    "react-three-fiber",
    "lightning strike",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/.png",
  imageAlt: "",
};

const Page = () => {
  const { height: y } = getHeight(0, 0);

  return (
    <ThreeFiberLayout {...seoInfo}>
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

            <MinecraftSpectatorController
              speed={1}
              initialLookat={[10, 0, 0]}
              initialPosition={[0, y + 20, 0]}
            />
          </Physics>
        </Canvas>
      </KeyboardControlsProvider>
    </ThreeFiberLayout>
  );
};

export default Page;
