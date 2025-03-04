import {
  physicsDebug,
  tileSize,
} from "@components/canvas/ChunkGenerationSystem/config";
import { MinecraftCreativeController } from "@components/canvas/Controllers/MinecraftCreativeController";
import { KeyboardControlsProvider } from "@components/canvas/Controllers/KeyboardControls";
import { InstancedTrees } from "@components/canvas/InstancedMeshSystem/InstancedRocks";
import { Sky } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Perf } from "r3f-perf";
import { Color } from "three";

const lensflareProps = {
  enabled: true,
  opacity: 1.0,
  position: { x: -25, y: 50, z: -100 },
  glareSize: 0.35,
  starPoints: 6.0,
  animated: true,
  followMouse: false,
  anamorphic: false,
  colorGain: new Color(56, 22, 11),

  flareSpeed: 0.4,

  flareShape: 0.1,

  flareSize: 0.005,

  secondaryGhosts: true,
  ghostScale: 0.1,
  aditionalStreaks: true,

  starBurst: true,
  haloScale: 0.5,
  step: 0.01,
};

const Page = () => {
  const skyColor = "#85c7f9";
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <KeyboardControlsProvider>
        <Canvas>
          <Perf position="top-left" />
          <Physics debug={physicsDebug}>
            <hemisphereLight intensity={0.35} />
            <ambientLight intensity={1.0} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <fogExp2 attach="fog" args={[skyColor, 0.008]} />
            {/* <fog attach="fog" args={[skyColor, 0.8, 50]} /> */}
            <color args={[skyColor]} attach="background" />
            <group position={[-tileSize / 2, 0, -tileSize / 2]}>
              {/* <InstancedRocks /> */}
              <InstancedTrees />
            </group>
            <gridHelper args={[tileSize, 100]} />

            <Sky />
            <MinecraftCreativeController speed={25} />
          </Physics>
        </Canvas>
      </KeyboardControlsProvider>
    </div>
  );
};

export default Page;
