import { ThreeFiberLayout } from "@components/dom/Layout";
import { ChunkProvider } from "@r3f/ChunkGenerationSystem/ChunkProvider";
import { BrunoSimonController } from "@r3f/Controllers/BrunoSimonController";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { physicsDebug } from "src/canvas/ChunkGenerationSystem/config";
import { KeyboardControlsProvider } from "src/canvas/Controllers/KeyboardControls";
import { ChunkRenderer } from "./heightfield";
import { MeshStandardMaterial } from "three";

const Page = () => {
  return (
    <ThreeFiberLayout>
      <KeyboardControlsProvider>
        <Canvas>
          <Physics debug={physicsDebug}>
            <hemisphereLight intensity={0.35} />
            <ambientLight intensity={1.0} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <fogExp2 attach="fog" args={["#f0f0f0", 0.008]} />
            <color args={["#f0f0f0"]} attach="background" />

            <ChunkProvider>
              <ChunkRenderer
                material={
                  new MeshStandardMaterial({
                    color: "#8bcd5c",
                    roughness: 0.7,
                    metalness: 0.2,
                    wireframe: false,
                  })
                }
              />
            </ChunkProvider>
          </Physics>
          <BrunoSimonController />
        </Canvas>
      </KeyboardControlsProvider>
    </ThreeFiberLayout>
  );
};

export default Page;
