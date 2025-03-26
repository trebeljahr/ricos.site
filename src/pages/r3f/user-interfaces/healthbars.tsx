import { useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GenericHealthBar, Shapes } from "@r3f/Dungeon/Healthbar/Healthbar";
import { ThreeFiberLayout } from "@components/dom/ThreeFiberLayout";
import { HealthbarsDemo } from "@r3f/Scenes/HealthbarsDemo";
import { SceneWithLoadingState } from "@r3f/Helpers/SceneWithLoadingState";

const seoInfo = {
  title: "Healthbar Shaders",
  description:
    "A Typescript R3F implementation of different healthbar shaders, ported over from a Unity Demo.",
  url: "/r3f/user-interfaces/healthbars",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/healthbars.png",
  imageAlt: "an assortment of healthbar shaders",
};

const HealthBarExample = () => {
  return (
    <ThreeFiberLayout {...seoInfo}>
      <SceneWithLoadingState withKeyboardControls={false}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <HealthbarsDemo />
        <OrbitControls />
      </SceneWithLoadingState>
    </ThreeFiberLayout>
  );
};

export default HealthBarExample;
