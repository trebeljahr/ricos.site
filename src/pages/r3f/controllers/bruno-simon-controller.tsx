import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { ChunkProvider } from "@r3f/ChunkGenerationSystem/ChunkProvider";
import { ChunkRenderer } from "@r3f/ChunkGenerationSystem/ChunkRenderer";
import { BrunoSimonController } from "@r3f/Controllers/BrunoSimonController";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { physicsDebug } from "src/canvas/ChunkGenerationSystem/config";
import {
  CanvasWithKeyboardInput,
  KeyboardControlsProvider,
} from "src/canvas/Controllers/KeyboardControls";
import { MeshStandardMaterial } from "three";

const seoInfo = {
  title: "Bruno Simon's Third Person Controller",
  description:
    "This is a demo of Bruno Simon's third person controller, taken from his Infinite World Example but ported to work with R3F.",
  url: "/r3f/controllers/bruno-simon-controller",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/r3f/bruno-simon-controller.png",
  imageAlt: "girl standing in a simple 3D terrain",
};

const Page = () => {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <CanvasWithKeyboardInput>
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
      </CanvasWithKeyboardInput>
    </ThreeFiberLayout>
  );
};

export default Page;
