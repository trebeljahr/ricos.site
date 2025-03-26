import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { useSword4 } from "@r3f/Dungeon/Enemies/Swords";
import { FixedLightningStrike, LightningRay } from "@r3f/Helpers/LightningRay";
import { SceneWithLoadingState } from "@r3f/Helpers/SceneWithLoadingState";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import {
  Bloom,
  EffectComposer,
  ToneMapping,
} from "@react-three/postprocessing";
import { useEffect, useState } from "react";
import { DoubleSide, Mesh, Raycaster, Vector3 } from "three";
import { RayParameters } from "three-stdlib";

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

      childSubray.pos0.copy(segment.pos0);

      const vec1Pos = new Vector3();
      const vec2Forward = new Vector3();
      const vec3Side = new Vector3();
      const vec4Up = new Vector3();

      vec1Pos.subVectors(parentSubray.pos1, parentSubray.pos0);
      vec2Forward.copy(vec1Pos).normalize();

      const segmentFraction =
        segment.fraction0 +
        (1 - segment.fraction0) * ((2 * randomFn() - 1) * 0.5);
      vec1Pos.multiplyScalar(segmentFraction);
      const length = vec1Pos.length();

      vec3Side.crossVectors(parentSubray.up0, vec2Forward);
      const angle = 2 * Math.PI * randomFn();
      vec3Side.multiplyScalar(Math.cos(angle));
      vec4Up.copy(parentSubray.up0).multiplyScalar(Math.sin(angle));

      const potentialEnd = new Vector3()
        .copy(vec3Side)
        .add(vec4Up)
        .multiplyScalar(length * 0.3 * (0.1 + randomFn() * 0.9))
        .add(vec2Forward.clone().multiplyScalar(length))
        .add(segment.pos0);

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

const seoInfo = {
  title: "Lightning Spell Example",
  description:
    "A simple example of a lightning spell hitting a 3D object implemented in three.js and react-three-fiber.",
  url: "/r3f/experiments/lightning-spell",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/lightning-spell.png",
  imageAlt: "a lightning strike spell hitting an enemy in a 3D scene",
};

const DemoScene = () => {
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
    <group>
      <group>
        <SingleLightningStrikHittingMesh
          source={singleLightningStrike.source}
          targetMesh={sword}
        />
      </group>
      <primitive object={sword} scale={200} rotation-z={Math.PI / 2} />
    </group>
  );
};

export default function Page() {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <SceneWithLoadingState>
        <color attach="background" args={["#f2f2f2"]} />
        <ambientLight intensity={0.5} />
        <DemoScene />
        <EffectComposer>
          <Bloom mipmapBlur luminanceThreshold={1} levels={8} intensity={4} />
          <ToneMapping />
        </EffectComposer>
        <OrbitControls />
      </SceneWithLoadingState>
    </ThreeFiberLayout>
  );
}
