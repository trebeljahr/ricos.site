import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { HealthBar, Shapes } from "@r3f/Helpers/Healthbar";
import { ThreeFiberLayout } from "@components/dom/Layout";

const HealthBarExample = () => {
  return (
    <ThreeFiberLayout>
      <Canvas>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />

        {/* Circle Health Bar */}
        <HealthBar
          position={[0, 1, 0]}
          scale={[2, 0.3, 0.05]}
          shape={Shapes.CIRCLE}
          fillColor={[0, 0.8, 0.2, 1]}
        />

        {/* Box Health Bar */}
        {/* <HealthBar
          position={[0, 0, 0]}
          scale={[2, 0.3, 0.05]}
          shape={Shapes.BOX}
          fillColor={[1, 0.6, 0, 1]} // Orange
        /> */}

        {/* Rhombus Health Bar */}
        <HealthBar
          position={[0, -1, 0]}
          scale={[2, 0.3, 0.05]}
          shape={Shapes.RHOMBUS}
          fillColor={[0.2, 0.5, 1, 1]} // Blue
        />

        {/* Custom Health Bar with different parameters */}
        {/* <HealthBar
          position={[0, -2, 0]}
          scale={[2, 0.3, 0.05]}
          shape={Shapes.CIRCLE}
          lowHealthThreshold={0.3}
          fillColor={[1, 0.2, 0.2, 1]} // Red
          backgroundColor={[0.1, 0.1, 0.1, 0.8]}
          borderColor={[0.5, 0.5, 0.5, 1]}
          borderWidth={0.04}
          waveAmp={0.02}
          waveFreq={12}
          waveSpeed={0.8}
        /> */}

        <OrbitControls />
      </Canvas>
    </ThreeFiberLayout>
  );
};

export default HealthBarExample;
