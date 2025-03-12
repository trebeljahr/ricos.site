import { heightScale } from "./config";
import { getFractalNoise } from "src/lib/utils/noise";

export const getHeight = (x: number, z: number) => {
  const original = getFractalNoise(x, z);
  const remappedSample = (original + 1) / 2;
  const height = remappedSample * heightScale * 2 - heightScale / 2;
  return { height, remappedSample, original };
};
