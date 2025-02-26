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
    const uvs = [];
    const indices = [];
    const colors = [];

    const step = cellSize / (resolution - 1);

    // Calculate heights including neighboring vertices to ensure seamless transitions
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

        vertices.push(localX, 0, localZ);

        // Determine biome and color
        const biome = getBiome(worldX, worldZ, height);
        colors.push(biome.color.r, biome.color.g, biome.color.b);

        // Calculate normals using neighboring heights for smoother transitions
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

    return { geometry: geo, vertexColors: colors };
  }, [position]);

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
      rotation={[0, 0, 0]}
      geometry={geometry}
      material={material}
    />
  );
};

export const Tile = ({ position }: { position: Vector3 }) => {
  return <gridHelper args={[cellSize, 1]} position={position} />;
};
