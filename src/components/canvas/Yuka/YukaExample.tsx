import { usePrevious } from "@hooks/usePrevious";
import { Stag } from "@models/animals_pack";
import { ActionName } from "@models/animals_pack/Stag";
import { Velociraptor } from "@models/dinosaurs_pack";
import { useFrame, useThree } from "@react-three/fiber";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BoxGeometry,
  ColorRepresentation,
  Group,
  InstancedMesh,
  Mesh,
  MeshPhongMaterial,
  Object3D,
  Quaternion,
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
import { debug } from "../ChunkGenerationSystem/config";
import { BoundingSphereAround } from "../Helpers/BoundingSphere";
import { generateTreePositions } from "../../../lib/utils/noise";

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

    const currentManager = entityManager.current;
    const currentChaser = chaser.current;
    const currentTarget = target.current;

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
      currentManager.add(obstacle);
      obstacles.current.push(obstacle);
    };

    for (let i = 0; i < 100; i++) {
      createObstacle({ color: "#56c700" });
    }

    currentChaser.setRenderComponent(chaserMeshRef.current, (entity) => {
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

    currentTarget.setRenderComponent(targetMeshRef.current, (entity) => {
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

    currentChaser.worldMatrix.copy(new Matrix4());
    currentTarget.worldMatrix.copy(new Matrix4());

    currentChaser.position.set(-5, 0, 0);
    currentTarget.position.set(0, 0, 0);

    targetMeshRef.current.rotateX(Math.PI * 0.5);
    chaserMeshRef.current.rotateX(Math.PI * 0.5);

    const seekBehavior = new SeekBehavior(currentTarget.position);
    const seekerObstacleAvoidanceBehavior = new ObstacleAvoidanceBehavior(
      obstacles.current
    );
    seekerObstacleAvoidanceBehavior.weight = 10;
    currentChaser.steering.add(seekBehavior);
    currentChaser.steering.add(seekerObstacleAvoidanceBehavior);
    currentChaser.maxSpeed = seekerSpeed;

    const fleeBehavior = new FleeBehavior(currentChaser.position);
    const wanderingBehavior = new WanderBehavior();
    const obstacleAvoidanceBehavior = new ObstacleAvoidanceBehavior(
      obstacles.current
    );
    fleeBehavior.active = false;
    wanderingBehavior.active = true;
    wanderingBehavior.weight = 2;
    obstacleAvoidanceBehavior.weight = 10;

    currentTarget.steering.add(fleeBehavior);
    currentTarget.steering.add(wanderingBehavior);
    currentTarget.steering.add(obstacleAvoidanceBehavior);
    currentTarget.maxSpeed = fleeSpeed;

    camera.position.set(0, 10, 10);
    camera.lookAt(
      new Vector3(currentTarget.position.x, 0, currentTarget.position.y)
    );

    currentManager.add(currentChaser);
    currentManager.add(currentTarget);

    return () => {
      currentManager.remove(currentChaser);
      currentManager.remove(currentTarget);
      currentManager.clear();
    };
  }, [camera]);

  const [isPanicked, setIsPanicked] = useState(false);
  const [animation, setAnimation] = useState<ActionName>("AnimalArmature|Walk");
  const prevIsPanicked = usePrevious(isPanicked);

  useEffect(() => {
    const currentTarget = target.current;

    if (isPanicked) {
      currentTarget.maxSpeed = fleeSpeed;
      currentTarget.steering.behaviors.forEach((behavior) => {
        if (behavior instanceof FleeBehavior) {
          behavior.active = true;
        }
      });
      setAnimation("AnimalArmature|Gallop");
    } else {
      currentTarget.maxSpeed = wanderSpeed;
      currentTarget.steering.behaviors.forEach((behavior) => {
        if (behavior instanceof FleeBehavior) {
          behavior.active = false;
        }
      });
      setAnimation("AnimalArmature|Walk");
    }
  }, [isPanicked]);

  useFrame((_, delta) => {
    const currentTarget = target.current;
    const currentChaser = chaser.current;
    const currentManager = entityManager.current;

    currentManager.update(delta);

    const distance = currentChaser.position.distanceTo(currentTarget.position);

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

      {debug &&
        obstacleMeshes.current.map((mesh, index) => (
          <group key={index}>
            <primitive object={mesh} />
            <BoundingSphereAround object={mesh} />
          </group>
        ))}

      <Trees positions={treePositions} />

      <group ref={targetMeshRef} matrixAutoUpdate={true}>
        <Stag animationAction={animation} scale={0.2} />
      </group>

      <gridHelper args={[gridSize, 20]} />
    </group>
  );
}

const temp = new Object3D();

export function Trees({ positions }: { positions: Vector3[] }) {
  const meshRef = useRef<InstancedMesh>(null!);

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
