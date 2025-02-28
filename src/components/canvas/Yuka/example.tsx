import React, { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EntityManager, GameEntity, SeekBehavior, Time, Vehicle } from "yuka";
import { Matrix4, Mesh, Vector3 } from "three";
import { RenderCallback } from "yuka/src/core/GameEntity";

export function YukaSimulation() {
  const vehicleMeshRef = useRef<Mesh>(null!);
  const targetMeshRef = useRef<Mesh>(null!);

  const entityManager = useRef(new EntityManager());
  const time = useRef(new Time());
  const vehicle = useRef(new Vehicle());
  const target = useRef(new GameEntity());

  const sync: RenderCallback<Mesh> = (entity, renderComponent) => {
    renderComponent.matrix.copy(entity.worldMatrix as unknown as Matrix4);
  };

  const { camera } = useThree();

  useEffect(() => {
    if (vehicleMeshRef.current) {
      vehicle.current.setRenderComponent(vehicleMeshRef.current, sync);
    }
    if (targetMeshRef.current) {
      target.current.setRenderComponent(targetMeshRef.current, sync);
    }

    entityManager.current.add(vehicle.current);
    entityManager.current.add(target.current);

    vehicle.current.position.set(-2, 0, -2);
    target.current.position.set(0, 0, 0);

    const seekBehavior = new SeekBehavior(target.current.position);
    vehicle.current.steering.add(seekBehavior);

    const interval = setInterval(() => {
      const x = Math.random() * 3;
      const z = Math.random() * 3;
      target.current.position.set(x, 0, z);
    }, 5000);

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
      <mesh ref={vehicleMeshRef} matrixAutoUpdate={false}>
        <coneGeometry args={[0.1, 0.5, 8]} />
        <meshNormalMaterial />
      </mesh>

      <mesh ref={targetMeshRef} matrixAutoUpdate={false}>
        <sphereGeometry args={[0.1, 32, 32]} />
        <meshPhongMaterial color={0xffea00} />
      </mesh>
      <gridHelper args={[20, 10]} />
    </>
  );
}
