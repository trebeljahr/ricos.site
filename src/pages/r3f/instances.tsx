import { ThreeFiberLayout } from "@components/dom/Layout";
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

const Page = () => {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <KeyboardControlsProvider>
        <Canvas>
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
        </Canvas>
      </KeyboardControlsProvider>
    </ThreeFiberLayout>
  );
};

export default Page;
