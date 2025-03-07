import { ThreeFiberLayout } from "@components/dom/Layout";
import {
  ChunkProvider,
  MemoizedChunk,
  useChunkContext,
} from "@r3f/ChunkGenerationSystem/ChunkProvider";
import { tileSize } from "@r3f/ChunkGenerationSystem/config";
import { DebugTile } from "@r3f/ChunkGenerationSystem/DebugTile";
import { CanvasWithKeyboardInput } from "@r3f/Controllers/KeyboardControls";
import { MinecraftCreativeController } from "@r3f/Controllers/MinecraftCreativeController";
import { HeightfieldTileWithCollider } from "@r3f/Scenes/HeightfieldTileWithCollider";
import { OrbitControls, Sky } from "@react-three/drei";
import { Physics } from "@react-three/rapier";

const ChunkRenderer = () => {
  const chunks = useChunkContext();

  return (
    <group>
      {Array.from(chunks).map(([key, chunkData]) => {
        return (
          <MemoizedChunk key={key} chunkData={chunkData}>
            <group position={[0, 0, 0]}>
              <DebugTile position={chunkData.position} />
              <HeightfieldTileWithCollider
                size={tileSize}
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

const OverheadLights = () => {
  const intensity = 100;
  const height = 0;
  return (
    <>
      <directionalLight
        intensity={intensity}
        position={[-100, height, -100]}
        color={"#808080"}
        target-position={[0, 0, 0]}
        castShadow={false}
      />
      <directionalLight
        intensity={intensity}
        position={[100, height, -100]}
        color="#404040"
        target-position={[0, 0, 0]}
        castShadow={false}
      />
    </>
  );
};

export default function Page() {
  return (
    <ThreeFiberLayout>
      <CanvasWithKeyboardInput camera={{ position: [0, 100, 0] }}>
        <color attach="background" args={["skyblue"]} />
        {/* <ambientLight intensity={0.5} />
        <hemisphereLight
          intensity={0.5}
          color={"#c1f2ff"}
          groundColor={"#58cc0a"}
        /> */}
        {/* <Sky sunPosition={[100, 10, 100]} /> */}

        <OverheadLights />

        <Physics>
          <MinecraftCreativeController speed={30} />
          <ChunkProvider>
            <ChunkRenderer />
          </ChunkProvider>
        </Physics>
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
