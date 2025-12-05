import React, { useRef } from "react";
import * as THREE from "three";
import { extend, useFrame } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import { useControls, folder } from "leva";
import {
  SceneWithLoadingState,
  SeoInfo,
} from "@components/dom/ThreeFiberLayout";
import { NavbarR3F } from "@components/dom/NavbarR3F";
import vertexShader from "@shaders/cymatics/cymatics.vert.glsl?raw";
import fragmentShader from "@shaders/cymatics/cymatics.frag.glsl";

// create a ShaderMaterial via drei helper
const CymaticsMat = shaderMaterial(
  // default/uniforms values
  {
    uResolution: new THREE.Vector2(800, 600),
    uTime: 0,
    uLightDir: new THREE.Vector3(0.4, 0.6, 0.7),
    uBaseColor: new THREE.Color(0.02, 0.15, 0.25),
    uNumSources: 2,
    uSourcePos: [
      new THREE.Vector2(0.4, 0.5),
      new THREE.Vector2(0.6, 0.5),
      new THREE.Vector2(0.5, 0.35),
    ],
    uSourceFreq: [40.0, 45.0, 30.0],
    uSourceAmp: [1.0, 0.9, 0.6],
    uGlobalScale: 1.2,
    uDamping: 2.0,
    uRidgeWidth: 0.05,
    uContourContrast: 1.6,
  },
  vertexShader,
  fragmentShader
);

extend({ CymaticsMat });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // match the extended material name (lowercase)
      cymaticsMat: React.ComponentPropsWithoutRef<"mesh"> & { ref?: any };
    }
  }
}

function CymaticsPlane({ width = 2, height = 2, resolution = [800, 600] }) {
  const matRef = useRef<Record<string, any>>();

  // Leva controls: grouped and exposed
  const controls = useControls("Cymatics", {
    Rendering: folder({
      resolutionX: { value: resolution[0], min: 0, max: 200, step: 1.0 },
      resolutionY: { value: resolution[1], min: 0, max: 200, step: 1.0 },
      globalScale: { value: 1.2, min: 0.2, max: 4, step: 0.01 },
      damping: { value: 2.0, min: 0.0, max: 5.0, step: 0.01 },
      ridgeWidth: { value: 0.05, min: 0.0, max: 0.5, step: 0.001 },
      contourContrast: { value: 1.6, min: 0.1, max: 6.0, step: 0.01 },
    }),
    Sources: folder({
      numSources: { value: 2, min: 0, max: 3, step: 1 },
      // Source 1
      s1pos: { value: { x: 0.4, y: 0.5 }, step: 0.01 },
      s1freq: { value: 40.0, min: 1, max: 120, step: 0.1 },
      s1amp: { value: 1.0, min: 0, max: 2, step: 0.01 },
      // Source 2
      s2pos: { value: { x: 0.6, y: 0.5 }, step: 0.01 },
      s2freq: { value: 45.0, min: 1, max: 120, step: 0.1 },
      s2amp: { value: 0.9, min: 0, max: 2, step: 0.01 },
      // Source 3 (optional)
      s3pos: { value: { x: 0.5, y: 0.35 }, step: 0.01 },
      s3freq: { value: 30.0, min: 1, max: 120, step: 0.1 },
      s3amp: { value: 0.6, min: 0, max: 2, step: 0.01 },
    }),
  });

  // update uniforms each frame
  useFrame((state, delta) => {
    const mat = matRef.current;
    if (!mat) return;

    // time
    mat.uTime = state.clock.getElapsedTime();

    // resolution
    const [rw, rh] = [controls.resolutionX, controls.resolutionY];
    mat.uResolution = new THREE.Vector2(rw, rh);

    // global params
    mat.uGlobalScale = controls.globalScale ?? controls.globalScale ?? 1.2;
    mat.uDamping = controls.damping ?? controls.damping ?? 2.0;
    mat.uRidgeWidth = controls.ridgeWidth ?? controls.ridgeWidth ?? 0.05;
    mat.uContourContrast =
      controls.contourContrast ?? controls.contourContrast ?? 1.6;

    // sources
    const num = Math.floor(controls.numSources ?? controls.numSources ?? 2);
    mat.uNumSources = num;

    // positions and arrays
    const s1 = controls.s1pos ?? controls.s1pos;
    const s2 = controls.s2pos ?? controls.s2pos;
    const s3 = controls.s3pos ?? controls.s3pos;

    mat.uSourcePos = [
      new THREE.Vector2(s1.x, s1.y),
      new THREE.Vector2(s2.x, s2.y),
      new THREE.Vector2(s3.x, s3.y),
    ];

    mat.uSourceFreq = [
      controls.s1freq ?? controls.s1freq,
      controls.s2freq ?? controls.s2freq,
      controls.s3freq ?? controls.s3freq,
    ];

    mat.uSourceAmp = [
      controls.s1amp ?? controls.s1amp,
      controls.s2amp ?? controls.s2amp,
      controls.s3amp ?? controls.s3amp,
    ];

    // light & color (static for now)
    mat.uLightDir = new THREE.Vector3(0.4, 0.6, 0.7);
    mat.uBaseColor = new THREE.Color(0.02, 0.15, 0.25);
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, height, 512, 512]} />
      {/* note: using the extended component name in JSX */}
      <cymaticsMat ref={matRef} />
    </mesh>
  );
}

const seoInfo = {
  title: "A testbed for gaming features implemented",
  description:
    "This testbed is for experimenting with gaming features such as inventory, enemies, and traps in R3F. It has lots of things going on and interact with, so have fun!",
  url: "/r3f/experiments/gaming-testbed",
  keywords: [
    "threejs",
    "react-three-fiber",
    "r3f",
    "3D",
    "programming",
    "graphics",
    "webgl",
  ],
  image: "/assets/pages/gaming-testbed.png",
  imageAlt:
    "an image of a 3D model of a character with a sword attacking a wizard skeleton",
};

export default function Page() {
  return (
    <>
      <SeoInfo {...seoInfo} />
      <NavbarR3F />
      <div className="w-screen h-screen overscroll-none">
        <SceneWithLoadingState
          camera={{ position: [0, 10, 0], near: 0.1, far: 1000 }}
        >
          <CymaticsPlane width={4} height={4} resolution={[800, 600]} />
        </SceneWithLoadingState>
      </div>
    </>
  );
}
