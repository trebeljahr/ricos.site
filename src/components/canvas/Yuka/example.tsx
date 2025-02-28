import React, {
  useRef,
  useEffect,
  useState,
  PropsWithChildren,
  createContext,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  EntityManager,
  FleeBehavior,
  GameEntity,
  SeekBehavior,
  Time,
  Vehicle,
  Matrix4,
  WanderBehavior,
} from "yuka";
import { Euler, Group, Mesh, Quaternion, Vector3 } from "three";
import { RenderCallback } from "yuka/src/core/GameEntity";
import { Trex } from "../Trex";
import { Velociraptor } from "@models/dinosaurs_pack";
import { Stag } from "@models/animals_pack";
import { ActionName } from "@models/animals_pack/Stag";

export function YukaSimulation() {
  const chaserMeshRef = useRef<Group>(null!);
  const targetMeshRef = useRef<Group>(null!);

  const panicRadius = 2;
  const seekerSpeed = 3;
  const fleeSpeed = seekerSpeed + 0.2;
  //   const wanderSpeed = 0.5;

  const entityManager = useRef(new EntityManager());
  const time = useRef(new Time());
  const chaser = useRef(new Vehicle());
  const target = useRef(new Vehicle());

  const { camera } = useThree();

  useEffect(() => {
    if (chaserMeshRef.current) {
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

      //   vehicleMeshRef.current.geometry.rotateX(Math.PI * 0.5);
    }
    if (targetMeshRef.current) {
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
    }

    chaser.current.worldMatrix.copy(new Matrix4());
    target.current.worldMatrix.copy(new Matrix4());

    chaser.current.position.set(-5, 0, 0);
    target.current.position.set(0, 0, 0);

    targetMeshRef.current.rotateX(Math.PI * 0.5);
    chaserMeshRef.current.rotateX(Math.PI * 0.5);

    const seekBehavior = new SeekBehavior(target.current.position);

    chaser.current.steering.add(seekBehavior);
    chaser.current.maxSpeed = seekerSpeed;

    const fleeBehavior = new FleeBehavior(chaser.current.position, panicRadius);

    const wanderingBehavior = new WanderBehavior();
    wanderingBehavior.weight = 5;

    target.current.steering.add(fleeBehavior);
    target.current.steering.add(wanderingBehavior);
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
  }, []);

  const isPanicked = useRef(false);

  useFrame((_, delta) => {
    // const delta = time.current.update().getDelta();
    entityManager.current.update(delta);

    // target.current.velocity.multiplyScalar(0.99);
    // chaser.current.velocity.multiplyScalar(0.99);
    // console.log(chaser.current.position);

    // isPanicked.current = checkPanicMode();
    // console.log(isPanicked);

    // if (isPanicked.current) {
    //   target.current.maxSpeed = fleeSpeed;
    // } else {
    //   target.current.maxSpeed = wanderSpeed;
    // }
    // target.current.maxSpeed = isPanicked.current ? 2 : 1;
    // console.log(target.current.maxSpeed);
  });

  const checkPanicMode = () => {
    if (!target.current || !chaser.current) return false;

    const distance = chaser.current.position.distanceTo(
      target.current.position
    );

    return distance <= panicRadius * 2;
  };

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

      <group ref={targetMeshRef} matrixAutoUpdate={true}>
        <Stag animationAction={"AnimalArmature|Gallop"} scale={0.2} />
      </group>

      <gridHelper args={[80, 20]} />
    </group>
  );
}
