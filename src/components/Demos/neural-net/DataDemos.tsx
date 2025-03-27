import { createCircleData } from "src/lib/math/datasets/circle";
import { Plot } from "./Plot";
import { createGaussData } from "src/lib/math/datasets/gauss";
import { createXorData } from "src/lib/math/datasets/xor";
import { createSpiralData } from "src/lib/math/datasets/spiral";

export const DataDemos = () => {
  return (
    <>
      <Plot data={createCircleData(1000)} />
      <Plot data={createGaussData(1000)} />
      <Plot data={createXorData(1000)} />
      <Plot data={createSpiralData(1000)} />
    </>
  );
};
