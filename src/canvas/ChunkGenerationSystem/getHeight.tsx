import { getFractalNoiseFromWorker } from "@r3f/Workers/noise/pool";
import { heightScale } from "./config";
import { getFractalNoise } from "src/lib/utils/noise";

export const getHeightFromWorker = async (x: number, z: number) => {
  const original = await getFractalNoiseFromWorker(x, z);
  const remappedSample = (original + 1) / 2;
  const height = remappedSample * heightScale * 2 - heightScale / 2;
  return { height, remappedSample, original };
};

export const getHeight = (x: number, z: number) => {
  const original = getFractalNoise(x, z);
  const remappedSample = (original + 1) / 2;
  const height = remappedSample * heightScale * 2 - heightScale / 2;
  return { height, remappedSample, original };
};
