import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
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
import { HeightfieldTileWithCollider } from "@r3f/Scenes/HeightfieldTileWithCollider";
import { LightsAndFog } from "@r3f/Helpers/LightsAndFog";
import { Physics } from "@react-three/rapier";
import { Material } from "three";
import { ChunkRenderer } from "@r3f/ChunkGenerationSystem/ChunkRenderer";

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

export default function Page() {
  const { height: y } = getHeight(0, 0);
  return (
    <ThreeFiberLayout {...seoInfo}>
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
