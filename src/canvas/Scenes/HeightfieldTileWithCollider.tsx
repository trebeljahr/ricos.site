import { getHeight } from "@r3f/ChunkGenerationSystem/TerrainTile";
import { useHelper } from "@react-three/drei";
import { HeightfieldCollider, RigidBody } from "@react-three/rapier";
import { useMemo, useRef } from "react";
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";
import { VertexNormalsHelper } from "three-stdlib";

const defaultTileSize = 10;

export const HeightfieldTileWithCollider = ({
  position,
  resolution,
  size = defaultTileSize,
  debugNormals = false,
}: {
  position: Vector3;
  resolution: number;
  size: number;
  debugNormals?: boolean;
}) => {
  const { geometry, heightfield } = useMemo(() => {
    const halfSize = size / 2;
    const segmentSize = size / (resolution - 1);

    const geo = new BufferGeometry();
    const vertices = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    // have 2 extra rows and columns to calculate normals with offsets
    const n = resolution + 2;
    const heightMap: number[][] = Array.from(Array(n), () => new Array(n));

    for (let z = -1; z <= resolution; z++) {
      const localZ = z * segmentSize - halfSize;
      const worldZ = position.z - halfSize + localZ;

      for (let x = -1; x <= resolution; x++) {
        const localX = x * segmentSize - halfSize;
        const worldX = position.x - halfSize + localX;

        const { height } = getHeight(worldX, worldZ);
        heightMap[z + 1][x + 1] = height;
      }
    }

    const heightfield = [];

    for (let z = 0; z < resolution; z++) {
      const localZ = z * segmentSize - halfSize;

      for (let x = 0; x < resolution; x++) {
        const localX = x * segmentSize - halfSize;

        const hx = x + 1; // offset by 1 to account for extra row and column
        const hz = z + 1; // offset by 1 to account for extra row and column

        const height = heightMap[hz][hx];
        // get heights of surrounding vertices
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

        // store height for heightfield collider => traverse heights in x direction in reverse order because that's how the heightfield collider expects it
        const heightForHeightfield = heightMap[hz][resolution + 1 - hx];
        heightfield.push(heightForHeightfield);

        vertices.push(localX, height, localZ);
        uvs.push(localX / resolution, localZ / resolution);
        normals.push(normal.x, normal.y, normal.z);

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

    geo.setAttribute("normal", new Float32BufferAttribute(normals, 3));
    geo.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    geo.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    geo.setIndex(indices);

    return { geometry: geo, heightfield, heightMap };
  }, [position, resolution, size]);

  const material = useMemo(() => {
    return new MeshStandardMaterial({
      side: DoubleSide,
      color: "#989898",
    });
  }, []);

  const meshRef = useRef<Mesh>(null!);

  useHelper(debugNormals && meshRef, VertexNormalsHelper, 1, 0xff0000);

  return (
    <group>
      <RigidBody colliders={false}>
        <mesh ref={meshRef} geometry={geometry} material={material} />

        {/* rotate around Y-axis once */}
        <group rotation={[0, -Math.PI / 2, 0]}>
          <HeightfieldCollider
            args={[
              resolution - 1,
              resolution - 1,
              heightfield,
              { x: size, y: 1, z: size },
            ]}
          />
        </group>
      </RigidBody>
    </group>
  );
};
