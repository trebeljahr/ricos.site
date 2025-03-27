import { useInterval } from "@hooks/useInterval";
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  CapsuleCollider,
  RapierRigidBody,
  RigidBody,
  RigidBodyProps,
  useBeforePhysicsStep,
} from "@react-three/rapier";
import { useControls } from "leva";
import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { Component, Entity, EntityType, navQuery, playerQuery } from "./ecs";
import { Quaternion, Vector3 } from "three";

const size = 2;
const radius = 0.5 * size;
const height = 0.9 * size;

const _agentPosition = new Vector3();
const _agentLookAt = new Vector3();
const _direction = new Vector3();
const _targetQuat = new Quaternion();
const _slerpedQuat = new Quaternion();

const up = new Vector3(0, 1, 0);

const queryHalfExtents = new Vector3(10, 10, 10);

type Vector3Like = {
  x: number;
  y: number;
  z: number;
};

const horizontalDistance = (a: Vector3Like, b: Vector3Like) => {
  return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
};

const distanceThreshold = 10;
const speed = 3.5;

export const Agent = ({
  children,
  ...props
}: PropsWithChildren<RigidBodyProps>) => {
  const { pathDebugLine } = useControls("agent", {
    pathDebugLine: false,
  });

  const enemyRef = useRef<EntityType>(null!);

  const [path, setPath] = useState<THREE.Vector3[]>([]);
  const pathIndex = useRef(1);

  // useEffect(() => {
  //   enemyRef.current.rigidBody?.setTranslation(
  //     new Vector3(...initialPosition),
  //     true
  //   );
  // }, [initialPosition]);

  /* compute path */
  useInterval(() => {
    const navMeshQuery = navQuery.first?.nav.navMeshQuery;
    if (!navMeshQuery) return;

    const player = playerQuery.first;
    if (!player) return;

    const rigidBody = enemyRef.current.rigidBody;
    if (!rigidBody) return;

    const { point: closestPoint } = navMeshQuery.findClosestPoint(
      rigidBody.translation(),
      { halfExtents: queryHalfExtents }
    );
    const agentPosition = _agentPosition.copy(closestPoint as Vector3);

    const { point: playerPosition } = navMeshQuery.findClosestPoint(
      player.rigidBody.translation(),
      {
        halfExtents: queryHalfExtents,
      }
    );

    const { path } = navMeshQuery.computePath(agentPosition, playerPosition);
    pathIndex.current = 1;

    const newPaths = path.map((p) => new Vector3(p.x, p.y, p.z));
    setPath(newPaths);
  }, 1000 / 10);

  /* movement */
  useBeforePhysicsStep(() => {
    const navMeshQuery = navQuery.first?.nav.navMeshQuery;
    if (!navMeshQuery) return;

    const player = playerQuery.first;
    if (!player) return;

    if (!navMeshQuery) return;

    if (!path || path.length < 2) return;

    const rigidBody = enemyRef.current.rigidBody;
    if (!rigidBody) return;

    // teleport if falling off map
    if (rigidBody.translation().y < -50) {
      rigidBody.setTranslation(new Vector3(0, 5, 0), true);
      return;
    }

    // advance through the path
    // very naive approach, won't work for complex paths
    while (
      pathIndex.current < path.length - 1 &&
      horizontalDistance(path[pathIndex.current], rigidBody.translation()) <
        0.05 &&
      path[pathIndex.current + 1]
    ) {
      pathIndex.current++;
    }

    const next = path[pathIndex.current];
    if (!next) return;

    enemyRef.current.distanceToPlayer = horizontalDistance(
      next,
      rigidBody.translation()
    );

    // early exit if close enough to the final point
    if (pathIndex.current === path.length - 1) {
      if (enemyRef.current.distanceToPlayer < distanceThreshold) {
        enemyRef.current.hasReachedPlayer = true;
        return;
      }
    }

    enemyRef.current.hasReachedPlayer = false;

    const direction = _direction
      .copy(next)
      .sub(rigidBody.translation() as Vector3);
    direction.y = 0;
    direction.normalize();

    const vel = direction.multiplyScalar(speed);
    vel.y = rigidBody.linvel().y;

    rigidBody.setLinvel(vel, true);
  });

  /* rotation */
  useFrame((_, delta) => {
    const t = 1 - Math.pow(0.001, delta);

    const lookAt = _agentLookAt;

    if (path.length === 0) {
      const player = playerQuery.first;
      if (!player) return;

      lookAt.copy(player.rigidBody.translation() as Vector3);
    } else if (path[pathIndex.current]) {
      lookAt.copy(path[pathIndex.current]);
    }

    const rigidBody = enemyRef.current.rigidBody;
    if (!rigidBody) return;

    if (horizontalDistance(lookAt, rigidBody.translation()) < 0.1) {
      return;
    }

    const direction = _direction
      .copy(rigidBody.translation() as Vector3)
      .sub(lookAt);
    direction.y = 0;
    direction.normalize();

    const yRot = Math.atan2(direction.x, direction.z) - Math.PI;
    const targetQuat = _targetQuat.setFromAxisAngle(up, yRot).normalize();
    const rotation = rigidBody.rotation();
    const slerpedQuat = _slerpedQuat
      .set(rotation.x, rotation.y, rotation.z, rotation.w)
      .clone()
      .slerp(targetQuat, t * 2);

    rigidBody.setRotation(slerpedQuat, true);
  });

  return (
    <group scale={1}>
      <Entity isEnemy ref={enemyRef}>
        <Component name="rigidBody">
          <RigidBody
            {...props}
            type="dynamic"
            enabledRotations={[false, true, false]}
            colliders={false}
            angularDamping={0.9}
            linearDamping={0.5}
          >
            {children}
            <CapsuleCollider args={[height / 2, radius]} />
          </RigidBody>
        </Component>
      </Entity>

      {pathDebugLine && path.length > 0 && (
        <Line points={path} color="blue" lineWidth={2} position={[0, 0.2, 0]} />
      )}
    </group>
  );
};
