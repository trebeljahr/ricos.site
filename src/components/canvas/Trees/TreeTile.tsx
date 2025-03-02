import { splitIntoRandomGroups } from "@components/canvas/Trees/utils";
import { poissonDiskSample } from "@components/canvas/Yuka/YukaExample";
import { InstancedBirchTree1 } from "@models/nature_pack/BirchTree_1";
import { InstancedBush1 } from "@models/nature_pack/Bush_1";
import { InstancedCommonTree5 } from "@models/nature_pack/CommonTree_5";
import { InstancedPineTree1 } from "@models/nature_pack/PineTree_1";
import { InstancedWillow1 } from "@models/nature_pack/Willow_1";
import { useMemo } from "react";
import { DoubleSide, Vector2, Vector3 } from "three";
import { debug, tileSize } from "../ChunkGenerationSystem/config";
import { Sphere } from "@react-three/drei";
import { nanoid } from "nanoid";

export const TreeTile = ({
  size = 100,
  offset = new Vector2(0, 0),
}: { size?: number; offset?: Vector2 } = {}) => {
  const positions = useMemo(
    () => poissonDiskSample(size, 3, 20, { offset }),
    [size, offset]
  );

  const groups = splitIntoRandomGroups(positions, 5);
  const models = [
    InstancedBirchTree1,
    InstancedBush1,
    InstancedPineTree1,
    InstancedWillow1,
    InstancedCommonTree5,
  ];

  const debugPositions = [
    new Vector3(-size / 2, 0, 0),
    new Vector3(size / 2, 0, 0),
    new Vector3(0, 0, -size / 2),
    new Vector3(0, 0, size / 2),
    // new Vector3(0, 0, 0),

    // new Vector3(0, 0, 0),
    // new Vector3(0, 0, 0),

    // new Vector3(0, 0, 0),
    // new Vector3(0, 0, 0),
    // new Vector3(0, 0, 0),
    // new Vector3(0, 0, 0),

    // new Vector3(0, 0, size),
    // new Vector3(size, 0, 0),
    // new Vector3(size, 0, size),
  ];

  return (
    <group>
      {models.map((Model, index) => (
        <Model key={index} positions={groups[index]} />
      ))}
      {/* <InstancedBirchTree1 positions={positions} /> */}

      {debug && (
        <>
          <group position={[tileSize / 2, 0, tileSize / 2]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[size, size]} />
              <meshBasicMaterial color={"#6aff00"} side={DoubleSide} />
            </mesh>
          </group>
          {positions.map((position, index) => {
            return (
              <group key={nanoid() + index} position={position}>
                <Sphere args={[0.5, 16, 16]}>
                  <meshBasicMaterial color={"#005105"} />
                </Sphere>
              </group>
            );
          })}
        </>
      )}
    </group>
  );
};
