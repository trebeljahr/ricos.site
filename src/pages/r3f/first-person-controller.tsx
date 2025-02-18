import { FirstPersonController } from "@components/canvas/FirstPersonController";
import { CanvasWithControls } from "@components/canvas/Scene";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { Box, Sky } from "@react-three/drei";
import { Physics, RigidBody } from "@react-three/rapier";

export default function Page() {
  return (
    <ThreeFiberLayout>
      <CanvasWithControls>
        <Sky azimuth={1} inclination={0.6} distance={1000} />

        <Physics debug colliders="hull">
          <FirstPersonController />
          <Obstacles />
        </Physics>
      </CanvasWithControls>
    </ThreeFiberLayout>
  );
}

const Obstacles = () => {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <RigidBody
          key={i}
          colliders="cuboid"
          position={[-5, (i + 1) * 1.01, 0]}
          type="dynamic"
          mass={0.5}
        >
          <Box args={[1, 1, 1]} castShadow receiveShadow>
            <meshPhysicalMaterial color="pink" />
          </Box>
        </RigidBody>
      ))}
      {/* fixed stage rigid bodies */}
      <RigidBody colliders="cuboid" position={[0, -8, 0]} type="fixed">
        <Box args={[40, 1, 40]} castShadow receiveShadow>
          <meshPhysicalMaterial />
        </Box>
      </RigidBody>
      <RigidBody colliders="cuboid" position={[10, -8, 0]} type="fixed">
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
      {/* {Array.from({ length: 20 }).map((_, i) => (
        <RigidBody key={i} colliders='cuboid' position={[i * 0.3, -8 + (i + 1) * 0.3, 0]} type='fixed'>
          <Box
            args={[0.3, 0.3, 5]}
            castShadow
            receiveShadow
            getObjectsByProperty={undefined}
            getVertexPosition={undefined}>
            <meshPhysicalMaterial />
          </Box>
        </RigidBody>
      ))} */}
      {/* <InstancedTreesWithPhysics /> */}
      {/* <TreeWithPhysics />
      <TreeWithBallPhysics />
      <TreeWithHullPhysics />
      <TreeWithCuboidPhysics /> */}
    </>
  );
};
