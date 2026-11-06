import { routingDemo } from "../../lib/computer/demoCircuits";
import { CircuitDemo } from "./CircuitDemo";

const decoder = () => routingDemo("decoder");
const mux = () => routingDemo("mux");
const memory = () => routingDemo("memory");

export function DecoderDemo() {
  return <CircuitDemo makeCircuit={decoder} label="Two-to-four decoder" showcase />;
}

export function MultiplexerDemo() {
  return <CircuitDemo makeCircuit={mux} label="Four-to-one multiplexer" showcase />;
}

export function MemoryAddressDemo() {
  return <CircuitDemo makeCircuit={memory} label="Sixteen addressed bits" showcase />;
}
