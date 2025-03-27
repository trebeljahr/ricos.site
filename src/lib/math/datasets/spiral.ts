import { Point } from "chart.js";
import { randUniform } from "./utils";

function randomPoint(i: number, n: number, deltaT: number) {
  let r = (i / n) * 15;
  let t = ((1.75 * i) / n) * 2 * Math.PI + deltaT;
  return {
    x: r * Math.sin(t) + randUniform(-1, 1),
    y: r * Math.cos(t) + randUniform(-1, 1),
  };
}

export function createSpiralData(numSamples: number) {
  let datasets: [Point[], Point[]] = [[], []];
  let n = numSamples / 2;
  for (let i = 0; i < n; i++) {
    datasets[0].push(randomPoint(i, n, 0));
    datasets[1].push(randomPoint(i, n, Math.PI));
  }

  return datasets;
}
