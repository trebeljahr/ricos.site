import { ThreeFiberLayout } from "@components/dom/Layout";
import {
  ChunkProvider,
  MemoizedChunk,
  useChunkContext,
} from "@r3f/ChunkGenerationSystem/ChunkProvider";
import {
  debug,
  physicsDebug,
  tilesDistance,
  tileSize,
} from "@r3f/ChunkGenerationSystem/config";
import { DebugTile } from "@r3f/ChunkGenerationSystem/DebugTile";
import { getHeight } from "@r3f/ChunkGenerationSystem/TerrainTile";
import { EcctrlController } from "@r3f/Controllers/EcctrlController";
import { CanvasWithKeyboardInput } from "@r3f/Controllers/KeyboardControls";
import { RigidBallSpawner } from "@r3f/Helpers/RigidBall";
import { HeightfieldTileWithCollider } from "@r3f/Scenes/HeightfieldTileWithCollider";
import { Physics } from "@react-three/rapier";

export const ChunkRenderer = () => {
  const chunks = useChunkContext();

  return (
    <group>
      {Array.from(chunks).map(([key, chunkData]) => {
        return (
          <MemoizedChunk key={key} chunkData={chunkData}>
            <group position={[0, 0, 0]}>
              {debug && <DebugTile position={chunkData.position} />}
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
  const intensity = 10;
  const height = 10;

  return (
    <>
      <directionalLight
        intensity={intensity}
        position={[-tileSize, height, -tileSize]}
        color={"#808080"}
        target-position={[0, 0, 0]}
        castShadow={false}
      />
      <directionalLight
        intensity={intensity}
        position={[tileSize, height, -tileSize]}
        color="#404040"
        target-position={[0, 0, 0]}
        castShadow={false}
      />
    </>
  );
};

export default function Page() {
  const skyColor = "#c1f2ff";
  const { height: y } = getHeight(0, 0);
  return (
    <ThreeFiberLayout>
      <CanvasWithKeyboardInput camera={{ position: [0, 100, 0] }}>
        <color attach="background" args={[skyColor]} />
        {/* <ambientLight intensity={0.5} /> */}
        <ambientLight intensity={0.1} />
        <hemisphereLight
          intensity={0.1}
          // color={"#c1f2ff"}
          // groundColor={"#58cc0a"}
        />
        <fog
          attach="fog"
          args={[skyColor, 0, tileSize * (tilesDistance - 1)]}
        />

        <OverheadLights />

        <Physics debug={physicsDebug}>
          {/* <MinecraftCreativeController speed={30} /> */}
          <EcctrlController position={[0, y + 1, 0]} />

          <ChunkProvider>
            <ChunkRenderer />
          </ChunkProvider>
          <RigidBallSpawner />
        </Physics>
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
