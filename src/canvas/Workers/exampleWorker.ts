import { generateInstanceData } from "./noise/genInstanceData";

addEventListener(
  "message",
  async (event: MessageEvent<{ x: number; z: number }>) => {
    const data = generateInstanceData({
      x: event.data.x,
      y: 0,
      z: event.data.z,
    });

    postMessage({ ...data, chunkKey: `${event.data.x},${event.data.z}` });
  }
);
