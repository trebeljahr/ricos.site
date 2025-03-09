import { tileSize } from "@r3f/ChunkGenerationSystem/config";

export const OverheadLights = () => {
  const intensity = 10;
  const height = 10;

  return (
    <>
      <directionalLight
        intensity={intensity}
        position={[-tileSize, height, -tileSize]}
        color={"#808080"}
        target-position={[0, 0, 0]}
        castShadow={false}
      />
      <directionalLight
        intensity={intensity}
        position={[tileSize, height, -tileSize]}
        color="#404040"
        target-position={[0, 0, 0]}
        castShadow={false}
      />
    </>
  );
};
