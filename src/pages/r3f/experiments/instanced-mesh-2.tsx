import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { SceneWithLoadingState } from "@r3f/Helpers/SceneWithLoadingState";
import { Sky } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Perf } from "r3f-perf";
import {
  perf,
  physicsDebug,
  tileSize,
} from "src/canvas/ChunkGenerationSystem/config";
import { KeyboardControlsProvider } from "src/canvas/Controllers/KeyboardControls";
import { MinecraftSpectatorController } from "src/canvas/Controllers/MinecraftCreativeController";
import { InstancedTreesWithMultiMaterial } from "src/canvas/InstancedMeshSystem/InstancedRocks";

const seoInfo = {
  title: "A test of the InstancedMesh2 Library",
  description:
    "You can spawn a bunch of trees with this system by pressing the f key. You can also remove trees again by presing the g key.",
  url: "/r3f/experiments/instanced-mesh-2",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/instanced-mesh-2.png",
  imageAlt: "a 3D scene with a bunch of trees",
};

const Page = () => {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <KeyboardControlsProvider>
        <SceneWithLoadingState>
          {perf && <Perf position="bottom-right" />}
          <Physics debug={physicsDebug}>
            <hemisphereLight intensity={0.35} />
            <ambientLight intensity={1.0} />
            <directionalLight position={[10, 10, 5]} intensity={1} />

            <group position={[-tileSize / 2, 0, -tileSize / 2]}>
              <InstancedTreesWithMultiMaterial />
            </group>
            <gridHelper args={[tileSize, 100]} />

            <Sky />
            <MinecraftSpectatorController speed={1} />
          </Physics>
        </SceneWithLoadingState>
      </KeyboardControlsProvider>
    </ThreeFiberLayout>
  );
};

export default Page;
