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
        position={[0, 3, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        scale={[0.5, 1, 5]}
        shape={Shapes.RHOMBUS}
        waveAmp={0}
        fillColor={"#ff0000"}
        secondColor={"#1fb141"}
        borderWidth={0.01}
      />

      <HealthBar
        health={health}
        position={[-3, 3, 0]}
        rotation={[0, 0, 0]}
        scale={[0.5, 1, 3]}
        shape={Shapes.RHOMBUS}
        waveAmp={0}
        fillColor={"#f9ee27"}
        borderWidth={0.03}
      />

      <HealthBar
        health={health}
        position={[0, 1.5, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        scale={[1, 1, 4]}
        shape={Shapes.BOX}
        waveAmp={0}
        borderColor={"#5f5e5e"}
        borderWidth={0.02}
        fillColor={"#00e5ff"}
      />

      <HealthBar
        health={health}
        position={[4, -1, 0]}
        rotation={[0, 0, 0]}
        scale={[2, 1, 2]}
        shape={Shapes.CIRCLE}
        waveAmp={0.01}
        waveFreq={32}
        waveSpeed={0.3}
        borderColor={"#363535"}
        borderWidth={0.02}
        fillColor={"#3279fd"}
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
        position={[-3, -1.5, 0]}
        scale={[2, 1, 1]}
        bgColor={"#3a3a3a"}
        shape={Shapes.RHOMBUS}
        fillColor={"#1ddaa7"}
      />

      <HealthBar
        health={health}
        position={[0, -4.5, 0]}
        scale={[1, 1, 3]}
        shape={Shapes.CIRCLE}
        borderWidth={0.01}
        fillColor={"#ff397b"}
      />

      <HealthBar
        health={health}
        position={[3, -4, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        waveAmp={0}
        scale={[1, 1, 3]}
        shape={Shapes.CIRCLE}
        borderWidth={0.01}
        fillColor={"#f73b11"}
      />

      <HealthBar
        health={health}
        position={[-3, -4, 0]}
        waveAmp={0}
        scale={[2, 1, 2]}
        bgColor={"#3a3a3a"}
        borderColor={"#989898"}
        shape={Shapes.CIRCLE}
        fillColor={"#f7114e"}
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
