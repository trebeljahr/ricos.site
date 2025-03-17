import React, { useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { HealthBar, Shapes } from "@r3f/Helpers/Healthbar";
import { ThreeFiberLayout } from "@components/dom/Layout";

const Healthbars = () => {
  const health = useRef(0.75);

  useFrame((state) => {
    health.current = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.5 + 0.5;
  });

  return (
    <>
      <HealthBar
        health={health}
        position={[0, 1.5, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        scale={[1, 1, 4]}
        shape={Shapes.BOX}
        fillColor={"#00e5ff"}
      />

      <HealthBar
        health={health}
        position={[0, 0, 0]}
        scale={[1, 1, 1]}
        shape={Shapes.BOX}
        fillColor={"#00ff15"}
      />

      <HealthBar
        health={health}
        position={[0, -1.5, 0]}
        scale={[1, 1, 1]}
        shape={Shapes.RHOMBUS}
        fillColor={"#1ddaa7"}
      />

      <HealthBar
        health={health}
        position={[0, -3, 0]}
        scale={[1, 1, 1]}
        shape={Shapes.CIRCLE}
        fillColor={"#f73b11"}
      />
    </>
  );
};
const HealthBarExample = () => {
  return (
    <ThreeFiberLayout>
      <Canvas>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Healthbars />
        <OrbitControls />
      </Canvas>
    </ThreeFiberLayout>
  );
};

export default HealthBarExample;
