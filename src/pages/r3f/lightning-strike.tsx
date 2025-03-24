import { ThreeFiberLayout } from "@components/dom/Layout";
import { OrbitControls } from "@react-three/drei";
import { Canvas, extend, ReactThreeFiber, useFrame } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  ToneMapping,
} from "@react-three/postprocessing";
import { useRef } from "react";
import { Vector3 } from "three";
import { LightningStrike, RayParameters } from "three-stdlib";

declare module "@react-three/fiber" {
  interface ThreeElements {
    lightningStrikeGeometry: ReactThreeFiber.Node<
      LightningStrike,
      typeof LightningStrike
    >;
  }
}

extend({ LightningStrikeGeometry: LightningStrike });

const LightningRay = (rayParameters: RayParameters) => {
  const lightningColor = "#70e0ff";
  //   if (rayParameters) {
  //     rayParameters.timeScale = 2;
  //     rayParameters.destOffset = new Vector3(0, 0, 50);
  //   }
  const ref = useRef<LightningStrike & typeof LightningStrike>(null!);

  const srcOffset = useRef(new Vector3(0, 0, 0));
  const destOffset = useRef(new Vector3(0, 0, 50));

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (!ref.current) return;

    ref.current.update(time);
    // console.log(ref.current);

    ref.current.copyParameters({
      sourceOffset: srcOffset.current,
      destOffset: destOffset.current.setY(Math.sin(time) * 10),
    });
  });

  return (
    <mesh>
      <lightningStrikeGeometry args={[{ ...rayParameters }]} ref={ref} />
      <meshStandardMaterial
        color={lightningColor}
        emissive={lightningColor}
        emissiveIntensity={4}
        transparent
        opacity={0.5}
      />
    </mesh>
  );
};

export default function Page() {
  const rayParams = {
    sourceOffset: new Vector3(),
    destOffset: new Vector3(),
    radius0: 4,
    radius1: 4,
    minRadius: 2.5,
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

  return (
    <ThreeFiberLayout>
      <Canvas>
        <color attach="background" args={["#101010"]} />
        <ambientLight intensity={0.5} />

        <LightningRay {...rayParams} />
        <EffectComposer>
          <Bloom mipmapBlur luminanceThreshold={1} levels={8} intensity={4} />
          <ToneMapping />
        </EffectComposer>
        <OrbitControls />
      </Canvas>
    </ThreeFiberLayout>
  );
}

//   if (rayParameters) {
// rayParameters.timeScale = 2;
// rayParameters.isStatic = false;
// rayParameters.isEternal = false;
//   }

//     const rayParameters: RayParameters = {
//      sourceOffset,
//      destOffset,
//      timeScale: ,
//      roughness: ,
//      straightness: ,
//      up0: ,
//      up1: ,
//      radius0: ,
//      radius1: ,
//      radius0Factor: ,
//      radius1Factor: ,
//      minRadius: ,
//      isEternal: ,
//      birthTime: ,
//      deathTime: ,
//      propagationTimeFactor: ,
//      vanishingTimeFactor: ,
//      subrayPeriod: ,
//      subrayDutyCycle: ,
//      maxIterations: ,
//      isStatic: ,
//      ramification: ,
//      maxSubrayRecursion: ,
//      recursionProbability: ,
//      generateUVs: ,
//   };
// }
