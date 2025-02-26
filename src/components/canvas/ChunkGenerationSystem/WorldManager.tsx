import { useThree, useFrame } from "@react-three/fiber";
import { useMemo, useState, useRef, useEffect } from "react";
import {
  Vector3,
  MeshStandardMaterial,
  DoubleSide,
  BufferGeometry,
  Float32BufferAttribute,
  Color,
} from "three";
import { createNoise2D } from "simplex-noise";

const debug = false;
const cellSize = 10;
const visibleRadius = 20;

const simplex = createNoise2D();
const biomeNoise = createNoise2D();
const moistureNoise = createNoise2D();

const NOISE_SCALE = 0.02;
const HEIGHT_SCALE = 20;
const DETAIL_LEVELS = 3;
const PERSISTENCE = 0.5;

const BIOME_SCALE = 0.005;
const MOISTURE_SCALE = 0.004;

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

    noiseValue += simplex(noiseX, noiseZ) * amplitude;

    totalAmplitude += amplitude;
    amplitude *= PERSISTENCE;
    frequency *= 2;
  }

  return noiseValue / totalAmplitude;
}

function getBiome(worldX: number, worldZ: number, height: number) {
  const temperature = biomeNoise(worldX * BIOME_SCALE, worldZ * BIOME_SCALE);
  const moisture = moistureNoise(
    worldX * MOISTURE_SCALE,
    worldZ * MOISTURE_SCALE
  );

  const normalizedHeight = (height + HEIGHT_SCALE) / (HEIGHT_SCALE * 2);

  if (normalizedHeight > 0.7) {
    return {
      color: new Color("#FFFFFF"),
      name: "Snow",
    };
  }

  if (normalizedHeight > 0.6) {
    return {
      color: new Color("#A0A0A0"),
      name: "Mountain",
    };
  }

  if (normalizedHeight < 0.3) {
    if (moisture > 0.6) {
      return {
        color: new Color("#0077BE"),
        name: "Ocean",
      };
    }
    if (moisture > 0.3) {
      return {
        color: new Color("#C2B280"),
        name: "Beach",
      };
    }
  }

  if (temperature > 0.6) {
    if (moisture < 0.3) {
      return {
        color: new Color("#EDC9AF"),
        name: "Desert",
      };
    }
    if (moisture < 0.6) {
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

  if (temperature > 0.3) {
    if (moisture < 0.4) {
      return {
        color: new Color("#DAA520"),
        name: "Plains",
      };
    }
    if (moisture < 0.7) {
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

  if (moisture < 0.4) {
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

export const TerrainTile = ({ position }: { position: Vector3 }) => {
  const resolution = 32;

  const { geometry, vertexColors } = useMemo(() => {
    const geo = new BufferGeometry();

    const vertices = [];
    const normals = [];
    // const uvs = [];
    const indices = [];
    const colors = [];

    // const step = cellSize / (resolution - 1);

    // Calculate heights including neighboring vertices to ensure seamless transitions
    // const heightMap = new Array(resolution + 1)
    //   .fill(0)
    //   .map(() => new Array(resolution + 1).fill(0));

    // const noiseMap = [];
    // const noiseColorMap = [];

    // for (let z = 0; z < resolution; z++) {
    //   for (let x = 0; x < resolution; x++) {
    //     const localX = x * step - cellSize / 2;
    //     const localZ = z * step - cellSize / 2;

    //     const worldX = position.x + localX;
    //     const worldZ = position.z + localZ;

    //     const noiseSample = getFractalNoise(worldX, worldZ);
    //     const remappedSample = (noiseSample + 1) / 2;

    //     heightMap[z][x] = remappedSample * HEIGHT_SCALE;

    //     noiseMap.push(remappedSample);
    //     noiseColorMap.push(remappedSample, remappedSample, remappedSample);
    //   }
    // }

    // const { min, max } = noiseMap.reduce(
    //   (acc, elem) => {
    //     return {
    //       min: Math.min(acc.min, elem),
    //       max: Math.max(acc.max, elem),
    //     };
    //   },
    //   { min: Infinity, max: -Infinity }
    // );
    // console.log(min, max);

    // for (let z = 0; z < resolution; z++) {
    //   for (let x = 0; x < resolution; x++) {
    //     const localX = x * step - cellSize / 2;
    //     const localZ = z * step - cellSize / 2;

    //     const worldX = position.x + localX;
    //     const worldZ = position.z + localZ;

    //     const height = heightMap[z][x];

    //     // vertices.push(localX, Math.pow(1.2, height), localZ);
    //     vertices.push(localX, 0, localZ);

    //     // Determine biome and color
    //     const biome = getBiome(worldX, worldZ, height);
    //     colors.push(biome.color.r, biome.color.g, biome.color.b);

    //     const R = heightMap[z][x + 1];
    //     const L = heightMap[z][Math.max(x - 1, 0)];
    //     const B = heightMap[Math.max(z - 1, 0)][x];
    //     const T = heightMap[z + 1][x];
    //     const normal = new Vector3(2 * (R - L), -4, 2 * (B - T)).normalize();
    //     normals.push(normal.x, normal.y, normal.z);

    //     uvs.push(x / resolution, z / resolution);
    //   }
    // }

    const _color = new Color();

    const halfSize = cellSize / 2;
    const segmentSize = cellSize / resolution;

    for (let i = 0; i <= resolution; i++) {
      const y = i * segmentSize - halfSize;

      for (let j = 0; j <= resolution; j++) {
        const x = j * segmentSize - halfSize;

        vertices.push(x, -y, 0);
        normals.push(0, 0, 1);

        const r = x / cellSize + 0.5;
        const g = y / cellSize + 0.5;

        _color.setRGB(r, g, 1);

        colors.push(_color.r, _color.g, _color.b);
      }
    }

    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const a = i * (resolution + 1) + (j + 1);
        const b = i * (resolution + 1) + j;
        const c = (i + 1) * (resolution + 1) + j;
        const d = (i + 1) * (resolution + 1) + (j + 1);

        // generate two faces (triangles) per iteration

        indices.push(a, b, d); // face one
        indices.push(b, c, d); // face two
      }
    }

    // const hColors = noiseMap
    //   .map((h) => {
    //     return [h, 0, 0];
    //   })
    //   .flat();

    // console.log(
    //   indices.length,
    //   resolution * resolution * 6,
    //   vertices.length,
    //   resolution * resolution * 3,
    //   hColors.length,
    //   colors.length,
    //   noiseColorMap.length
    // );

    // console.log(
    //   colorsFromHeightmap.length,
    //   colors.length,
    //   noiseColorMap.length
    // );
    geo.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    geo.setAttribute("normal", new Float32BufferAttribute(normals, 3));
    // geo.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    // geo.setAttribute("color", new Float32BufferAttribute(noiseColorMap, 3));
    // geo.setAttribute("color", new Float32BufferAttribute(hColors, 3));
    geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);

    return { geometry: geo, vertexColors: colors };
    // }, [position]);
  }, []);

  const material = useMemo(() => {
    return new MeshStandardMaterial({
      vertexColors: true,
      wireframe: false,
      side: DoubleSide,
      flatShading: false,
    });
  }, []);

  return (
    <mesh
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      geometry={geometry}
      material={material}
    />
  );
};

export const Tile = ({ position }: { position: Vector3 }) => {
  return <gridHelper args={[cellSize, 1]} position={position} />;
};
