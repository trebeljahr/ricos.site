// Runs a circuit's gate netlist off the main thread; see netlistRunner.ts.
import { createNetlistRunner, type NetlistRequest } from "./netlistRunner";

const handle = createNetlistRunner();
self.onmessage = (event: MessageEvent<NetlistRequest>) => {
  self.postMessage(handle(event.data));
};
