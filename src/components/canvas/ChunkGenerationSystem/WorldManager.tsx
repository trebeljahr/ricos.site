import React, { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Sky,
  OrbitControls,
  PerspectiveCamera,
  Stats,
} from "@react-three/drei";
import { ChunkManager } from "./ChunkManager";
import { createTerrainChunkSystem } from "./TerrainChunkSystem";
import { createVegetationChunkSystem } from "./VegetationSystem";
import * as THREE from "three";
import { MinecraftCreativeControlsPlayer } from "../FlyingPlayer";
import { KeyboardControlsProvider } from "../Scene";
import { Physics } from "@react-three/rapier";

// Create a component that wraps multiple chunk systems
export const WorldManager = () => {
  // Create a seed for consistency
  const worldSeed = useMemo(() => Math.random() * 1000, []);

  // Create a single terrain generator instance to be shared
  const terrainGenerator = useMemo(() => {
    // Here we would instantiate our terrain generator
    // For this example, we'll just reference it
    return {
      getHeight: (x: number, z: number) => {
        // Simple placeholder for the height function
        return Math.sin(x * 0.1) * Math.cos(z * 0.1) * 5;
      },
      getBiome: (x: number, z: number) => {
        // Simple placeholder for biome function
        const value = Math.sin(x * 0.05) * Math.cos(z * 0.05);
        if (value < -0.3) return "desert";
        if (value > 0.3) return "mountains";
        return "plains";
      },
    };
  }, []);

  // Create the chunk systems
  const terrainChunkSystem = useMemo(
    () => createTerrainChunkSystem(16, worldSeed),
    [worldSeed]
  );

  const vegetationChunkSystem = useMemo(
    () => createVegetationChunkSystem(terrainGenerator, 32, worldSeed),
    [terrainGenerator, worldSeed]
  );

  // Main render
  return (
    <KeyboardControlsProvider>
      <Canvas shadows>
        <Physics>
          {/* Stats for debugging */}
          <Stats />

          {/* Environment */}
          <ambientLight intensity={0.3} />
          <directionalLight
            position={[100, 100, 0]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <Sky sunPosition={[100, 100, 0]} />

          {/* Camera controller */}
          {/* <OrbitControls target={[0, 0, 0]} maxPolarAngle={Math.PI / 2 - 0.1} /> */}
          <MinecraftCreativeControlsPlayer />
          <PerspectiveCamera
            makeDefault
            position={[0, 20, 50]}
            fov={75}
            near={0.1}
            far={1000}
          />

          {/* Chunk managers */}
          <ChunkManager chunkSystem={terrainChunkSystem} />
          {/* <ChunkManager chunkSystem={vegetationChunkSystem} /> */}

          {/* Debug ground plane */}
          {/* <gridHelper args={[1000, 100]} position={[0, 0.01, 0]} /> */}
        </Physics>
      </Canvas>
    </KeyboardControlsProvider>
  );
};
