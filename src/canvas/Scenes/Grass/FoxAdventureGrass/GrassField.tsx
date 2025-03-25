import { TerrainData } from "./generateTerrainData";
import { GrassPlane } from "./GrassChunk";

type GrassFieldProps = {
  terrainData: TerrainData;
  chunkSize: number;
  planeSize: number;
};

export default function GrassField({
  terrainData,
  chunkSize,
  planeSize,
}: GrassFieldProps) {
  if (!terrainData) return null;

  return (
    <group position={[chunkSize / 2, 1, chunkSize / 2]}>
      {Array.from({ length: Math.ceil(planeSize / chunkSize) }, (_, i) =>
        Array.from({ length: Math.ceil(planeSize / chunkSize) }, (_, j) => (
          <GrassPlane
            key={`${i}-${j}`}
            terrainData={terrainData}
            offsetX={i * chunkSize}
            offsetZ={j * chunkSize}
            chunkSize={chunkSize}
            planeSize={planeSize}
          />
        ))
      )}
    </group>
  );
}
