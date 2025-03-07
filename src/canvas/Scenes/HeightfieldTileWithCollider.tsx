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
    const heights = Array.from({
      length: divisions * divisions,
    }).map((_, index) => {
      const x = index % size;
      const z = Math.floor(index / size);

      const { height } = getHeight(x + worldOffset.x, z + worldOffset.z);
      return height;
    });

    const geo = new PlaneGeometry(size, size, divisions - 1, divisions - 1);

    heights.forEach((height, i) => {
      geo.attributes.position.setY(i, height);
    });

    geo.scale(1, -1, 1);
    geo.rotateX(-Math.PI / 2);
    geo.rotateY(-Math.PI / 2);
    geo.computeVertexNormals();

    return { geo, heightfield: heights };
  }, [size, worldOffset, divisions]);

  console.log(heightfield);

  useHelper(normalsDebug && meshRef, VertexNormalsHelper, 1, 0xff0000);

  return (
    <group>
      <RigidBody colliders={false}>
        <mesh ref={meshRef} geometry={geo} castShadow receiveShadow>
          {/* <planeBufferGeometry args={[size, size, size - 1, size - 1]} /> */}
          <meshPhysicalMaterial
            color={"#c1c1c1"}
            side={DoubleSide}
            vertexColors={true}
          />
        </mesh>

        {/* rotate around Y-axis once */}
        <HeightfieldCollider
          args={[
            divisions - 1,
            divisions - 1,
            heightfield,
            { x: size, y: 1, z: size },
          ]}
        />
      </RigidBody>
    </group>
  );
};
