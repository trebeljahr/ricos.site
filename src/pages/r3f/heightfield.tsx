import { ThreeFiberLayout } from "@components/dom/Layout";
import {
  ChunkProvider,
  MemoizedChunk,
  useChunkContext,
} from "@r3f/ChunkGenerationSystem/ChunkProvider";
import { tileSize } from "@r3f/ChunkGenerationSystem/config";
import { DebugTile } from "@r3f/ChunkGenerationSystem/WorldManager";
import { CanvasWithKeyboardInput } from "@r3f/Controllers/KeyboardControls";
import { MinecraftCreativeController } from "@r3f/Controllers/MinecraftCreativeController";
import { HeightfieldTileWithCollider } from "@r3f/Scenes/HeightfieldTileWithCollider";
import { Physics } from "@react-three/rapier";

const ChunkRenderer = () => {
  const chunks = useChunkContext();

  return (
    <group>
      {Array.from(chunks).map(([key, chunkData]) => {
        return (
          <MemoizedChunk key={key} chunkData={chunkData}>
            <DebugTile position={chunkData.position} />
            <HeightfieldTileWithCollider
              size={tileSize}
              resolution={chunkData.resolution}
              position={chunkData.position}
            />
          </MemoizedChunk>
        );
      })}
    </group>
  );
};

export default function Page() {
  return (
    <ThreeFiberLayout>
      <CanvasWithKeyboardInput>
        <color attach="background" args={["skyblue"]} />
        <ambientLight intensity={2} />
        <hemisphereLight intensity={0.5} />
        <Physics>
          <MinecraftCreativeController />
          <ChunkProvider>
            <ChunkRenderer />
          </ChunkProvider>
        </Physics>
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
