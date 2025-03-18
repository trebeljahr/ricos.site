import React, { useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GenericHealthBar, Shapes } from "@r3f/Dungeon/Healthbar/Healthbar";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { HealthbarsDemo } from "@r3f/Scenes/HealthbarsDemo";

const HealthBarExample = () => {
  return (
    <ThreeFiberLayout>
      <Canvas>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <HealthbarsDemo />
        <OrbitControls />
      </Canvas>
    </ThreeFiberLayout>
  );
};

export default HealthBarExample;
