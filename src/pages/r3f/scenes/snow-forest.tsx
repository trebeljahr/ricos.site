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
import { SceneWithLoadingState } from "@r3f/Helpers/SceneWithLoadingState";

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
  title: "Endless Snow Forest",
  description:
    "An endless snow forest scene in React Three Fiber, implemented using a chunk generation system, web workers and the instancedMesh2 library.",
  url: "/r3f/scenes/snow-forest",
  keywords: [
    "threejs",
    "react-three-fiber",
    "instancedMesh2",
    "instancing",
    "chunk generation",
    "terrain",
    "procedural generation",
    "procedural terrain",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/snow-forest.png",
  imageAlt: "a snow covered forest scene extending towards the horizon",
};

const Page = () => {
  const { height: y } = getHeight(0, 0);

  return (
    <ThreeFiberLayout {...seoInfo}>
      <SceneWithLoadingState
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
          </ChunkProvider>

          <MinecraftSpectatorController
            speed={1}
            initialLookat={[10, 0, 0]}
            initialPosition={[0, y + 60, 0]}
          />
        </Physics>
      </SceneWithLoadingState>
    </ThreeFiberLayout>
  );
};

export default Page;
