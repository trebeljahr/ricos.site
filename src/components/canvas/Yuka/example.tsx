import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EntityManager, GameEntity, SeekBehavior, Time, Vehicle } from "yuka";
import { Euler, Matrix4, Mesh, Quaternion, Vector3 } from "three";
import { RenderCallback } from "yuka/src/core/GameEntity";

export function YukaSimulation() {
  const vehicleMeshRef = useRef<Mesh>(null!);
  const targetMeshRef = useRef<Mesh>(null!);

  const entityManager = useRef(new EntityManager());
  const time = useRef(new Time());
  const vehicle = useRef(new Vehicle());
  const target = useRef(new GameEntity());

  const { camera } = useThree();

  useEffect(() => {
    if (vehicleMeshRef.current) {
      vehicle.current.setRenderComponent(vehicleMeshRef.current, (entity) => {
        vehicleMeshRef.current.position.copy(
          entity.position as unknown as Vector3
        );
        vehicleMeshRef.current.quaternion.copy(
          entity.rotation as unknown as Quaternion
        );
      });
    }
    if (targetMeshRef.current) {
      target.current.setRenderComponent(targetMeshRef.current, (entity) => {
        targetMeshRef.current.position.copy(
          entity.position as unknown as Vector3
        );
        targetMeshRef.current.quaternion.copy(
          entity.rotation as unknown as Quaternion
        );
      });
    }

    entityManager.current.add(vehicle.current);
    entityManager.current.add(target.current);

    vehicle.current.position.set(-2, 0, -2);
    target.current.position.set(0, 0, 0);

    const seekBehavior = new SeekBehavior(target.current.position);
    vehicle.current.steering.add(seekBehavior);
    vehicle.current.maxSpeed = 0.1;

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
    <>
      <mesh
        ref={vehicleMeshRef}
        matrixAutoUpdate={true}
        rotation={[Math.PI * 0.5, 0, 0]}
      >
        <coneGeometry args={[0.1, 0.5, 8]} />
        <meshNormalMaterial />
      </mesh>

      <mesh ref={targetMeshRef} matrixAutoUpdate={true}>
        <sphereGeometry args={[0.1, 32, 32]} />
        <meshPhongMaterial color={0xffea00} />
      </mesh>
      <gridHelper args={[20, 10]} />
    </>
  );
}
