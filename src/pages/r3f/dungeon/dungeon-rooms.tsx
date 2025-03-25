import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { perf } from "@r3f/ChunkGenerationSystem/config";
import { CanvasWithKeyboardInput } from "@r3f/Controllers/KeyboardControls";
import { MinecraftSpectatorController } from "@r3f/Controllers/MinecraftCreativeController";
import { CameraPositionLogger } from "@r3f/Helpers/CameraPositionLogger";
import { DungeonFromLayout } from "@r3f/Dungeon/DungeonRoomsWithInstancing";
import { generateCustomDungeon } from "@r3f/Dungeon/ProceduralDungeonGenerator";
import {
  Bloom,
  EffectComposer,
  ToneMapping,
} from "@react-three/postprocessing";
import { Perf } from "r3f-perf";

export default function Page() {
  const backgroundColor = "#191616";
  const viewDistance = 30;
  const components = generateCustomDungeon({
    minRooms: 10,
    maxRooms: 15,
    torches: true,
    torchInterval: 5,
    complexity: 70,
    sparseness: 40,
    roomDistribution: {
      small: 25,
      medium: 40,
      large: 25,
      hall: 10,
    },
    corridorWidthRange: [1, 2],
    corridorLengthRange: [2, 4],
  });

  return (
    // <ThreeFiberLayout>
    <div className="w-screen h-screen">
      <CanvasWithKeyboardInput
        camera={{ position: [0, 10, 0], near: 0.1, far: viewDistance }}
      >
        <fog attach="fog" args={[backgroundColor, 0.1, viewDistance]} />
        <color attach="background" args={[backgroundColor]} />
        {/* {perf && <Perf position="bottom-right" />} */}
        <DungeonFromLayout components={components} />
        <CameraPositionLogger />

        <EffectComposer>
          <Bloom mipmapBlur luminanceThreshold={1} levels={8} intensity={4} />
          <ToneMapping />
        </EffectComposer>

        <MinecraftSpectatorController
          initialPosition={[0, 25, 0]}
          speed={0.5}
        />
      </CanvasWithKeyboardInput>
    </div>
    // </ThreeFiberLayout>
  );
}
