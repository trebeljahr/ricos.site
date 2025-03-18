import { Box } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import {
  TreeWithBallPhysics,
  TreeWithCuboidPhysics,
  TreeWithHullPhysics,
  TreeWithTrimeshPhysics,
} from "../Trees/TreesWithPhysics";

export const floorLevel = -2;
export const Obstacles = () => {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <RigidBody
          key={i}
          colliders="cuboid"
          position={[Math.random() * -5, i, 0]}
          type="dynamic"
          mass={0.01}
        >
          <Box args={[1, 1, 1]} castShadow receiveShadow>
            <meshPhysicalMaterial color="pink" />
          </Box>
        </RigidBody>
      ))}
      <RigidBody colliders="cuboid" position={[0, floorLevel, 0]} type="fixed">
        <Box args={[40, 1, 40]} castShadow receiveShadow>
          <meshPhysicalMaterial />
        </Box>
      </RigidBody>
      <RigidBody colliders="cuboid" position={[10, floorLevel, 0]} type="fixed">
        <Box
          args={[40, 1, 40]}
          rotation={[0, 0, Math.PI / 5]}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial />
        </Box>
      </RigidBody>
      <RigidBody colliders="cuboid" position={[10, -12, -8]} type="fixed">
        <Box args={[20, 20, 10]} castShadow receiveShadow>
          <meshPhysicalMaterial />
        </Box>
      </RigidBody>
    </>
  );
};

export const TreeObstacles = () => {
  return (
    <group>
      <TreeWithTrimeshPhysics />
      <TreeWithBallPhysics />
      <TreeWithHullPhysics />
      <TreeWithCuboidPhysics />
    </group>
  );
};
