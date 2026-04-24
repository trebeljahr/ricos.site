import { getFractalNoise } from "src/lib/utils/noise";
import { heightScale } from "./config";

export const getHeight = (x: number, z: number) => {
  const original = getFractalNoise(x, z);
  const remappedSample = (original + 1) / 2;
  const height = remappedSample * heightScale * 2 - heightScale / 2;
  return { height, remappedSample, original };
};
