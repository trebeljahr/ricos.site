import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  EntityManager,
  FleeBehavior,
  GameEntity,
  SeekBehavior,
  Time,
  Vehicle,
} from "yuka";
import { Euler, Matrix4, Mesh, Quaternion, Vector3 } from "three";
import { RenderCallback } from "yuka/src/core/GameEntity";

export function YukaSimulation() {
  const vehicleMeshRef = useRef<Mesh>(null!);
  const targetMeshRef = useRef<Mesh>(null!);

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

      vehicleMeshRef.current.geometry.rotateX(Math.PI * 0.5);
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

    vehicle.current.position.set(-2, 0, -2);
    target.current.position.set(0, 0, 0);

    const seekBehavior = new SeekBehavior(target.current.position);
    vehicle.current.steering.add(seekBehavior);
    vehicle.current.maxSpeed = 2;

    const fleeBehavior = new FleeBehavior(vehicle.current.position, 5);
    target.current.steering.add(fleeBehavior);

    const interval = setInterval(() => {
      const x = Math.random() * 10;
      const z = Math.random() * 10;
      const y = 0; // Math.random() * 20;

      target.current.position.set(x, y, z);
    }, 3000);

    camera.lookAt(
      new Vector3(vehicle.current.position.x, 0, vehicle.current.position.z)
    );
    return () => {
      clearInterval(interval);
    };
  }, []);

  useFrame(() => {
    const delta = time.current.update().getDelta();
    entityManager.current.update(delta);
  });

  return (
    <group>
      <mesh
        ref={vehicleMeshRef}
        matrixAutoUpdate={true}
        // rotation={[Math.PI * 0.5, 0, 0]}
      >
        <coneGeometry args={[0.1, 0.5, 8]} />
        <meshNormalMaterial />
      </mesh>

      <mesh ref={targetMeshRef} matrixAutoUpdate={true}>
        <sphereGeometry args={[0.1, 32, 32]} />
        <meshPhongMaterial color={0xffea00} />
      </mesh>
      <gridHelper args={[20, 10]} />
    </group>
  );
}
