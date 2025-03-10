import {
  generateInstanceDataFromWorker,
  getFractalNoiseFromWorker,
  getHeightFromWorker,
  poissonDiskSampleFromWorker,
} from "@r3f/Workers/noise/pool";
import { useEffect, useRef } from "react";
import { Vector3 } from "three";

async function workerNoiseSample() {
  const noise = await getFractalNoiseFromWorker(0, 0);
  return noise;
}

async function workerPoissonSample() {
  const positions = await poissonDiskSampleFromWorker(100, 5, 10, {
    tries: 30,
    offset: { x: 0, y: 0 },
  });
  return positions;
}

async function workerInstanceDataSample() {
  const instanceData = await generateInstanceDataFromWorker(
    new Vector3(0, 0, 0)
  );
  return instanceData;
}

async function workerGetHeightDataSample() {
  const height = await getHeightFromWorker(0, 0);
  return height;
}

export default function Page() {
  const workerRef = useRef<Worker>();

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../../canvas/workers/noiseWorker.ts", import.meta.url)
    );
    workerRef.current.onmessage = (event: MessageEvent<number>) => {};

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleClick = () => {
    workerRef.current?.postMessage({ x: Math.random(), y: Math.random() });
  };

  return (
    <div>
      <h1>Worker Demo</h1>
      <button onClick={handleClick}>Click me to do some computations!</button>
    </div>
  );
}
