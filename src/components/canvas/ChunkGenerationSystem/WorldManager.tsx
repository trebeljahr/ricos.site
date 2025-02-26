import { useMemo } from "react";
import { Vector3 } from "three";

const cellSize = 5;

export const WorldManager = () => {
  const chunks = useMemo(() => {
    const chunks = [];
    for (let x = -10; x <= 10; x++) {
      for (let z = -10; z <= 10; z++) {
        chunks.push(
          <Tile position={new Vector3(x * cellSize, 0, z * cellSize)} />
        );
      }
    }
    return chunks;
  }, []);

  return <group>{chunks}</group>;
};

export const Tile = ({ position }: { position: Vector3 }) => {
  return <gridHelper args={[cellSize, 1]} position={position} />;
};
