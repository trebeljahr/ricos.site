import { ThreeFiberLayout } from "@components/dom/Layout";
import {
  BirchTreesForChunks,
  RocksForChunks,
} from "@r3f/ChunkGenerationSystem/ChunkInstancedMeshes";
import {
  ChunkProvider,
  MemoizedChunk,
  useChunkContext,
} from "@r3f/ChunkGenerationSystem/ChunkProvider";
import { DebugTile } from "@r3f/ChunkGenerationSystem/DebugTile";
import { getHeight } from "@r3f/ChunkGenerationSystem/getHeight";
import { BirchTree } from "@r3f/models/BirchTree";
import { HeightfieldTileWithCollider } from "@r3f/Scenes/HeightfieldTileWithCollider";
import { LightsAndFog } from "@r3f/Scenes/LightsAndFog";
import { Sky } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { HeightfieldCollider, Physics } from "@react-three/rapier";
import { Perf } from "r3f-perf";
import { useEffect, useRef } from "react";
import {
  debug,
  perf,
  physicsDebug,
  tilesDistance,
  tileSize,
} from "src/canvas/ChunkGenerationSystem/config";
import { WorldManager } from "src/canvas/ChunkGenerationSystem/WorldManager";
import { KeyboardControlsProvider } from "src/canvas/Controllers/KeyboardControls";
import { MinecraftCreativeController } from "src/canvas/Controllers/MinecraftCreativeController";
import { Color } from "three";
import { Sky as SkyImpl } from "three-stdlib";
import { Vector3 } from "yuka";

const lensflareProps = {
  enabled: true,
  opacity: 1.0,
  position: { x: -25, y: 50, z: -100 },
  glareSize: 0.35,
  starPoints: 6.0,
  animated: true,
  followMouse: false,
  anamorphic: false,
  colorGain: new Color(56, 22, 11),

  flareSpeed: 0.4,

  flareShape: 0.1,

  flareSize: 0.005,

  secondaryGhosts: true,
  ghostScale: 0.1,
  aditionalStreaks: true,

  starBurst: true,
  haloScale: 0.5,
  step: 0.01,
};

const MovingSky = () => {
  const skyRef = useRef<SkyImpl>(null!);
  useFrame(({ camera }) => {
    if (!skyRef.current) return;
    skyRef.current.position.copy(camera.position);
  });
  return <Sky ref={skyRef} />;
};

const ChunkRenderer = () => {
  const chunks = useChunkContext();
  return (
    <group>
      {Array.from(chunks).map(([key, chunkData]) => {
        return (
          <MemoizedChunk key={key} chunkData={chunkData}>
            <group position={[0, 0, 0]}>
              {debug && <DebugTile position={chunkData.position} />}
              <HeightfieldTileWithCollider
                divisions={chunkData.resolution}
                worldOffset={chunkData.position}
              />
            </group>
          </MemoizedChunk>
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
            far: tileSize * (tilesDistance - 1),
          }}
        >
          {perf && <Perf position="bottom-right" />}
          <Physics debug={physicsDebug}>
            <LightsAndFog skyColor={"#c1f2ff"} />

            <ChunkProvider>
              <ChunkRenderer />
              <BirchTreesForChunks />
              <RocksForChunks />
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
