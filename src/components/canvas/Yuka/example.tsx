import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  EntityManager,
  FleeBehavior,
  GameEntity,
  SeekBehavior,
  Time,
  Vehicle,
  WanderBehavior,
} from "yuka";
import { Euler, Group, Matrix4, Mesh, Quaternion, Vector3 } from "three";
import { RenderCallback } from "yuka/src/core/GameEntity";
import { Trex } from "../Trex";
import { Velociraptor } from "@models/dinosaurs_pack";
import { Stag } from "@models/animals_pack";

export function YukaSimulation() {
  const vehicleMeshRef = useRef<Group>(null!);
  const targetMeshRef = useRef<Group>(null!);

  const entityManager = useRef(new EntityManager());
  const time = useRef(new Time());
  const vehicle = useRef(new Vehicle());
  const target = useRef(new Vehicle());

  const { camera } = useThree();

  useEffect(() => {
    if (vehicleMeshRef.current) {
      vehicle.current.setRenderComponent(vehicleMeshRef.current, (entity) => {
        vehicleMeshRef.current.position.copy(
          new Vector3(entity.position.x, entity.position.y, entity.position.z)
        );
        vehicleMeshRef.current.quaternion.copy(
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

    entityManager.current.add(vehicle.current);
    entityManager.current.add(target.current);

    vehicle.current.position.set(-5, 0, 0);
    target.current.position.set(0, 0, 0);

    const seekBehavior = new SeekBehavior(target.current.position);
    vehicle.current.steering.add(seekBehavior);
    vehicle.current.maxSpeed = 2;

    const fleeBehavior = new FleeBehavior(vehicle.current.position, 10);
    target.current.steering.add(fleeBehavior);
    const wanderingBehavior = new WanderBehavior(10);
    target.current.steering.add(wanderingBehavior);
    target.current.maxSpeed = 3;

    camera.lookAt(
      new Vector3(vehicle.current.position.x, 0, vehicle.current.position.z)
    );
  }, []);

  useFrame(() => {
    const delta = time.current.update().getDelta();
    entityManager.current.update(delta);
  });

  return (
    <group>
      <group
        ref={vehicleMeshRef}
        matrixAutoUpdate={true}
        // rotation={[Math.PI * 0.5, 0, 0]}
      >
        <Velociraptor animationAction="Armature|Velociraptor_Run" scale={0.2} />
      </group>

      <group ref={targetMeshRef} matrixAutoUpdate={true}>
        <Stag animationAction="AnimalArmature|Gallop" scale={0.2} />
      </group>

      <gridHelper args={[20, 10]} />
    </group>
  );
}
