import { ThreeFiberLayout } from "@components/dom/Layout";
import { perf } from "@r3f/ChunkGenerationSystem/config";
import { CanvasWithKeyboardInput } from "@r3f/Controllers/KeyboardControls";
import { MinecraftCreativeController } from "@r3f/Controllers/MinecraftCreativeController";
import { DungeonFromLayout } from "@r3f/Scenes/DungeonRoomsWithInstancing";
import { OrbitControls, Stage } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { Perf } from "r3f-perf";

export default function Page() {
  return (
    <ThreeFiberLayout>
      <CanvasWithKeyboardInput camera={{ position: [0, 20, 0] }}>
        <ambientLight intensity={2} />
        <directionalLight intensity={1} />
        <color attach="background" args={["#fbf1d1"]} />
        {perf && <Perf position="bottom-right" />}
        <DungeonFromLayout />

        <Physics>
          <MinecraftCreativeController
            initialPosition={[0, 30, 0]}
            speed={25}
          />
        </Physics>
        {/* <OrbitControls /> */}
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
}
