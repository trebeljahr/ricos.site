import { useThree, useFrame } from "@react-three/fiber";
import { useMemo, useState, useRef, useEffect } from "react";
import {
  Vector3,
  PlaneGeometry,
  MeshStandardMaterial,
  Mesh,
  DoubleSide,
  BufferGeometry,
  Float32BufferAttribute,
} from "three";
import { createNoise2D } from "simplex-noise";

const debug = false;
const cellSize = 10;
const visibleRadius = 20;

const simplex = createNoise2D();

const NOISE_SCALE = 0.02;
const HEIGHT_SCALE = 20;
const DETAIL_LEVELS = 3;
const PERSISTENCE = 0.5;

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
      {/* Convert the Map to an array to render the chunks */}
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

export const TerrainTile = ({ position }: { position: Vector3 }) => {
  const geometry = useMemo(() => {
    const resolution = 32;
    const geo = new BufferGeometry();

    const vertices = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    const step = cellSize / (resolution - 1);

    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        const localX = x * step - cellSize / 2;
        const localZ = z * step - cellSize / 2;

        const worldX = position.x + localX;
        const worldZ = position.z + localZ;

        const height = getFractalNoise(worldX, worldZ) * HEIGHT_SCALE;

        vertices.push(localX, height, localZ);

        normals.push(0, 1, 0);

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
    geo.setIndex(indices);

    geo.computeVertexNormals();

    return geo;
  }, [position]);

  const material = useMemo(() => {
    return new MeshStandardMaterial({
      color: "#82e000",
      wireframe: false,
      side: DoubleSide,
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
