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
    const { position } = geo.attributes;
    const heightfield = [];
    for (let i = 0; i < position.count; i++) {
      const { height } = getHeight(
        position.getX(i) + worldOffset.x,
        position.getZ(i) + worldOffset.z
      );

      position.setY(i, height);

      heightfield.push(height);
    }

    position.needsUpdate = true;
    geo.computeVertexNormals();

    return { geo, heightfield };
  }, [size, divisions, worldOffset]);

  console.log(heightfield);

  useHelper(normalsDebug && meshRef, VertexNormalsHelper, 1, 0xff0000);

  return (
    <group>
      {/* <gridHelper args={[size, size / divisions]} /> */}

      <RigidBody colliders={false}>
        <mesh ref={meshRef} geometry={geo}>
          <meshStandardMaterial
            color={"#c1c1c1"}
            side={DoubleSide}
            vertexColors={true}
          />
        </mesh>

        {/* rotate around Y-axis once */}
        <group rotation={[0, -Math.PI / 2, 0]}>
          <HeightfieldCollider
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
