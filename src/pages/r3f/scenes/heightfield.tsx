import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { ChunkProvider } from "@r3f/ChunkGenerationSystem/ChunkProvider";
import { ChunkRenderer } from "@r3f/ChunkGenerationSystem/ChunkRenderer";
import { physicsDebug } from "@r3f/ChunkGenerationSystem/config";
import { getHeight } from "@r3f/ChunkGenerationSystem/getHeight";
import { KeyboardControlledScene } from "src/canvas/Helpers/SceneLoader";
import { MinecraftSpectatorController } from "@r3f/Controllers/MinecraftCreativeController";
import { LightsAndFog } from "@r3f/Helpers/LightsAndFog";
import { RigidBallSpawner } from "@r3f/Helpers/RigidBall";
import { Physics } from "@react-three/rapier";

const seoInfo = {
  title: "Infinite Heightfield Demo with Physics",
  description:
    "In this demo I tried building an infinite procedural terrain plane extending beyond the horizon. The terrain is generated using a heightfield algorithm and the terrain should extend while the player moves making it effectively infinite.",
  url: "/r3f/scenes/heightfield",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/heightfield.png",
  imageAlt:
    "a simple heightfield of rolling hills stretching into the distance",
};

export default function Page() {
  const { height: y } = getHeight(0, 0);
  return (
    <ThreeFiberLayout {...seoInfo}>
      <KeyboardControlledScene camera={{ position: [0, 100, 0] }}>
        <Physics debug={physicsDebug}>
          <LightsAndFog skyColor={"#c1f2ff"} />
          <MinecraftSpectatorController />

          <ChunkProvider>
            <ChunkRenderer />
          </ChunkProvider>
          <RigidBallSpawner />
        </Physics>
      </KeyboardControlledScene>
    </ThreeFiberLayout>
  );
}
