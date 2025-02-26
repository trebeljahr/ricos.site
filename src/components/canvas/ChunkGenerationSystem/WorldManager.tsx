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
} from "three";
import { createNoise2D } from "simplex-noise";

const debug = false;
const cellSize = 10;
const visibleRadius = 20;

const heightNoise = createNoise2D();
const temperatureNoise = createNoise2D();
const moistureNoise = createNoise2D();

const NOISE_SCALE = 0.02;
const HEIGHT_SCALE = 20;
const DETAIL_LEVELS = 3;
const PERSISTENCE = 0.5;

const TEMPERATURE_SCALE = 0.003;
const MOISTURE_SCALE = 0.0025;

const BIOME_BLEND_DISTANCE = 2.0;

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

function getFractalNoise(worldX: number, worldZ: number) {
  let amplitude = 1;
  let frequency = 1;
  let noiseValue = 0;
  let totalAmplitude = 0;

  for (let i = 0; i < DETAIL_LEVELS; i++) {
    const noiseX = worldX * NOISE_SCALE * frequency;
    const noiseZ = worldZ * NOISE_SCALE * frequency;

    noiseValue += heightNoise(noiseX, noiseZ) * amplitude;

    totalAmplitude += amplitude;
    amplitude *= PERSISTENCE;
    frequency *= 2;
  }

  return noiseValue / totalAmplitude;
}

function getClimateParameters(worldX: number, worldZ: number) {
  const warpStrength = 10.0;
  const warpX = heightNoise(worldX * 0.01, worldZ * 0.01) * warpStrength;
  const warpZ = heightNoise(worldZ * 0.01, worldX * 0.01) * warpStrength;

  const distortedX = worldX + warpX;
  const distortedZ = worldZ + warpZ;

  const temperature = temperatureNoise(
    distortedX * TEMPERATURE_SCALE,
    distortedZ * TEMPERATURE_SCALE
  );

  const moisture = moistureNoise(
    distortedX * MOISTURE_SCALE + 100,
    distortedZ * MOISTURE_SCALE + 100
  );

  return {
    temperature: (temperature + 1) * 0.5,
    moisture: (moisture + 1) * 0.5,
  };
}

const BIOMES = [
  {
    name: "Ocean",
    color: new Color("#0077BE"),
    heightThreshold: 0.3,
    temperatureWeight: 0,
    moistureWeight: 0,
  },
  {
    name: "Beach",
    color: new Color("#C2B280"),
    heightThreshold: 0.32,
    temperatureWeight: 0,
    moistureWeight: 0,
  },
  {
    name: "Desert",
    color: new Color("#EDC9AF"),
    heightThreshold: 0.35,
    temperatureThreshold: 0.7,
    moistureThreshold: 0.3,
  },
  {
    name: "Savanna",
    color: new Color("#ADFF2F"),
    heightThreshold: 0.35,
    temperatureThreshold: 0.7,
    moistureThreshold: 0.6,
  },
  {
    name: "Tropical Forest",
    color: new Color("#228B22"),
    heightThreshold: 0.35,
    temperatureThreshold: 0.7,
    moistureThreshold: 1.0,
  },
  {
    name: "Plains",
    color: new Color("#DAA520"),
    heightThreshold: 0.35,
    temperatureThreshold: 0.4,
    moistureThreshold: 0.4,
  },
  {
    name: "Forest",
    color: new Color("#228B22"),
    heightThreshold: 0.35,
    temperatureThreshold: 0.4,
    moistureThreshold: 0.7,
  },
  {
    name: "Dense Forest",
    color: new Color("#006400"),
    heightThreshold: 0.35,
    temperatureThreshold: 0.4,
    moistureThreshold: 1.0,
  },
  {
    name: "Tundra",
    color: new Color("#B5B5B5"),
    heightThreshold: 0.35,
    temperatureThreshold: 0.0,
    moistureThreshold: 0.4,
  },
  {
    name: "Taiga",
    color: new Color("#006400"),
    heightThreshold: 0.35,
    temperatureThreshold: 0.0,
    moistureThreshold: 1.0,
  },
  {
    name: "Mountain",
    color: new Color("#A0A0A0"),
    heightThreshold: 0.7,
    temperatureWeight: 0,
    moistureWeight: 0,
  },
  {
    name: "Snow",
    color: new Color("#FFFFFF"),
    heightThreshold: 0.8,
    temperatureWeight: 0,
    moistureWeight: 0,
  },
];

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = MathUtils.clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3 - 2 * t);
}

type Biome = {
  biome: {
    name: string;
    color: Color;
    heightThreshold?: number;
    temperatureWeight?: number;
    moistureWeight?: number;
    temperatureThreshold?: number;
    moistureThreshold?: number;
  };
  weight: number;
};

function getBiomeColor(worldX: number, worldZ: number, height: number) {
  const normalizedHeight = (height + HEIGHT_SCALE) / (HEIGHT_SCALE * 2);

  const { temperature, moisture } = getClimateParameters(worldX, worldZ);

  const applicableBiomes: Biome[] = [];

  BIOMES.forEach((biome) => {
    let weight = 1.0;

    if (biome.heightThreshold !== undefined) {
      if (normalizedHeight > biome.heightThreshold) {
        const nextBiomeThreshold = biome.heightThreshold + 0.03;
        weight *= smoothstep(
          biome.heightThreshold,
          nextBiomeThreshold,
          normalizedHeight
        );
      } else {
        weight = 0;
      }
    }

    if (biome.temperatureThreshold !== undefined && weight > 0) {
      const tempWeight =
        biome.temperatureThreshold > temperature
          ? smoothstep(
              biome.temperatureThreshold - 0.1,
              biome.temperatureThreshold,
              temperature
            )
          : 1.0 -
            smoothstep(
              biome.temperatureThreshold,
              biome.temperatureThreshold + 0.1,
              temperature
            );
      weight *= tempWeight;
    }

    if (biome.moistureThreshold !== undefined && weight > 0) {
      const moistWeight =
        moisture < biome.moistureThreshold
          ? smoothstep(
              biome.moistureThreshold - 0.1,
              biome.moistureThreshold,
              moisture
            )
          : 1.0;
      weight *= moistWeight;
    }

    if (weight > 0.01) {
      const bio = {
        biome,
        weight,
      };
      applicableBiomes.push(bio);
    }
  });

  if (applicableBiomes.length === 0) {
    return new Color("#7CFC00");
  }

  const totalWeight = applicableBiomes.reduce(
    (sum, item) => sum + item.weight,
    0
  );

  const blendedColor = new Color(0, 0, 0);

  applicableBiomes.forEach(({ biome, weight }) => {
    const normalizedWeight = weight / totalWeight;
    blendedColor.r += biome.color.r * normalizedWeight;
    blendedColor.g += biome.color.g * normalizedWeight;
    blendedColor.b += biome.color.b * normalizedWeight;
  });

  return blendedColor;
}

export const TerrainTile = ({ position }: { position: Vector3 }) => {
  const resolution = 32;

  const { geometry } = useMemo(() => {
    const geo = new BufferGeometry();

    const vertices = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const colors = [];

    const step = cellSize / (resolution - 1);

    const heightMap = new Array(resolution + 2)
      .fill(0)
      .map(() => new Array(resolution + 2).fill(0));

    for (let z = -1; z <= resolution; z++) {
      for (let x = -1; x <= resolution; x++) {
        const localX = x * step - cellSize / 2;
        const localZ = z * step - cellSize / 2;

        const worldX = position.x + localX;
        const worldZ = position.z + localZ;

        heightMap[z + 1][x + 1] =
          getFractalNoise(worldX, worldZ) * HEIGHT_SCALE;
      }
    }

    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        const localX = x * step - cellSize / 2;
        const localZ = z * step - cellSize / 2;

        const worldX = position.x + localX;
        const worldZ = position.z + localZ;

        const height = heightMap[z + 1][x + 1];

        vertices.push(localX, height, localZ);

        const vertexColor = getBiomeColor(worldX, worldZ, height);
        colors.push(vertexColor.r, vertexColor.g, vertexColor.b);

        const hL = heightMap[z + 1][x];
        const hR = heightMap[z + 1][x + 2];
        const hU = heightMap[z][x + 1];
        const hD = heightMap[z + 2][x + 1];

        const nX = (hL - hR) / (2 * step);
        const nZ = (hU - hD) / (2 * step);

        const normal = new Vector3(nX, 1, nZ).normalize();
        normals.push(normal.x, normal.y, normal.z);

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
      roughness: 0.8,
      metalness: 0.1,
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
