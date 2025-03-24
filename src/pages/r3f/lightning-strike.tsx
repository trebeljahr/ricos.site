import { ThreeFiberLayout } from "@components/dom/Layout";
import { FixedLightningStrike, LightningRay } from "@r3f/Helpers/LightningRay";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  ToneMapping,
} from "@react-three/postprocessing";
import { set } from "date-fns";
import { useEffect, useState } from "react";
import { DoubleSide, Vector3 } from "three";
import { LightningStrike, RayParameters } from "three-stdlib";

const SingleLightningStrike = ({
  source,
  target,
}: {
  source: Vector3;
  target: Vector3;
}) => {
  const rayParams: RayParameters = {
    sourceOffset: source,
    destOffset: target,
    radius0: 0.04,
    radius1: 0.04,
    minRadius: 1.5,
    maxIterations: 7,
    isEternal: false,
    birthTime: 0.0,
    deathTime: 1.0,

    timeScale: 1,

    propagationTimeFactor: 0.1,
    vanishingTimeFactor: 0.8,
    subrayPeriod: 7,
    subrayDutyCycle: 2.0,

    maxSubrayRecursion: 3,
    ramification: 7,
    recursionProbability: 0.7,

    roughness: 0.5,
    straightness: 0.7,
    onSubrayCreation(segment, parentSubray, childSubray, lightningStrike) {
      const heightFactor = 0.5;
      const sideWidthFactor = 0.3;
      const minSideWidthFactor = 0.1;

      const random1 = (lightningStrike as FixedLightningStrike).randomGenerator
        .random;

      childSubray.pos0.copy(segment.pos0);

      const vec1Pos = new Vector3();
      const vec2Forward = new Vector3();
      const vec3Side = new Vector3();
      const vec4Up = new Vector3();
      const targetDirection = new Vector3();

      targetDirection.subVectors(parentSubray.pos1, segment.pos0).normalize();

      vec1Pos.subVectors(parentSubray.pos1, parentSubray.pos0);
      vec2Forward.copy(vec1Pos).normalize();

      vec1Pos.multiplyScalar(
        segment.fraction0 +
          (1 - segment.fraction0) * ((2 * random1() - 1) * heightFactor)
      );
      const length = vec1Pos.length();

      vec3Side.crossVectors(parentSubray.up0, targetDirection);
      const angle = 2 * Math.PI * random1();
      vec3Side.multiplyScalar(Math.cos(angle));
      vec4Up.copy(parentSubray.up0).multiplyScalar(Math.sin(angle));

      const blendFactor = 0.7;

      const blendedDirection = new Vector3()
        .copy(vec2Forward)
        .multiplyScalar(1 - blendFactor)
        .add(targetDirection.multiplyScalar(blendFactor))
        .normalize();

      childSubray.pos1
        .copy(vec3Side)
        .add(vec4Up)
        .multiplyScalar(
          length *
            sideWidthFactor *
            (minSideWidthFactor + random1() * (1 - minSideWidthFactor))
        )
        .add(blendedDirection.multiplyScalar(length))
        .add(segment.pos0);

      childSubray.radius1 = childSubray.radius0 * 0.7;
    },
  };

  const lightningColor = "#70ff7c";

  return (
    <LightningRay {...rayParams}>
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

  const [singleLightningStrike, setSingleLightningStrike] = useState({
    source: new Vector3(0, 0, 0),
    target: new Vector3(0, 0, 0),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const source = new Vector3(0, 0, 0);
      const target = new Vector3(Math.random() * 100, Math.random() * 100, 0);
      setSingleLightningStrike({ source, target });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);
  return (
    <ThreeFiberLayout>
      <Canvas>
        <color attach="background" args={["#101010"]} />
        <ambientLight intensity={0.5} />
        <group>
          <SingleLightningStrike
            source={singleLightningStrike.source}
            target={singleLightningStrike.target}
          />

          <SingleLightningStrike
            source={singleLightningStrike.source}
            target={singleLightningStrike.target}
          />

          <SingleLightningStrike
            source={singleLightningStrike.source}
            target={singleLightningStrike.target}
          />
        </group>

        {/* <LightningRay {...rayParams}>
          <meshStandardMaterial
            color={lightningColor}
            emissive={lightningColor}
            emissiveIntensity={4}
            side={DoubleSide}
          />
        </LightningRay> */}
        <EffectComposer>
          <Bloom mipmapBlur luminanceThreshold={1} levels={8} intensity={4} />
          <ToneMapping />
        </EffectComposer>
        <OrbitControls />
      </Canvas>
    </ThreeFiberLayout>
  );
}
