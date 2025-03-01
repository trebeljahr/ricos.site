import { usePrevious } from "@hooks/usePrevious";
import { Stag } from "@models/animals_pack";
import { ActionName } from "@models/animals_pack/Stag";
import { Velociraptor } from "@models/dinosaurs_pack";
import { useFrame, useThree } from "@react-three/fiber";
import { perlin2 } from "simplenoise";
import { createNoise2D } from "simplex-noise";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box3,
  BoxGeometry,
  ColorRepresentation,
  Group,
  InstancedMesh,
  Mesh,
  MeshPhongMaterial,
  Object3D,
  Quaternion,
  Sphere,
  Vector2,
  Vector3,
} from "three";
import {
  EntityManager,
  FleeBehavior,
  GameEntity,
  Matrix4,
  ObstacleAvoidanceBehavior,
  SeekBehavior,
  Vehicle,
  WanderBehavior,
  Vector3 as YukaVec3,
} from "yuka";

const gridSize = 80;
const halfGridSize = gridSize / 2;
const panicRadius = 5;
const safetyRadius = panicRadius * 3;
const seekerSpeed = 3;
const fleeSpeed = seekerSpeed + 2;
const wanderSpeed = 1;

export function YukaSimulation() {
  const chaserMeshRef = useRef<Group>(null!);
  const targetMeshRef = useRef<Group>(null!);

  const entityManager = useRef(new EntityManager());
  const chaser = useRef(new Vehicle());
  const target = useRef(new Vehicle());
  const obstacles = useRef<GameEntity[]>([]);
  const obstacleMeshes = useRef<Mesh[]>([]);

  const { camera } = useThree();

  useEffect(() => {
    if (!chaserMeshRef.current || !targetMeshRef.current) return;

    obstacles.current = [];
    obstacleMeshes.current = [];

    const createObstacle = ({
      x,
      y,
      z,
      w,
      h,
      d,
      color,
    }: {
      x?: number;
      y?: number;
      z?: number;
      w?: number;
      h?: number;
      d?: number;
      color?: ColorRepresentation;
    } = {}) => {
      const geometry = new BoxGeometry(w || 1, h || 1, d || 1);
      geometry.computeBoundingSphere();
      if (geometry.boundingSphere?.radius === undefined) {
        return;
      }

      const material = new MeshPhongMaterial({ color: color || 0xff0000 });

      const mesh = new Mesh(geometry, material);

      mesh.position.set(
        x || Math.random() * gridSize - halfGridSize,
        y || 0,
        z || Math.random() * gridSize - halfGridSize
      );

      obstacleMeshes.current.push(mesh);

      const obstacle = new GameEntity();
      obstacle.position.copy(mesh.position as unknown as YukaVec3);
      obstacle.boundingRadius = geometry.boundingSphere.radius;
      entityManager.current.add(obstacle);
      obstacles.current.push(obstacle);
    };

    for (let i = 0; i < 100; i++) {
      createObstacle({ color: "#56c700" });
    }

    chaser.current.setRenderComponent(chaserMeshRef.current, (entity) => {
      chaserMeshRef.current.position.copy(
        new Vector3(entity.position.x, entity.position.y, entity.position.z)
      );
      chaserMeshRef.current.quaternion.copy(
        new Quaternion(
          entity.rotation.x,
          entity.rotation.y,
          entity.rotation.z,
          entity.rotation.w
        )
      );
    });

    target.current.setRenderComponent(targetMeshRef.current, (entity) => {
      targetMeshRef.current.position.copy(
        new Vector3(entity.position.x, entity.position.y, entity.position.z)
      );
      targetMeshRef.current.quaternion.copy(
        new Quaternion(
          entity.rotation.x,
          entity.rotation.y,
          entity.rotation.z,
          entity.rotation.w
        )
      );
    });

    chaser.current.worldMatrix.copy(new Matrix4());
    target.current.worldMatrix.copy(new Matrix4());

    chaser.current.position.set(-5, 0, 0);
    target.current.position.set(0, 0, 0);

    targetMeshRef.current.rotateX(Math.PI * 0.5);
    chaserMeshRef.current.rotateX(Math.PI * 0.5);

    const seekBehavior = new SeekBehavior(target.current.position);
    const seekerObstacleAvoidanceBehavior = new ObstacleAvoidanceBehavior(
      obstacles.current
    );
    seekerObstacleAvoidanceBehavior.weight = 10;
    chaser.current.steering.add(seekBehavior);
    chaser.current.steering.add(seekerObstacleAvoidanceBehavior);
    chaser.current.maxSpeed = seekerSpeed;

    const fleeBehavior = new FleeBehavior(chaser.current.position);
    const wanderingBehavior = new WanderBehavior();
    const obstacleAvoidanceBehavior = new ObstacleAvoidanceBehavior(
      obstacles.current
    );
    fleeBehavior.active = false;
    wanderingBehavior.active = true;
    wanderingBehavior.weight = 2;
    obstacleAvoidanceBehavior.weight = 10;

    target.current.steering.add(fleeBehavior);
    target.current.steering.add(wanderingBehavior);
    target.current.steering.add(obstacleAvoidanceBehavior);
    target.current.maxSpeed = fleeSpeed;

    camera.position.set(0, 10, 10);
    camera.lookAt(
      new Vector3(target.current.position.x, 0, target.current.position.y)
    );

    entityManager.current.add(chaser.current);
    entityManager.current.add(target.current);

    return () => {
      entityManager.current.remove(chaser.current);
      entityManager.current.remove(target.current);
      entityManager.current.clear();
    };
  }, [camera]);

  const [isPanicked, setIsPanicked] = useState(false);
  const [animation, setAnimation] = useState<ActionName>("AnimalArmature|Walk");
  const prevIsPanicked = usePrevious(isPanicked);

  useEffect(() => {
    if (isPanicked) {
      target.current.maxSpeed = fleeSpeed;
      target.current.steering.behaviors.forEach((behavior) => {
        if (behavior instanceof FleeBehavior) {
          behavior.active = true;
        }
      });
      setAnimation("AnimalArmature|Gallop");
    } else {
      target.current.maxSpeed = wanderSpeed;
      target.current.steering.behaviors.forEach((behavior) => {
        if (behavior instanceof FleeBehavior) {
          behavior.active = false;
        }
      });
      setAnimation("AnimalArmature|Walk");
    }
  }, [isPanicked]);

  useFrame((_, delta) => {
    entityManager.current.update(delta);

    const distance = chaser.current.position.distanceTo(
      target.current.position
    );

    if (distance < panicRadius && prevIsPanicked === false) {
      setIsPanicked(true);
    }

    if (distance > safetyRadius && prevIsPanicked === true) {
      setIsPanicked(false);
    }
  });

  const treePositions = useMemo(
    () => generateTreePositions(gridSize * 2, gridSize * 2, 1, 2),
    []
  );

  return (
    <group>
      <group
        ref={chaserMeshRef}
        matrixAutoUpdate={true}
        scale={0.1}
        // rotation={[Math.PI * 0.5, 0, 0]}
      >
        <Velociraptor animationAction="Armature|Velociraptor_Run" />
      </group>

      {/* {obstacleMeshes.current.map((mesh, index) => (
        <group>
          <primitive key={index} object={mesh} />
          <BoundingSphere object={mesh} />
        </group>
      ))} */}

      <Trees positions={treePositions} />

      <group ref={targetMeshRef} matrixAutoUpdate={true}>
        <Stag animationAction={animation} scale={0.2} />
      </group>

      <gridHelper args={[gridSize, 20]} />
    </group>
  );
}

export function Trees({ positions }: { positions: Vector3[] }) {
  const meshRef = useRef<InstancedMesh>(null!);
  const temp = new Object3D();

  useEffect(() => {
    if (!meshRef.current) return;

    positions.forEach((pos, i) => {
      temp.position.set(pos.x, pos.y, pos.z);
      temp.updateMatrix();
      meshRef.current.setMatrixAt(i, temp.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [positions]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, positions.length]}
    >
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshBasicMaterial color="green" />
    </instancedMesh>
  );
}

export function BoundingSphere({ object }: { object: Object3D }) {
  const ref = useRef<Mesh>(null!);
  const sphere = new Sphere();

  useFrame(() => {
    if (object) {
      const box = new Box3().setFromObject(object);
      box.getBoundingSphere(sphere);

      ref.current.position.copy(sphere.center);
      ref.current.scale.setScalar(sphere.radius);
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="red" wireframe />
    </mesh>
  );
}

export function generateTreePositions(
  xWidth: number,
  zWidth: number,
  minDistance: number,
  densityScale = 0.5
) {
  const points = [];

  const gridSize =
    Math.ceil(xWidth / minDistance) * Math.ceil(zWidth / minDistance);

  for (let i = 0; i < gridSize; i++) {
    const x = Math.random() * xWidth - xWidth / 2;
    const z = Math.random() * zWidth - zWidth / 2;

    const noiseValue = perlin2(x * 0.01, z * 0.01);
    if (Math.random() > noiseValue * densityScale) continue;

    let valid = true;
    for (const p of points) {
      if (
        new Vector3(p.x, 0, p.z).distanceTo(new Vector3(x, 0, z)) < minDistance
      ) {
        valid = false;
        break;
      }
    }

    if (valid) {
      points.push(new Vector3(x, 0, z));
    }
  }

  return points;
}
