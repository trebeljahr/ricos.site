import {
  physicsDebug,
  tileSize,
} from "@components/canvas/ChunkGenerationSystem/config";
import { WorldManager } from "@components/canvas/ChunkGenerationSystem/WorldManager";
import { MinecraftCreativeControlsPlayer } from "@components/canvas/FlyingPlayer";
import { KeyboardControlsProvider } from "@components/canvas/Scene";
import { Bvh, Sky } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Perf } from "r3f-perf";
import { Color } from "three";
import {
  Bloom,
  EffectComposer,
  SMAA,
  Vignette,
} from "@react-three/postprocessing";
import LensFlare from "@components/canvas/Lensflare";
import { InstancedRocks } from "@components/canvas/Trees/InstancedRocks";
import { CameraHelperComponent } from "@components/canvas/Trees/CameraHelper";

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
            {/* <CameraHelperComponent /> */}
            <group position={[-tileSize / 2, 0, -tileSize / 2]}>
              <InstancedRocks />
            </group>
            <gridHelper args={[tileSize, 100]} />

            <Sky />
            <MinecraftCreativeControlsPlayer speed={25} />
          </Physics>
        </Canvas>
      </KeyboardControlsProvider>
    </div>
  );
};

export default Page;
