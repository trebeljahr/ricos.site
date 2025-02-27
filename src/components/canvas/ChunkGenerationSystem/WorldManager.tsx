import { Helper, useHelper } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { createNoise2D, NoiseFunction2D } from "simplex-noise";
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

type Modes =
  | "height"
  | "biome"
  | "moisture"
  | "landscape"
  | "debug"
  | "temperature"
  | "normals";

const debug = false;
const tileSize = 10;
const tilesDistance = 5;
const mode: Modes = "normals" as Modes;
const heightNoiseScale = 0.02;
const temperatureNoiseScale = 0.005;
const moistureNoiseScale = 0.004;
const resolution = 32;
const wireframe = false;

const normalizeNoise = (func: NoiseFunction2D) => {
  return (x: number, y: number) => (func(x, y) + 1) / 2;
};

const scaleNoise = (func: NoiseFunction2D, scale: number) => {
  return (x: number, y: number) => func(x * scale, y * scale);
};

const heightNoise = createNoise2D();
const temperatureNoise = scaleNoise(
  normalizeNoise(createNoise2D()),
  temperatureNoiseScale
);
const moistureNoise = scaleNoise(
  normalizeNoise(createNoise2D()),
  moistureNoiseScale
);

const HEIGHT_SCALE = 30;
const DETAIL_LEVELS = 3;
const PERSISTENCE = 0.5;

export const WorldManager = () => {
  const { camera } = useThree();
  const [cameraGridPosition, setCameraGridPosition] = useState(
    new Vector3(
      Math.floor(camera.position.x / tileSize),
      0,
      Math.floor(camera.position.z / tileSize)
    )
  );

  const activeChunks = useRef(new Map());

  useFrame(() => {
    const currentGridX = Math.floor(camera.position.x / tileSize);
    const currentGridZ = Math.floor(camera.position.z / tileSize);

    if (
      currentGridX !== cameraGridPosition.x ||
      currentGridZ !== cameraGridPosition.z
    ) {
      setCameraGridPosition(new Vector3(currentGridX, 0, currentGridZ));
    }
  });

  const visibleChunks = useMemo(() => {
    const radiusSquared = tilesDistance * tilesDistance;
    const playerGridX = cameraGridPosition.x;
    const playerGridZ = cameraGridPosition.z;

    const newVisibleChunks = new Map();

    for (
      let x = playerGridX - tilesDistance;
      x <= playerGridX + tilesDistance;
      x++
    ) {
      for (
        let z = playerGridZ - tilesDistance;
        z <= playerGridZ + tilesDistance;
        z++
      ) {
        const distanceSquared =
          (x - playerGridX) * (x - playerGridX) +
          (z - playerGridZ) * (z - playerGridZ);

        if (distanceSquared <= radiusSquared) {
          const chunkKey = `${x},${z}`;

          const position = new Vector3(x * tileSize, 0, z * tileSize);

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
  }, [visibleChunks, chunks]);

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

export const TerrainTile = ({ position }: { position: Vector3 }) => {
  const { geometry } = useMemo(() => {
    const geo = new BufferGeometry();

    const vertices = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const colors = [];

    const heightMap: number[][] = new Array(resolution + 3)
      .fill(0)
      .map(() => new Array(resolution + 3).fill(0));

    const heightNoiseMap = new Array(resolution + 3)
      .fill(0)
      .map(() => new Array(resolution + 3).fill(0));

    const moistureMap: number[][] = new Array(resolution + 3)
      .fill(0)
      .map(() => new Array(resolution + 3).fill(0));

    const temperatureMap: number[][] = new Array(resolution + 3)
      .fill(0)
      .map(() => new Array(resolution + 3).fill(0));

    const _color = new Color();

    const halfSize = tileSize / 2;
    const segmentSize = tileSize / resolution;

    for (let i = 0; i <= resolution + 2; i++) {
      for (let j = 0; j <= resolution + 2; j++) {
        const localX = j * segmentSize - halfSize;
        const localZ = i * segmentSize - halfSize;

        const worldX = position.x + localX;
        const worldZ = position.z + localZ;

        const noiseSample = getFractalNoise(worldX, worldZ);
        const remappedSample = (noiseSample + 1) / 2;
        const moisture = moistureNoise(worldX, worldZ);
        const temperature = temperatureNoise(worldX, worldZ);

        heightNoiseMap[i][j] = remappedSample;
        heightMap[i][j] = noiseSample * HEIGHT_SCALE;
        moistureMap[i][j] = moisture;
        temperatureMap[i][j] = temperature;
      }
    }

    for (let i = 0; i <= resolution; i++) {
      const z = i * segmentSize - halfSize;

      for (let j = 0; j <= resolution; j++) {
        const x = j * segmentSize - halfSize;

        const hx = i + 1;
        const hz = j + 1;
        const h = heightNoiseMap[hx][hz];
        const moisture = moistureMap[hx][hz];
        const temperature = temperatureMap[hx][hz];

        const scaledHeight = heightMap[hx][hz];

        const worldX = position.x + x;
        const worldZ = position.z + z;

        const R = heightMap[hx][hz + 1];
        const L = heightMap[hx][hz - 1];
        const B = heightMap[hx - 1][hz];
        const T = heightMap[hx + 1][hz];

        const gradientX = R - L;
        const gradientZ = B - T;

        const horizontal = new Vector3(0, gradientX, segmentSize);
        const vertical = new Vector3(segmentSize, gradientZ, 0);

        const newNormal = horizontal.cross(vertical).normalize();

        const normal = new Vector3(gradientX, -4, gradientZ).normalize();

        const height =
          mode === "landscape" || mode === "normals" ? scaledHeight : 0;

        vertices.push(x, height, z);
        uvs.push(x / resolution, z / resolution);
        normals.push(newNormal.x, newNormal.y, newNormal.z);

        const biome = getBiome(
          temperatureMap[hx][hz],
          moistureMap[hx][hz],
          heightNoiseMap[hx][hz]
        );

        const r = x / tileSize + 0.5;
        const g = z / tileSize + 0.5;
        _color.setRGB(r, g, 1);

        if (mode === "height") {
          colors.push(h, h, h);
        } else if (mode === "biome" || mode === "landscape") {
          colors.push(biome.color.r, biome.color.g, biome.color.b);
        } else if (mode === "moisture") {
          colors.push(0, moisture, moisture);
        } else if (mode === "temperature") {
          colors.push(temperature, temperature, temperature);
        } else if (mode === "debug") {
          colors.push(_color.r, _color.g, _color.b);
        } else if (mode === "normals") {
          colors.push(normal.x, normal.y, normal.z);
        } else {
          throw Error("Invalid mode");
        }
      }
    }

    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const a = i * (resolution + 1) + (j + 1);
        const b = i * (resolution + 1) + j;
        const c = (i + 1) * (resolution + 1) + j;
        const d = (i + 1) * (resolution + 1) + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    geo.setAttribute("normal", new Float32BufferAttribute(normals, 3));
    geo.setAttribute("uv", new Float32BufferAttribute(uvs, 2));

    geo.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);

    return { geometry: geo };
  }, [position]);

  const material = useMemo(() => {
    return new MeshStandardMaterial({
      vertexColors: true,
      wireframe,
      side: DoubleSide,
      flatShading: false,
    });
  }, []);

  const meshRef = useRef<Mesh>(null!);

  useHelper(meshRef.current && meshRef, VertexNormalsHelper, 1, 0xff0000);

  return (
    <>
      <mesh
        ref={meshRef}
        position={position}
        geometry={geometry}
        material={material}
      ></mesh>
    </>
  );
};

export const Tile = ({ position }: { position: Vector3 }) => {
  return <gridHelper args={[tileSize, 1]} position={position} />;
};

function getFractalNoise(worldX: number, worldZ: number) {
  let amplitude = 1;
  let frequency = 1;
  let noiseValue = 0;
  let totalAmplitude = 0;

  for (let i = 0; i < DETAIL_LEVELS; i++) {
    const noiseX = worldX * heightNoiseScale * frequency;
    const noiseZ = worldZ * heightNoiseScale * frequency;

    noiseValue += heightNoise(noiseX, noiseZ) * amplitude;

    totalAmplitude += amplitude;
    amplitude *= PERSISTENCE;
    frequency *= 2;
  }

  return noiseValue / totalAmplitude;
}

function getBiome(nTemp: number, nMoist: number, nHeight: number) {
  if (nHeight > 0.7) {
    return {
      color: new Color("#FFFFFF"),
      name: "Snow",
    };
  }

  if (nHeight > 0.6) {
    return {
      color: new Color("#A0A0A0"),
      name: "Mountain",
    };
  }

  if (nHeight < 0.3) {
    if (nMoist > 0.6) {
      return {
        color: new Color("#0077BE"),
        name: "Ocean",
      };
    }
    if (nMoist > 0.3) {
      return {
        color: new Color("#C2B280"),
        name: "Beach",
      };
    }
  }

  if (nTemp > 0.6) {
    if (nMoist < 0.3) {
      return {
        color: new Color("#EDC9AF"),
        name: "Desert",
      };
    }
    if (nMoist < 0.6) {
      return {
        color: new Color("#ADFF2F"),
        name: "Savanna",
      };
    }
    return {
      color: new Color("#228B22"),
      name: "Tropical Forest",
    };
  }

  if (nTemp > 0.3) {
    if (nMoist < 0.4) {
      return {
        color: new Color("#DAA520"),
        name: "Plains",
      };
    }
    if (nMoist < 0.7) {
      return {
        color: new Color("#228B22"),
        name: "Forest",
      };
    }
    return {
      color: new Color("#006400"),
      name: "Dense Forest",
    };
  }

  if (nMoist < 0.4) {
    return {
      color: new Color("#B5B5B5"),
      name: "Tundra",
    };
  }

  return {
    color: new Color("#006400"),
    name: "Taiga",
  };
}
