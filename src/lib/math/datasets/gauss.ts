import { normalRandom, Point } from "./utils";

function randomPoint(cx: number, cy: number) {
  let x = normalRandom(cx);
  let y = normalRandom(cy);
  return { x, y };
}

export function createGaussData(numSamples: number) {
  let datasets: [Point[], Point[]] = [[], []];

  for (let i = 0; i < numSamples / 2; i++) {
    datasets[0].push(randomPoint(2, 2));
    datasets[1].push(randomPoint(-2, -2));
  }

  return datasets;
}
