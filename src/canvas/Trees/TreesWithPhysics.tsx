import { BirchTree_1 } from "@r3f/AllModels/nature_pack";
import { useTree1 } from "@r3f/AllModels/nature_pack/CommonTree_1";
import { Tree1 } from "@r3f/AllModels/simple_nature_pack";
import {
  CylinderCollider,
  InstancedRigidBodies,
  RigidBody,
} from "@react-three/rapier";
import { useRef } from "react";
import { Vector3, Vector3Tuple } from "three";
import { randFloat } from "three/src/math/MathUtils";
import { floorLevel } from "../Helpers/Obstacles";

export const InstancedTreesWithPhysics = () => {
  const api = useRef(null);

  const { nodes, materials } = useTree1();
  const COUNT = 10;
  const positions: Vector3Tuple[] = Array.from({ length: COUNT }, () => [
    randFloat(-10, 10),
    0,
    randFloat(-10, 10),
  ]);
  const scaleFactor = 20;
  const rotations: Vector3Tuple[] = Array.from({ length: COUNT }, () => [
    0,
    0,
    Math.PI / 2,
  ]);
  return (
    <group>
      <InstancedRigidBodies
        ref={api}
        instances={[]}
        colliders={false}
        type="fixed"
        {...{ positions, rotations }}
      >
        <instancedMesh
          args={[nodes.CommonTree_1_1.geometry, materials.Wood, COUNT]}
          scale={[scaleFactor, scaleFactor, scaleFactor]}
        >
          <CylinderCollider args={[2 / scaleFactor, 0.05 / scaleFactor]} />
        </instancedMesh>
      </InstancedRigidBodies>

      <InstancedRigidBodies
        ref={api}
        instances={[]}
        colliders={false}
        type="fixed"
        {...{ positions, rotations }}
      >
        <instancedMesh
          args={[nodes.CommonTree_1_2.geometry, materials.Green, COUNT]}
          scale={[scaleFactor, scaleFactor, scaleFactor]}
        />
      </InstancedRigidBodies>
    </group>
  );
};

export const TreeWithBallPhysics = () => {
  return (
    <RigidBody
      position={new Vector3(4, floorLevel, 12)}
      rotation={[-Math.PI / 2, 0, 0]}
      type="fixed"
      colliders="ball"
    >
      <Tree1 rotation={[Math.PI / 2, 0, 0]} />
    </RigidBody>
  );
};

export const TreeWithCuboidPhysics = () => {
  return (
    <RigidBody
      position={new Vector3(4, floorLevel, 8)}
      rotation={[-Math.PI / 2, 0, 0]}
      type="fixed"
      colliders="cuboid"
    >
      <Tree1 rotation={[Math.PI / 2, 0, 0]} />
    </RigidBody>
  );
};

export const TreeWithHullPhysics = () => {
  return (
    <RigidBody
      position={new Vector3(0, floorLevel, 12)}
      type="fixed"
      colliders="hull"
    >
      <Tree1 />
    </RigidBody>
  );
};

export const TreeWithTrimeshPhysics = () => {
  return (
    <RigidBody
      type="fixed"
      colliders="trimesh"
      position={new Vector3(0, floorLevel, 8)}
    >
      <Tree1 />
    </RigidBody>
  );
};

export function Trees() {
  const positions = new Array(100)
    .fill(0)
    .map(() => new Vector3(randFloat(-200, 200), 0, randFloat(-200, 200)));
  return (
    <>
      {positions.map((pos, index) => {
        return (
          <BirchTree_1
            key={index}
            position={pos}
            scale={new Vector3(5, 5, 5)}
          />
        );
      })}
    </>
  );
}
