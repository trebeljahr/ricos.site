import { useThree, useFrame } from "@react-three/fiber";
import { useMemo, useState, useRef, useEffect } from "react";
import {
  Vector3,
  MeshStandardMaterial,
  DoubleSide,
  BufferGeometry,
  Float32BufferAttribute,
  Color,
  MathUtils,
  Vector2,
} from "three";
import { createNoise2D, createNoise3D } from "simplex-noise";

const debug = false;
const cellSize = 10;
const visibleRadius = 20;

const heightNoise = createNoise2D();
const temperatureNoise = createNoise2D();
const moistureNoise = createNoise2D();
const warpNoise1 = createNoise2D();
const warpNoise2 = createNoise2D();
const noise3D = createNoise3D();

const NOISE_SCALE = 0.02;
const HEIGHT_SCALE = 20;
const DETAIL_LEVELS = 3;
const PERSISTENCE = 0.5;

const WARP_SCALE = 0.005;
const WARP_STRENGTH = 35.0;

const TEMP_MOISTURE_SCALE = 0.002;
const TRANSITION_ZONE = 0.08;

interface BiomeGradient {
  height: number;
  temp: number;
  moisture: number;
  color: Color;
}

const BIOME_GRADIENTS: BiomeGradient[] = [
  { height: 0.2, temp: 0, moisture: 0, color: new Color("#0047AB") },
  { height: 0.28, temp: 0, moisture: 0, color: new Color("#0077BE") },
  { height: 0.34, temp: 0, moisture: 0, color: new Color("#C2B280") },
  { height: 0.38, temp: 0.8, moisture: 0.2, color: new Color("#E4A672") },
  { height: 0.38, temp: 0.7, moisture: 0.4, color: new Color("#D4B95E") },
  { height: 0.38, temp: 0.7, moisture: 0.8, color: new Color("#4CBB17") },
  { height: 0.38, temp: 0.4, moisture: 0.3, color: new Color("#DAA520") },
  { height: 0.38, temp: 0.4, moisture: 0.6, color: new Color("#228B22") },
  { height: 0.38, temp: 0.4, moisture: 0.8, color: new Color("#006400") },
  { height: 0.38, temp: 0.2, moisture: 0.3, color: new Color("#B5B5B5") },
  { height: 0.38, temp: 0.2, moisture: 0.7, color: new Color("#5E7F5E") },
  { height: 0.65, temp: 0, moisture: 0, color: new Color("#8E8E8E") },
  { height: 0.75, temp: 0, moisture: 0, color: new Color("#CCCCCC") },
  { height: 0.85, temp: 0, moisture: 0, color: new Color("#FFFFFF") },
];

export const WorldManager = () => {
  const { camera } = useThree();
  const [cameraGridPosition, setCameraGridPosition] = useState(
    new Vector3(
      Math.floor(camera.position.x / cellSize),
      0,
      Math.floor(camera.position.z / cellSize)
    )
  );

  const activeChunks = useRef(new Map());

  useFrame(() => {
    const currentGridX = Math.floor(camera.position.x / cellSize);
    const currentGridZ = Math.floor(camera.position.z / cellSize);

    if (
      currentGridX !== cameraGridPosition.x ||
      currentGridZ !== cameraGridPosition.z
    ) {
      setCameraGridPosition(new Vector3(currentGridX, 0, currentGridZ));
    }
  });

  const visibleChunks = useMemo(() => {
    const radiusSquared = visibleRadius * visibleRadius;
    const playerGridX = cameraGridPosition.x;
    const playerGridZ = cameraGridPosition.z;

    const newVisibleChunks = new Map();

    for (
      let x = playerGridX - visibleRadius;
      x <= playerGridX + visibleRadius;
      x++
    ) {
      for (
        let z = playerGridZ - visibleRadius;
        z <= playerGridZ + visibleRadius;
        z++
      ) {
        const distanceSquared =
          (x - playerGridX) * (x - playerGridX) +
          (z - playerGridZ) * (z - playerGridZ);

        if (distanceSquared <= radiusSquared) {
          const chunkKey = `${x},${z}`;
          const position = new Vector3(x * cellSize, 0, z * cellSize);
          newVisibleChunks.set(chunkKey, position);
        }
      }
    }

    return newVisibleChunks;
  }, [cameraGridPosition]);

  const [chunks, setChunks] = useState(new Map());

  useEffect(() => {
    const currentActiveChunks = activeChunks.current;
    const newChunks = new Map(chunks);

    currentActiveChunks.forEach((_, key) => {
      if (!visibleChunks.has(key)) {
        newChunks.delete(key);
        currentActiveChunks.delete(key);
      }
    });

    visibleChunks.forEach((position, key) => {
      if (!currentActiveChunks.has(key)) {
        newChunks.set(key, position);
        currentActiveChunks.set(key, true);
      }
    });

    setChunks(newChunks);
  }, [visibleChunks]);

  return (
    <group>
      {Array.from(chunks).map(([key, position]) => {
        return (
          <group key={key}>
            <TerrainTile position={position} />
            {debug && <Tile position={position} />}
          </group>
        );
      })}
    </group>
  );
};

function getWarpedCoordinates(x: number, y: number): Vector2 {
  let warpedX = x;
  let warpedY = y;

  const warp1X = warpNoise1(x * WARP_SCALE, y * WARP_SCALE) * WARP_STRENGTH;
  const warp1Y = warpNoise1(y * WARP_SCALE, x * WARP_SCALE) * WARP_STRENGTH;

  warpedX += warp1X;
  warpedY += warp1Y;

  const warp2X =
    warpNoise2(warpedX * WARP_SCALE * 2, warpedY * WARP_SCALE * 2) *
    (WARP_STRENGTH * 0.5);
  const warp2Y =
    warpNoise2(warpedY * WARP_SCALE * 2, warpedX * WARP_SCALE * 2) *
    (WARP_STRENGTH * 0.5);

  warpedX += warp2X;
  warpedY += warp2Y;

  return new Vector2(warpedX, warpedY);
}

function getFractalNoise(worldX: number, worldZ: number): number {
  const warped = getWarpedCoordinates(worldX, worldZ);

  let amplitude = 1;
  let frequency = 1;
  let noiseValue = 0;
  let totalAmplitude = 0;

  for (let i = 0; i < DETAIL_LEVELS; i++) {
    const noiseX = warped.x * NOISE_SCALE * frequency;
    const noiseZ = warped.y * NOISE_SCALE * frequency;
    const noiseTime = i * 100;

    const octaveNoise =
      heightNoise(noiseX, noiseZ) * 0.7 +
      noise3D(noiseX, noiseZ, noiseTime) * 0.3;

    noiseValue += octaveNoise * amplitude;
    totalAmplitude += amplitude;
    amplitude *= PERSISTENCE;
    frequency *= 2;
  }

  return noiseValue / totalAmplitude;
}

function getBiomeFactors(
  worldX: number,
  worldZ: number
): { temperature: number; moisture: number } {
  const warped = getWarpedCoordinates(worldX, worldZ);

  const temperature = noise3D(
    warped.x * TEMP_MOISTURE_SCALE,
    warped.y * TEMP_MOISTURE_SCALE,
    100
  );

  const moisture = noise3D(
    warped.x * TEMP_MOISTURE_SCALE * 1.5,
    warped.y * TEMP_MOISTURE_SCALE * 1.5,
    200
  );

  return {
    temperature: (temperature + 1) * 0.5,
    moisture: (moisture + 1) * 0.5,
  };
}

function smoothWeight(value: number, min: number, max: number): number {
  if (value < min) return 0;
  if (value > max) return 1;

  const t = (value - min) / (max - min);
  return t * t * (3 - 2 * t);
}

function getBiomeGradientColor(
  worldX: number,
  worldZ: number,
  normalizedHeight: number
): Color {
  const { temperature, moisture } = getBiomeFactors(worldX, worldZ);

  const gradientWeights: { gradient: BiomeGradient; weight: number }[] = [];

  BIOME_GRADIENTS.forEach((gradient) => {
    let weight = 1.0;

    if (gradient.height > 0) {
      if (normalizedHeight < gradient.height - TRANSITION_ZONE) {
        weight = 0;
      } else if (normalizedHeight < gradient.height) {
        weight = smoothWeight(
          normalizedHeight,
          gradient.height - TRANSITION_ZONE,
          gradient.height
        );
      }
    }

    if (gradient.height >= 0.35 && weight > 0 && gradient.temp > 0) {
      const tempDiff = Math.abs(temperature - gradient.temp);
      if (tempDiff > TRANSITION_ZONE * 1.5) {
        weight *= Math.max(0, 1 - (tempDiff - TRANSITION_ZONE * 1.5) * 2);
      }
    }

    if (gradient.height >= 0.35 && weight > 0 && gradient.moisture > 0) {
      const moistDiff = Math.abs(moisture - gradient.moisture);
      if (moistDiff > TRANSITION_ZONE * 1.5) {
        weight *= Math.max(0, 1 - (moistDiff - TRANSITION_ZONE * 1.5) * 2);
      }
    }

    if (gradient.height < 0.35) {
      if (normalizedHeight > gradient.height) {
        weight = 0;
      } else if (normalizedHeight > gradient.height - TRANSITION_ZONE) {
        weight =
          1 -
          smoothWeight(
            normalizedHeight,
            gradient.height - TRANSITION_ZONE,
            gradient.height
          );
      }
    }

    if (weight > 0.01) {
      gradientWeights.push({ gradient, weight });
    }
  });

  if (gradientWeights.length === 0) {
    return new Color("#7CFC00");
  }

  const totalWeight = gradientWeights.reduce(
    (sum, item) => sum + item.weight,
    0
  );

  const blendedColor = new Color(0, 0, 0);

  gradientWeights.forEach(({ gradient, weight }) => {
    const normalizedWeight = weight / totalWeight;
    blendedColor.r += gradient.color.r * normalizedWeight;
    blendedColor.g += gradient.color.g * normalizedWeight;
    blendedColor.b += gradient.color.b * normalizedWeight;
  });

  return blendedColor;
}

export const TerrainTile = ({ position }: { position: Vector3 }) => {
  const resolution = 48;

  const { geometry } = useMemo(() => {
    const geo = new BufferGeometry();

    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const colors: number[] = [];

    const step = cellSize / (resolution - 1);

    const getHeightAt = (worldX: number, worldZ: number): number => {
      return getFractalNoise(worldX, worldZ) * HEIGHT_SCALE;
    };

    const padding = 2;
    const paddedSize = resolution + padding * 2;
    const heightMap: number[][] = Array(paddedSize)
      .fill(0)
      .map(() => Array(paddedSize).fill(0));

    for (let z = -padding; z < resolution + padding; z++) {
      for (let x = -padding; x < resolution + padding; x++) {
        const localX = x * step - cellSize / 2;
        const localZ = z * step - cellSize / 2;

        const worldX = position.x + localX;
        const worldZ = position.z + localZ;

        heightMap[z + padding][x + padding] = getHeightAt(worldX, worldZ);
      }
    }

    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        const localX = x * step - cellSize / 2;
        const localZ = z * step - cellSize / 2;

        const worldX = position.x + localX;
        const worldZ = position.z + localZ;

        const height = heightMap[z + padding][x + padding];

        vertices.push(localX, height, localZ);

        const normalizedHeight = (height + HEIGHT_SCALE) / (HEIGHT_SCALE * 2);

        const vertexColor = getBiomeGradientColor(
          worldX,
          worldZ,
          normalizedHeight
        );
        colors.push(vertexColor.r, vertexColor.g, vertexColor.b);

        const n = new Vector3(0, 0, 0);

        for (let nz = -1; nz <= 1; nz += 1) {
          for (let nx = -1; nx <= 1; nx += 1) {
            if (nx === 0 && nz === 0) continue;

            const hL = heightMap[z + padding + nz][x + padding - 1];
            const hR = heightMap[z + padding + nz][x + padding + 1];
            const hU = heightMap[z + padding - 1][x + padding + nx];
            const hD = heightMap[z + padding + 1][x + padding + nx];

            const nxContrib = (hL - hR) / (2 * step);
            const nzContrib = (hU - hD) / (2 * step);

            n.x += nxContrib;
            n.z += nzContrib;
            n.y += 8;
          }
        }

        n.normalize();
        normals.push(n.x, n.y, n.z);

        uvs.push(x / (resolution - 1), z / (resolution - 1));

        if (x < resolution - 1 && z < resolution - 1) {
          const vertexIndex = x + z * resolution;

          indices.push(vertexIndex, vertexIndex + 1, vertexIndex + resolution);
          indices.push(
            vertexIndex + 1,
            vertexIndex + resolution + 1,
            vertexIndex + resolution
          );
        }
      }
    }

    geo.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    geo.setAttribute("normal", new Float32BufferAttribute(normals, 3));
    geo.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);

    return { geometry: geo };
  }, [position]);

  const material = useMemo(() => {
    return new MeshStandardMaterial({
      vertexColors: true,
      wireframe: false,
      side: DoubleSide,
      flatShading: false,
      roughness: 0.85,
      metalness: 0.05,
    });
  }, []);

  return (
    <mesh
      position={position}
      rotation={[0, 0, 0]}
      geometry={geometry}
      material={material}
    />
  );
};

export const Tile = ({ position }: { position: Vector3 }) => {
  return <gridHelper args={[cellSize, 1]} position={position} />;
};
