import { ThreeFiberLayout } from "@components/dom/Layout";
import { LightningRay } from "@r3f/Helpers/Lightning";
import { OrbitControls } from "@react-three/drei";
import { Canvas, extend, ReactThreeFiber, useFrame } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  ToneMapping,
} from "@react-three/postprocessing";
import { useRef } from "react";
import { DoubleSide, Vector3 } from "three";
import { LightningStrike, RayParameters } from "three-stdlib";

export default function Page() {
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

  return (
    <ThreeFiberLayout>
      <Canvas>
        <color attach="background" args={["#101010"]} />
        <ambientLight intensity={0.5} />

        <LightningRay {...rayParams}>
          <meshStandardMaterial
            color={lightningColor}
            emissive={lightningColor}
            emissiveIntensity={4}
            side={DoubleSide}
          />
        </LightningRay>
        <EffectComposer>
          <Bloom mipmapBlur luminanceThreshold={1} levels={8} intensity={4} />
          <ToneMapping />
        </EffectComposer>
        <OrbitControls />
      </Canvas>
    </ThreeFiberLayout>
  );
}
