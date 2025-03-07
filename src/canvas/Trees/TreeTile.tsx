import { splitIntoRandomGroups } from "src/lib/utils/randomGroups";
import { InstancedBirchTree1 } from "src/canvas/models/nature_pack/BirchTree_1";
import { InstancedBush1 } from "src/canvas/models/nature_pack/Bush_1";
import { InstancedCommonTree5 } from "src/canvas/models/nature_pack/CommonTree_5";
import { InstancedPineTree1 } from "src/canvas/models/nature_pack/PineTree_1";
import { InstancedWillow1 } from "src/canvas/models/nature_pack/Willow_1";
import { Sphere } from "@react-three/drei";
import { nanoid } from "nanoid";
import { useMemo } from "react";
import { DoubleSide, Vector2 } from "three";
import { debug, tileSize } from "../ChunkGenerationSystem/config";
import { poissonDiskSample } from "../../lib/utils/noise";
import { SimpleGrassGroundPlane } from "../Helpers/SimpleGrassGroundPlane";

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

  return (
    <group>
      {models.map((Model, index) => (
        <Model key={index} positions={groups[index]} />
      ))}

      <SimpleGrassGroundPlane size={size} />

      {debug && (
        <>
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
