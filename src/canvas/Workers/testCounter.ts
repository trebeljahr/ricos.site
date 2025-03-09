// master.ts
import { spawn, Thread, Worker } from "threads";
import { Counter } from "./counter";

export const useCounter = async () => {
  const counter = await spawn<Counter>(new Worker("./counter"));
  console.log(`Initial counter: ${await counter.getCount()}`);

  await counter.increment();
  console.log(`Updated counter: ${await counter.getCount()}`);

  await Thread.terminate(counter);
};
