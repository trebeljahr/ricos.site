import { normalsDebug } from "@r3f/ChunkGenerationSystem/config";
import { getHeight } from "@r3f/ChunkGenerationSystem/TerrainTile";
import { useHelper } from "@react-three/drei";
import { HeightfieldCollider, RigidBody } from "@react-three/rapier";
import { useMemo, useRef } from "react";
import {
  BufferGeometry,
  Color,
  DoubleSide,
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

  useHelper(normalsDebug && meshRef, VertexNormalsHelper, 1, 0xff0000);

  return (
    <group>
      <RigidBody colliders={false}>
        <mesh ref={meshRef} geometry={geo} castShadow receiveShadow>
          <meshPhysicalMaterial
            color={"#c1c1c1"}
            side={DoubleSide}
            // vertexColors={true}
          />
        </mesh>

        <group rotation={[0, -Math.PI / 2, 0]}>
          <HeightfieldCollider
            // scale={[1, 1, -1]}
            args={[
              divisions - 1,
              divisions - 1,
              heightfield,
              { x: size, y: 1, z: size },
            ]}
          />
        </group>
      </RigidBody>
    </group>
  );
};
