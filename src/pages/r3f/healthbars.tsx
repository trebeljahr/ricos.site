import { useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GenericHealthBar, Shapes } from "@r3f/Dungeon/Healthbar/Healthbar";
import { ThreeFiberLayout } from "@components/dom/Layout";
import { HealthbarsDemo } from "@r3f/Scenes/HealthbarsDemo";

const seoInfo = {
  title: "",
  description: "",
  url: "/r3f/",
  keywords: [
    "threejs",
    "react-three-fiber",
    "lightning strike",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/.png",
  imageAlt: "",
};

const HealthBarExample = () => {
  return (
    <ThreeFiberLayout {...seoInfo}>
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
