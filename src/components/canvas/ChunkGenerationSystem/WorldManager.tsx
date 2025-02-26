import { useThree, useFrame } from "@react-three/fiber";
import { useMemo, useState } from "react";
import {
  Vector3,
  PlaneGeometry,
  MeshStandardMaterial,
  Mesh,
  DoubleSide,
} from "three";
import { createNoise2D } from "simplex-noise";

const cellSize = 10;
const visibleRadius = 2;

const simplex = createNoise2D();

const NOISE_SCALE = 0.005;
const HEIGHT_SCALE = 30;
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

  const chunks = useMemo(() => {
    const chunks = [];
    const radiusSquared = visibleRadius * visibleRadius;

    const playerGridX = cameraGridPosition.x;
    const playerGridZ = cameraGridPosition.z;

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
          chunks.push(new Vector3(x * cellSize, 0, z * cellSize));
        }
      }
    }
    return chunks;
  }, [cameraGridPosition]);

  return (
    <group>
      {chunks.map((pos) => {
        return (
          <>
            <TerrainTile key={`${pos.x},${pos.z}`} position={pos} />
            <Tile key={`${pos.x},${pos.z}grid`} position={pos} />
          </>
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
    const geo = new PlaneGeometry(
      cellSize,
      cellSize,
      resolution - 1,
      resolution - 1
    );

    // const tileWorldX = position.x;
    // const tileWorldZ = position.z;

    // const positionAttribute = geo.attributes.position;
    // const vertices = positionAttribute.count;

    // for (let i = 0; i < vertices; i++) {
    //   const x = positionAttribute.getX(i);
    //   const z = positionAttribute.getZ(i);

    //   const worldX = tileWorldX + x;
    //   const worldZ = tileWorldZ + z;

    //   const height = getFractalNoise(worldX, worldZ) * HEIGHT_SCALE;
    //   positionAttribute.setY(i, height);
    // }

    // geo.computeVertexNormals();
    return geo;
  }, [position]);

  const material = useMemo(() => {
    return new MeshStandardMaterial({
      color: "#82e000",
      wireframe: false,
      flatShading: true,
      side: DoubleSide,
    });
  }, []);

  console.log(position);

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
