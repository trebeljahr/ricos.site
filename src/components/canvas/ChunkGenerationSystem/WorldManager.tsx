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
  | "flat"
  | "temperature"
  | "normals"
  | "colors";

const debug = false;
const normalsDebug = false;
const visualizeHeight = true;
const tileSize = 20;
const tilesDistance = 10;
const mode: Modes = "landscape" as Modes;
const heightNoiseScale = 0.02;
const temperatureNoiseScale = 0.005;
const moistureNoiseScale = 0.004;
const resolution = 10;
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
        const moisture = moistureNoise(worldX, worldZ);
        const temperature = temperatureNoise(worldX, worldZ);

        heightNoiseMap[z + 1][x + 1] = remappedSample;
        heightMap[z + 1][x + 1] = noiseSample * HEIGHT_SCALE;
        moistureMap[z + 1][x + 1] = moisture;
        temperatureMap[z + 1][x + 1] = temperature;
      }
    }

    for (let z = 0; z < resolution; z++) {
      const localZ = z * segmentSize - halfSize;

      for (let x = 0; x < resolution; x++) {
        const localX = x * segmentSize - halfSize;

        const hx = x + 1;
        const hz = z + 1;
        const h = heightNoiseMap[hz][hx];
        const moisture = moistureMap[hz][hx];
        const temperature = temperatureMap[hz][hx];

        // const worldX = position.x + localX;
        // const worldZ = position.z + localZ;
        // const noiseSample = getFractalNoise(worldX, worldZ);
        // const H = noiseSample * HEIGHT_SCALE;
        // const remappedSample = (noiseSample + 1) / 2;
        // console.log(remappedSample === h);

        const scaledHeight = heightMap[hz][hx];
        // console.log(H === scaledHeight);

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

        const height = visualizeHeight ? scaledHeight : 0;

        vertices.push(localX, height, localZ);
        uvs.push(localX / resolution, localZ / resolution);
        normals.push(normal.x, normal.y, normal.z);

        const biome = getBiome(
          temperatureMap[hz][hx],
          moistureMap[hz][hx],
          heightNoiseMap[hz][hx]
        );

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

          indices.push(vertexIndex, vertexIndex + 1, vertexIndex + resolution);

          indices.push(
            vertexIndex + 1,
            vertexIndex + resolution + 1,
            vertexIndex + resolution
          );
        }
      }
    }

    // for (let i = 0; i < resolution - 1; i++) {
    //   for (let j = 0; j < resolution - 1; j++) {
    //     const a = i * (resolution + 1) + (j + 1);
    //     const b = i * (resolution + 1) + j;
    //     const c = (i + 1) * (resolution + 1) + j;
    //     const d = (i + 1) * (resolution + 1) + (j + 1);

    //     indices.push(a, b, d);
    //     indices.push(b, c, d);
    //   }
    // }

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

  useHelper(normalsDebug && meshRef, VertexNormalsHelper, 1, 0xff0000);

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
