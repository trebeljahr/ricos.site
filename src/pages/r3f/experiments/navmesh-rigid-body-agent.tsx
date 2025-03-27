import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { enemyQuery, playerQuery } from "@r3f/AI/ecs";
import { NavmeshDebug, NavmeshEcs } from "@r3f/AI/NavmeshWithEcs";
import { Player, PlayerControls } from "@r3f/AI/Player";
import { Agent } from "@r3f/AI/RigidBodyAgent";
import { RandomSkeletonWithRandomWeapons } from "@r3f/Dungeon/BuildingBlocks/SkeletonEnemy";
import { CameraPositionLogger } from "@r3f/Helpers/CameraPositionLogger";
import { FixedLightningStrike, LightningRay } from "@r3f/Helpers/LightningRay";
import { FloorWithPhysics } from "@r3f/Helpers/PhysicsFloor";

import { Box, useProgress } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { useState } from "react";
import { init as initRecast } from "recast-navigation";
import { suspend } from "suspend-react";
import { DoubleSide, MeshStandardMaterial, Vector3 } from "three";
import { RayParameters } from "three-stdlib";

const seoInfo = {
  title: "Navmesh 1st Person Controller",
  description:
    "Experimenting with a 1st person controller and a navmesh agent based on the beautiful arancini/react and recast-navigation libraries.",
  url: "/r3f/experiments/navmesh-rigid-body-agent",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "navmesh",
    "pathfinding",
    "navigation",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/navmesh-rigid-body-agent.png",
  imageAlt: "a skeleton throwing lightning strikes at a player in a 3D scene",
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

const LightningAttack = () => {
  const [rayPositions, setRayPositions] = useState<{
    sourceOffset: Vector3;
    destOffset: Vector3;
  } | null>(null);

  useFrame(() => {
    const enemy = enemyQuery.first;
    const player = playerQuery.first;
    if (!enemy || !player) return;

    if (enemy.hasReachedPlayer) {
      if (rayPositions === null) {
        setRayPositions({
          sourceOffset: enemy.rigidBody.translation() as Vector3,
          destOffset: player.rigidBody.translation() as Vector3,
        });

        console.log("player", player.rigidBody.translation());
        console.log("enemy", enemy.rigidBody?.translation());
      }
    } else if (rayPositions !== null) {
      setRayPositions(null);
    }
  });

  return (
    <>
      {rayPositions && (
        <SingleLightningStrike
          source={rayPositions.sourceOffset}
          target={rayPositions.destOffset}
        />
      )}
    </>
  );
};
const Scene = () => {
  suspend(async () => {
    await initRecast();
  }, []);

  const data = useProgress();
  const loading = data.progress < 100;

  return (
    <>
      <color attach="background" args={["#1c1c1c"]} />
      <ambientLight args={["#bdbdbd", 2]} />
      <directionalLight args={["#ffffff", 2]} position={[0, 30, 0]} />

      <Physics paused={loading}>
        <PlayerControls>
          <Player position={[5, 30, 5]} />
        </PlayerControls>

        <Agent position={[-19, 30, 27]}>
          <RandomSkeletonWithRandomWeapons position={[0, -1.8, 0]} />
        </Agent>

        <LightningAttack />

        {/* <group position={[0, -30, 0]}> */}
        <NavmeshEcs />
        <NavmeshDebug />
        <FloorWithPhysics />
        {/* </group> */}
      </Physics>
    </>
  );
};
export default function Page() {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <Scene />
      <CameraPositionLogger />
    </ThreeFiberLayout>
  );
}
