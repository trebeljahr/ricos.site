import { tileSize, tilesDistance } from "@r3f/ChunkGenerationSystem/config";
import type { ColorRepresentation } from "three";
import { OverheadLights } from "./OverheadLights";

export const LightsAndFog = ({
  skyColor,
}: {
  skyColor: ColorRepresentation;
}) => {
  return (
    <>
      <color attach="background" args={[skyColor]} />
      <ambientLight intensity={0.1} />
      <hemisphereLight intensity={0.1} />
      <fog attach="fog" args={[skyColor, 0, tileSize * (tilesDistance - 1)]} />
      <OverheadLights />
    </>
  );
};
