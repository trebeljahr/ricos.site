import { DoubleSide } from "three";
import { tileSize } from "../ChunkGenerationSystem/config";

export const SimpleGrassGroundPlane = ({
  size = tileSize,
}: {
  size?: number;
} = {}) => {
  return (
    <group position={[size / 2, 0, size / 2]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color={"#378301"} side={DoubleSide} />
      </mesh>
    </group>
  );
};
