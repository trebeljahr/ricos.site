import {
  physicsDebug,
  tilesDistance,
  tileSize,
} from "@components/canvas/ChunkGenerationSystem/config";
import { WorldManager } from "@components/canvas/ChunkGenerationSystem/WorldManager";
import { MinecraftCreativeController } from "@components/canvas/Controllers/MinecraftCreativeController";
import { KeyboardControlsProvider } from "@components/canvas/Controllers/KeyboardControls";
import { Bvh, Sky } from "@react-three/drei";
import { Sky as SkyImpl } from "three-stdlib";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Perf } from "r3f-perf";
import { Color } from "three";
import {
  Bloom,
  EffectComposer,
  SMAA,
  Vignette,
} from "@react-three/postprocessing";
import LensFlare from "@components/canvas/Effects/Lensflare";
import { useRef } from "react";
import { ThreeFiberLayout } from "@components/dom/Layout";

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

const MovingSky = () => {
  const skyRef = useRef<SkyImpl>(null!);
  useFrame(({ camera }) => {
    if (!skyRef.current) return;
    skyRef.current.position.copy(camera.position);
  });
  return <Sky ref={skyRef} />;
};

const Page = () => {
  const skyColor = "#d4e7f5";
  return (
    <ThreeFiberLayout>
      <KeyboardControlsProvider>
        <Canvas camera={{ near: 0.1, far: tileSize * (tilesDistance - 1) }}>
          <Perf position="bottom-right" />
          <Physics debug={physicsDebug}>
            <hemisphereLight intensity={0.35} />
            <ambientLight intensity={1.0} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <fogExp2 attach="fog" args={[skyColor, 0.015]} />
            {/* <fog attach="fog" args={[skyColor, 0.8, 50]} /> */}
            <color args={[skyColor]} attach="background" />
            {/* <Bvh> */}
            <WorldManager />
            {/* </Bvh> */}
            <MovingSky />
            <MinecraftCreativeController speed={25} />
          </Physics>

          {/* <EffectComposer>
            <LensFlare
              {...lensflareProps}
              dirtTextureFile={"/3d-assets/textures/lensDirtTexture.png"}
            />
            <Vignette />
            <Bloom
              mipmapBlur
              radius={0.9}
              luminanceThreshold={0.966}
              intensity={2}
              levels={4}
            />
            <SMAA />
          </EffectComposer> */}
        </Canvas>
      </KeyboardControlsProvider>
    </ThreeFiberLayout>
  );
};

export default Page;
