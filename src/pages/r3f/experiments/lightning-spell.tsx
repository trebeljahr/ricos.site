import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { Cat } from "@r3f/AllModels/Cat";
import { useSword4, useSword6 } from "@r3f/Dungeon/Enemies/Swords";
import { FixedLightningStrike, LightningRay } from "@r3f/Helpers/LightningRay";
import { Box, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  ToneMapping,
} from "@react-three/postprocessing";
import { set } from "date-fns";
import { useEffect, useState } from "react";
import { DoubleSide, Mesh, Raycaster, Vector3 } from "three";
import { LightningStrike, RayParameters } from "three-stdlib";

const SingleLightningStrikHittingMesh = ({
  source,
  targetMesh,
}: {
  source: Vector3;
  targetMesh: Mesh;
}) => {
  const raycaster = new Raycaster();
  const direction = new Vector3();

  const targetBox = targetMesh.geometry.boundingBox?.clone();
  targetBox?.applyMatrix4(targetMesh.matrixWorld);
  if (!targetBox) return null;

  const randomTarget = new Vector3(
    Math.random() * (targetBox.max.x - targetBox.min.x) + targetBox.min.x,
    Math.random() * (targetBox.max.y - targetBox.min.y) + targetBox.min.y,
    Math.random() * (targetBox.max.z - targetBox.min.z) + targetBox.min.z
  );

  direction.subVectors(randomTarget, source).normalize();
  raycaster.set(source, direction);

  const intersects = raycaster.intersectObject(targetMesh, true);

  let destPoint;
  if (intersects.length > 0) {
    destPoint = intersects[0].point;
  } else {
    destPoint = randomTarget;
  }

  const rayParams: RayParameters = {
    sourceOffset: source,
    destOffset: destPoint,
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
    onSubrayCreation: function (
      segment,
      parentSubray,
      childSubray,
      lightningStrike
    ) {
      const typedLightningStrike = lightningStrike as FixedLightningStrike;
      const randomFn = typedLightningStrike.randomGenerator.random;

      // Start position
      childSubray.pos0.copy(segment.pos0);

      // Vectors for calculation
      const vec1Pos = new Vector3();
      const vec2Forward = new Vector3();
      const vec3Side = new Vector3();
      const vec4Up = new Vector3();

      // Calculate direction toward mesh surface
      vec1Pos.subVectors(parentSubray.pos1, parentSubray.pos0);
      vec2Forward.copy(vec1Pos).normalize();

      // Get position along parent ray
      const segmentFraction =
        segment.fraction0 +
        (1 - segment.fraction0) * ((2 * randomFn() - 1) * 0.5);
      vec1Pos.multiplyScalar(segmentFraction);
      const length = vec1Pos.length();

      // Side vector for spread
      vec3Side.crossVectors(parentSubray.up0, vec2Forward);
      const angle = 2 * Math.PI * randomFn();
      vec3Side.multiplyScalar(Math.cos(angle));
      vec4Up.copy(parentSubray.up0).multiplyScalar(Math.sin(angle));

      // Determine a potential end position
      const potentialEnd = new Vector3()
        .copy(vec3Side)
        .add(vec4Up)
        .multiplyScalar(length * 0.3 * (0.1 + randomFn() * 0.9))
        .add(vec2Forward.clone().multiplyScalar(length))
        .add(segment.pos0);

      // Check if this potential end intersects the mesh
      const subRayDirection = new Vector3()
        .subVectors(potentialEnd, childSubray.pos0)
        .normalize();
      raycaster.set(childSubray.pos0, subRayDirection);
      const subIntersects = raycaster.intersectObject(targetMesh, true);

      if (subIntersects.length > 0) {
        childSubray.pos1.copy(subIntersects[0].point);
      } else {
        childSubray.pos1.copy(potentialEnd);
      }
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

      const typedLightningStrike = lightningStrike as FixedLightningStrike;
      const randomFn = typedLightningStrike.randomGenerator.random;

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
          (1 - segment.fraction0) * ((2 * randomFn() - 1) * heightFactor)
      );
      const length = vec1Pos.length();

      vec3Side.crossVectors(parentSubray.up0, targetDirection);
      const angle = 2 * Math.PI * randomFn();
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
            (minSideWidthFactor + randomFn() * (1 - minSideWidthFactor))
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
  image: "/assets/pages/lightning-spell",
  imageAlt: "Image of a lightning strike in a 3D scene",
};

export default function Page() {
  const [singleLightningStrike, setSingleLightningStrike] = useState({
    source: new Vector3(0, 0, 0),
    target: new Vector3(0, 0, 0),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const source = new Vector3(5, 0, 0);
      const target = new Vector3(Math.random() * 100, Math.random() * 100, 0);
      setSingleLightningStrike({ source, target });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const sword = useSword4();

  return (
    <ThreeFiberLayout {...seoInfo}>
      <Canvas>
        <color attach="background" args={["#f2f2f2"]} />
        <ambientLight intensity={0.5} />
        <group>
          <group>
            <SingleLightningStrikHittingMesh
              source={singleLightningStrike.source}
              targetMesh={sword}
            />
          </group>
          <primitive object={sword} scale={200} rotation-z={Math.PI / 2} />
        </group>
        <EffectComposer>
          <Bloom mipmapBlur luminanceThreshold={1} levels={8} intensity={4} />
          <ToneMapping />
        </EffectComposer>
        <OrbitControls />
      </Canvas>
    </ThreeFiberLayout>
  );
}
