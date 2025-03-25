import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { FixedLightningStrike, LightningRay } from "@r3f/Helpers/LightningRay";
import { OrbitControls, Stage } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  ToneMapping,
} from "@react-three/postprocessing";
import { useRef } from "react";
import { DoubleSide, Vector3 } from "three";

const seoInfo = {
  title: "Lightning Strike - Three.js + React Three Fiber",
  description: "Lightning Strike - Three.js + React Three Fiber",
  url: "/r3f/lightning-strike",
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
  image: "/assets/pages/lightning-strike.png",
  imageAlt: "Image of a lightning strike in a 3D scene",
};

const Demo = () => {
  const rayParams = {
    sourceOffset: new Vector3(),
    destOffset: new Vector3(50, 0, 0),
    radius0: 0.4,
    radius1: 0.4,
    minRadius: 1.5,
    maxRadius: 2,
    maxIterations: 7,
    isEternal: true,

    timeScale: 0.7,

    propagationTimeFactor: 0.05,
    vanishingTimeFactor: 0.95,
    subrayPeriod: 3.5,
    subrayDutyCycle: 0.6,
    maxSubrayRecursion: 3,
    ramification: 7,
    recursionProbability: 0.6,

    roughness: 0.85,
    straightness: 0.6,
  };

  const lightningColor = "#70e0ff";

  const ref = useRef<FixedLightningStrike>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rayParameters.sourceOffset!.y = Math.sin(t) * 10;
    ref.current.rayParameters.destOffset!.y = Math.cos(t) * 10;
  });

  return (
    <LightningRay {...rayParams} ref={ref}>
      <meshStandardMaterial
        color={lightningColor}
        emissive={lightningColor}
        emissiveIntensity={4}
        side={DoubleSide}
      />
    </LightningRay>
  );
};

export default function Page() {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <Canvas>
        <color attach="background" args={["#0a0a0a"]} />
        <ambientLight intensity={0.5} />

        <Stage adjustCamera>
          <Demo />
        </Stage>

        <EffectComposer>
          <Bloom mipmapBlur luminanceThreshold={1} levels={8} intensity={4} />
          <ToneMapping />
        </EffectComposer>
        <OrbitControls />
      </Canvas>
    </ThreeFiberLayout>
  );
}
