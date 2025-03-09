import { Pool, spawn, Thread, Worker } from "threads";
import { NoiseWorker } from "./worker";
import { Vector3 } from "three";

const figureOutSizeOfThreadPool = () => {
  const numThreads = 4;
  return numThreads;
};

const createWorker = () => {
  // @ts-ignore-next-line
  const worker = new Worker(new URL("./worker.ts", import.meta.url));
  return worker;
};

// const worker = createWorker();

// const url = new URL("./worker.ts", import.meta.url);
// console.log(url);
// console.log(url.toString());
// console.log(import.meta.url);

// const stringified = url.toString();
// const pool = Pool(() => {
//   return spawn(new Worker(stringified));
// }, 8 /* optional size */);

// export const noiseWorkerPool = Pool(() => {
//   const worker = createWorker();
//   const threads = spawn<NoiseWorker>(worker);
//   return threads;
// }, 4);

export const getFractalNoiseFromWorker = async (x: number, z: number) => {
  const worker = createWorker();

  const noiseWorker = await spawn<NoiseWorker>(worker);
  const noise = await noiseWorker.getFractalNoise(x, z);

  await Thread.terminate(noiseWorker);

  return noise;
};

export const generateInstanceDataFromWorker = async (chunkOffset: Vector3) => {
  const worker = createWorker();

  const noiseWorker = await spawn<NoiseWorker>(worker);

  let { positions, rotations, scales } = await noiseWorker.generateInstanceData(
    chunkOffset
  );

  await Thread.terminate(noiseWorker);

  return { positions, rotations, scales };
};

export const getHeightFromWorker = async (x: number, z: number) => {
  const worker = createWorker();

  const noiseWorker = await spawn<NoiseWorker>(worker);
  const result = await noiseWorker.getHeight(x, z);

  await Thread.terminate(noiseWorker);

  return result;
};

export const poissonDiskSampleFromWorker = async (
  width: number,
  minDistance: number,
  maxDistance: number,
  options: {
    tries?: number;
    offset?: { x: number; y: number };
  }
) => {
  const worker = createWorker();

  const noiseWorker = await spawn<NoiseWorker>(worker);
  const positions = await noiseWorker.poissonDiskSample(
    width,
    minDistance,
    maxDistance,
    options
  );

  await Thread.terminate(noiseWorker);

  return positions;
};

export const temperatureNoiseFromWorker = async (x: number, z: number) => {
  const worker = createWorker();

  const noiseWorker = await spawn<NoiseWorker>(worker);
  const noise = noiseWorker.temperatureNoise(x, z);

  await Thread.terminate(noiseWorker);

  return noise;
};

export const moistureNoiseFromWorker = async (x: number, z: number) => {
  // @ts-ignore-next-line
  const worker = new Worker(new URL("./worker.ts", import.meta.url));
  const noiseWorker = await spawn<NoiseWorker>(worker);
  const noise = noiseWorker.moistureNoise(x, z);

  await Thread.terminate(noiseWorker);

  return noise;
};
