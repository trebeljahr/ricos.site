import { Point, randUniform } from "./utils";

export function createXorData(numSamples: number) {
  let datasets: [Point[], Point[]] = [[], []];
  for (let i = 0; i < numSamples; i++) {
    let x = randUniform(-5, 5);
    let padding = 0.3;
    x += x > 0 ? padding : -padding;
    let y = randUniform(-5, 5);
    y += y > 0 ? padding : -padding;
    const index = x * y >= 0 ? 0 : 1;
    datasets[index].push({ x, y });
  }

  return datasets;
}
