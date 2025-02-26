import React, { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import { Vector3 } from "three";
import { ChunkSystem, ChunkCoord } from "./ChunkManager";
import { createNoise2D, NoiseFunction2D } from "simplex-noise";

// Create a terrain generator using simplex noise
class TerrainGenerator {
  private simplex: NoiseFunction2D;
  private scale: number;
  private amplitude: number;

  constructor(seed = Math.random() * 1000, scale = 0.005, amplitude = 30) {
    const noise = createNoise2D();

    this.simplex = noise;
    this.scale = scale;
    this.amplitude = amplitude;
  }

  // Generate height at a specific x,z coordinate
  getHeight(x: number, z: number): number {
    // Multi-octave noise for more interesting terrain
    const elevation =
      this.simplex(x * this.scale, z * this.scale) * this.amplitude +
      this.simplex(x * this.scale * 2, z * this.scale * 2) *
        this.amplitude *
        0.5 +
      this.simplex(x * this.scale * 4, z * this.scale * 4) *
        this.amplitude *
        0.25;

    return elevation;
  }

  // Get the biome type at a specific x,z coordinate
  getBiome(x: number, z: number): "plains" | "mountains" | "desert" {
    // Use a different noise function for biomes to prevent correlation with height
    const biomeValue = this.simplex(x * 0.001 + 500, z * 0.001 + 500);

    if (biomeValue < -0.3) return "desert";
    if (biomeValue > 0.3) return "mountains";
    return "plains";
  }
}

// Define a chunk system for terrain
export const createTerrainChunkSystem = (
  resolution = 16, // vertices per side
  seed = Math.random() * 1000
): ChunkSystem => {
  // Create a terrain generator with the provided seed
  const terrainGenerator = new TerrainGenerator(seed);

  // Define the chunk size in world units
  const chunkSize = 32; // larger chunks for terrain is usually better

  // Create a material cache to avoid recreating materials
  const materialCache = {
    plains: { color: "#4caf50", roughness: 0.8 },
    mountains: { color: "#795548", roughness: 0.9 },
    desert: { color: "#ffd54f", roughness: 0.3 },
  };

  return {
    chunkSize,
    viewDistance: 8, // Load 8 chunks in each direction
    maxActiveChunks: 256, // Limit memory usage
    loadingStrategy: "hybrid", // Prioritize frustum but also keep nearby chunks

    // Create a terrain chunk
    createChunk: (coord: ChunkCoord, position: Vector3) => {
      // Sample center point for biome determination
      const centerX = position.x;
      const centerZ = position.z;
      const biome = terrainGenerator.getBiome(centerX, centerZ);

      // Create a grid of vertices
      const vertices = [];
      const indices = [];
      const uvs = [];

      // Step size between vertices
      const step = chunkSize / (resolution - 1);

      // Generate the grid of vertices
      for (let z = 0; z < resolution; z++) {
        for (let x = 0; x < resolution; x++) {
          // Calculate world position of this vertex
          const worldX = coord[0] * chunkSize + x * step;
          const worldZ = coord[2] * chunkSize + z * step;

          // Get height at this position
          const height = terrainGenerator.getHeight(worldX, worldZ);

          // Add vertex (relative to chunk position)
          vertices.push(
            x * step - chunkSize / 2, // x
            height - position.y, // y (height)
            z * step - chunkSize / 2 // z
          );

          // Add UV coordinates for texturing
          uvs.push(x / (resolution - 1), z / (resolution - 1));
        }
      }

      // Create triangle indices
      for (let z = 0; z < resolution - 1; z++) {
        for (let x = 0; x < resolution - 1; x++) {
          const a = x + z * resolution;
          const b = x + 1 + z * resolution;
          const c = x + (z + 1) * resolution;
          const d = x + 1 + (z + 1) * resolution;

          // First triangle
          indices.push(a, c, b);

          // Second triangle
          indices.push(b, c, d);
        }
      }

      // Create the mesh
      return (
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array(vertices)}
              count={vertices.length / 3}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-uv"
              array={new Float32Array(uvs)}
              count={uvs.length / 2}
              itemSize={2}
            />
            <bufferAttribute
              attach="index"
              array={new Uint32Array(indices)}
              count={indices.length}
              itemSize={1}
            />
          </bufferGeometry>
          <meshStandardMaterial {...materialCache[biome]} wireframe={false} />
        </mesh>
      );
    },
  };
};
