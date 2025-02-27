import { useHelper } from "@react-three/drei";
import { HeightfieldCollider, RigidBody } from "@react-three/rapier";
import { useMemo, useRef } from "react";
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";
import { VertexNormalsHelper } from "three-stdlib";
import {
  heightScale,
  mode,
  normalsDebug,
  tileSize,
  visualizeHeight,
  wireframe,
} from "./config";
import { getFractalNoise, moistureNoise, temperatureNoise } from "./noise";
import { BiomeType, getBiome } from "./Biomes";

import {
  addTreeVariation,
  avoidTreeOverlap,
  generateTreePositions,
} from "./TreeSystem";
import { Tree } from "./Tree";

export const TerrainTile = ({
  position,
  resolution,
  lodLevel,
}: {
  position: Vector3;
  resolution: number;
  lodLevel: number;
}) => {
  const { geometry, heightfield, biomeMap, heightMap, slopeMap } =
    useMemo(() => {
      const geo = new BufferGeometry();

      const vertices = [];
      const normals = [];
      const uvs = [];
      const indices = [];
      const colors = [];

      const heightMap: number[][] = new Array(resolution + 2)
        .fill(0)
        .map(() => new Array(resolution + 2).fill(0));

      const heightNoiseMap = new Array(resolution + 2)
        .fill(0)
        .map(() => new Array(resolution + 2).fill(0));

      const moistureMap: number[][] = new Array(resolution + 2)
        .fill(0)
        .map(() => new Array(resolution + 2).fill(0));

      const temperatureMap: number[][] = new Array(resolution + 2)
        .fill(0)
        .map(() => new Array(resolution + 2).fill(0));

      const slopeMap: number[][] = new Array(resolution + 2)
        .fill(0)
        .map(() => new Array(resolution + 2).fill(0));

      const biomeMap: BiomeType[][] = new Array(resolution + 2)
        .fill(0)
        .map(() => new Array(resolution + 2).fill("plains"));

      const _color = new Color();

      const halfSize = tileSize / 2;
      const segmentSize = tileSize / (resolution - 1);

      for (let z = -1; z <= resolution; z++) {
        for (let x = -1; x <= resolution; x++) {
          const localX = x * segmentSize - halfSize;
          const localZ = z * segmentSize - halfSize;

          const worldX = position.x + localX;
          const worldZ = position.z + localZ;

          const noiseSample = getFractalNoise(worldX, worldZ);
          const remappedSample = (noiseSample + 1) / 2;
          const expHeight = Math.pow(remappedSample * heightScale, 2);

          const moisture = moistureNoise(worldX, worldZ);
          const temperature = temperatureNoise(worldX, worldZ);

          heightNoiseMap[z + 1][x + 1] = remappedSample;
          heightMap[z + 1][x + 1] = expHeight;
          moistureMap[z + 1][x + 1] = moisture;
          temperatureMap[z + 1][x + 1] = temperature;
        }
      }

      const heightfield = [];

      for (let z = 0; z < resolution; z++) {
        const localZ = z * segmentSize - halfSize;

        for (let x = 0; x < resolution; x++) {
          const localX = x * segmentSize - halfSize;

          const hx = x + 1;
          const hz = z + 1;
          const h = heightNoiseMap[hz][hx];
          const moisture = moistureMap[hz][hx];
          const temperature = temperatureMap[hz][hx];

          const L = heightMap[hz][hx - 1];
          const R = heightMap[hz][hx + 1];
          const B = heightMap[hz - 1][hx];
          const T = heightMap[hz + 1][hx];

          const vecBot = new Vector3(0, B, -segmentSize);
          const vecTop = new Vector3(0, T, +segmentSize);
          const vecLeft = new Vector3(-segmentSize, L, 0);
          const vecRight = new Vector3(+segmentSize, R, 0);

          const topToBot = vecBot.sub(vecTop);
          const leftToRight = vecLeft.sub(vecRight);

          const normal = topToBot.cross(leftToRight).normalize();

          // Calculate slope for tree placement
          const slope = 1 - Math.abs(normal.y); // 0 = flat, 1 = vertical
          slopeMap[hz][hx] = slope;

          const scaledHeight = heightMap[hz][hx];
          const height = visualizeHeight ? scaledHeight : 0;

          const heightForHeightfield = heightMap[hz][resolution - hx];
          heightfield.push(heightForHeightfield);

          vertices.push(localX, height, localZ);
          uvs.push(localX / resolution, localZ / resolution);
          normals.push(normal.x, normal.y, normal.z);

          const biome = getBiome(
            temperatureMap[hz][hx],
            moistureMap[hz][hx],
            heightNoiseMap[hz][hx]
          );

          biomeMap[hz][hx] = biome;

          const r = localX / tileSize + 0.5;
          const g = localZ / tileSize + 0.5;
          _color.setRGB(r, g, 1);

          if (mode === "height") {
            colors.push(h, h, h);
          } else if (mode === "biome" || mode === "landscape") {
            colors.push(biome.color.r, biome.color.g, biome.color.b);
          } else if (mode === "moisture") {
            colors.push(0, moisture, moisture);
          } else if (mode === "temperature") {
            colors.push(temperature, temperature, temperature);
          } else if (mode === "flat") {
            colors.push(1, 1, 1);
          } else if (mode === "normals") {
            colors.push(normal.x, normal.y, normal.z);
          } else if (mode === "colors") {
            colors.push(_color.r, _color.g, _color.b);
          } else {
            throw Error("Invalid mode");
          }

          if (x < resolution - 1 && z < resolution - 1) {
            const vertexIndex = x + z * resolution;

            indices.push(
              vertexIndex,
              vertexIndex + 1,
              vertexIndex + resolution
            );

            indices.push(
              vertexIndex + 1,
              vertexIndex + resolution + 1,
              vertexIndex + resolution
            );
          }
        }
      }

      geo.setAttribute("normal", new Float32BufferAttribute(normals, 3));
      geo.setAttribute("uv", new Float32BufferAttribute(uvs, 2));

      geo.setAttribute("position", new Float32BufferAttribute(vertices, 3));
      geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
      geo.setIndex(indices);

      geo.scale(1, 1, 1);

      return { geometry: geo, heightfield, biomeMap, heightMap, slopeMap };
    }, [position, resolution]);

  const material = useMemo(() => {
    return new MeshStandardMaterial({
      vertexColors: true,
      wireframe,
      side: DoubleSide,
      flatShading: false,
    });
  }, []);

  const meshRef = useRef<Mesh>(null!);

  useHelper(normalsDebug && meshRef, VertexNormalsHelper, 1, 0xff0000);

  // Generate tree placements based on biome
  const trees = useMemo(() => {
    // Generate initial tree positions with biome consideration
    const initialTrees = generateTreePositions(
      position,
      resolution,
      tileSize,
      biomeMap,
      heightMap,
      slopeMap
    );

    // Avoid overlap between trees
    const nonOverlappingTrees = avoidTreeOverlap(initialTrees, 3);

    // Add variation to make trees look more natural
    return addTreeVariation(nonOverlappingTrees);
  }, [position, resolution, biomeMap, heightMap, slopeMap]);

  return (
    <group position={position}>
      {/* Render multiple trees based on biome */}
      {trees.map((tree, index) => (
        <Tree
          key={`tree-${index}`}
          type={tree.type}
          position={tree.position}
          scale={tree.scale}
        />
      ))}

      <RigidBody colliders={false}>
        <mesh ref={meshRef} geometry={geometry} material={material}></mesh>
        <group scale={[1, 1, 1]} rotation={[0, -Math.PI / 2, 0]}>
          <HeightfieldCollider
            args={[
              resolution - 1,
              resolution - 1,
              heightfield,
              { x: tileSize, y: 1, z: tileSize },
            ]}
          />
        </group>
      </RigidBody>
    </group>
  );
};

function getYPosition(x: number, z: number) {
  const noiseSample = getFractalNoise(x, z);
  const remappedSample = (noiseSample + 1) / 2;
  const expHeight = Math.pow(remappedSample * heightScale, 2);
  return expHeight;
}
