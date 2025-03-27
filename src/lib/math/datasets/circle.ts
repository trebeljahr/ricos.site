import { Point, randUniform } from "./utils";

function randomPointAlongRadius(r: number) {
  let angle = randUniform(0, 2 * Math.PI);
  return { x: r * Math.sin(angle), y: r * Math.cos(angle) };
}

export function createCircleData(numSamples: number): [Point[], Point[]] {
  const radius = 5;
  const datasets: [Point[], Point[]] = [[], []];
  for (let i = 0; i < numSamples / 2; i++) {
    const innerRadius = randUniform(0, radius * 0.5);
    const outerRadius = randUniform(radius * 0.7, radius);
    datasets[0].push(randomPointAlongRadius(innerRadius));
    datasets[1].push(randomPointAlongRadius(outerRadius));
  }
  return datasets;
}
