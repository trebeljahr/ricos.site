import { normalsDebug } from "@r3f/ChunkGenerationSystem/config";
import { getHeight } from "@r3f/ChunkGenerationSystem/TerrainTile";
import { useHelper } from "@react-three/drei";
import { HeightfieldCollider, RigidBody } from "@react-three/rapier";
import { useControls } from "leva";
import { useMemo, useRef } from "react";
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  PlaneGeometry,
  Vector3,
} from "three";
import { VertexNormalsHelper } from "three-stdlib";

const defaultTileSize = 10;
const color = new Color("#c1c1c1");
export const HeightfieldTileWithCollider = ({
  worldOffset,
  divisions,
  size = defaultTileSize,
}: {
  worldOffset: Vector3;
  divisions: number;
  size: number;
}) => {
  const { withComputeNormals } = useControls({
    withComputeNormals: false,
  });

  const meshRef = useRef<Mesh>(null!);

  const { geo, heightfield } = useMemo(() => {
    const geo = new PlaneGeometry(size, size, divisions - 1, divisions - 1);
    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position as Float32BufferAttribute;

    const n = divisions;
    const heightMap: number[][] = Array.from(Array(n), () => new Array(n));
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const ix = Math.floor(i % divisions);
      const iz = Math.floor(i / divisions);

      const height = getHeight(x + worldOffset.x, z + worldOffset.z).height;
      positions.setY(i, height);
      heightMap[iz][divisions + 1 - ix] = height;
    }

    const heights = heightMap.flat();
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();

    return { geo, heightfield: heights };
  }, [size, worldOffset, divisions]);

  const alternate = useMemo(() => {
    const resolution = divisions;
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
      const worldZ = worldOffset.z + localZ;

      for (let x = -1; x <= resolution; x++) {
        const localX = x * segmentSize - halfSize;
        const worldX = worldOffset.x + localX;

        const { height } = getHeight(worldX, worldZ);
        heightMap[z + 1][x + 1] = height;
      }
    }

    const heightfield = [];

    for (let z = 0; z < resolution; z++) {
      const localZ = z * segmentSize;

      for (let x = 0; x < resolution; x++) {
        const localX = x * segmentSize;

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

        const topToBot = vecTop.sub(vecBot);
        const leftToRight = vecLeft.sub(vecRight);
        const oldNormal = topToBot.cross(leftToRight).negate().normalize();

        const normal = oldNormal; // .negate();
        // rotate normal by 180 degrees around x axis
        // const normal = new Vector3(oldNormal.x, -oldNormal.y, oldNormal.z);

        // normal.x = -normal.x;
        // store height for heightfield collider => traverse heights in x direction in reverse order because that's how the heightfield collider expects it
        const heightForHeightfield = heightMap[hz][resolution + 1 - hx];
        heightfield.push(heightForHeightfield);

        vertices.push(localX - halfSize, height, localZ - halfSize);
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

    // the .reverse() is necessary to correct the winding order!
    // if not set the "back" of the plane will be facing up
    geo.setIndex(indices.reverse());

    return { geometry: geo, heightfield, heightMap };
  }, [worldOffset, divisions, size]);

  useHelper(normalsDebug && meshRef, VertexNormalsHelper, 1, 0xff0000);

  return (
    <group>
      <RigidBody colliders={false}>
        {withComputeNormals ? (
          <mesh ref={meshRef} geometry={geo} castShadow receiveShadow>
            <meshPhysicalMaterial color={"#c1c1c1"} />
          </mesh>
        ) : (
          <mesh
            ref={meshRef}
            geometry={alternate.geometry}
            castShadow
            receiveShadow
          >
            <meshPhysicalMaterial color={"#c1c1c1"} />
          </mesh>
        )}

        <group rotation={[0, -Math.PI / 2, 0]}>
          <HeightfieldCollider
            // scale={[1, 1, -1]}
            args={[
              divisions - 1,
              divisions - 1,
              withComputeNormals ? heightfield : alternate.heightfield,
              { x: size, y: 1, z: size },
            ]}
          />
        </group>
      </RigidBody>
    </group>
  );
};
