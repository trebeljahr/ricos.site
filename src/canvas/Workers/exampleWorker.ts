import { generateInstanceData } from "./noise/generateInstanceData";

addEventListener(
  "message",
  async (event: MessageEvent<{ x: number; z: number }>) => {
    console.log(event);

    const data = generateInstanceData({
      x: event.data.x,
      y: 0,
      z: event.data.z,
    });

    postMessage(data);
  }
);
